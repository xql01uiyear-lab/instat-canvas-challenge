import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GenerationData, GenerationRequest } from '@canvas/contracts';
import { api } from '../../api/endpoints';
import { asApiError } from '../../api/errors';
import { newIdempotencyKey } from '../../lib/idempotency';
import { poll } from '../../lib/poll';

export type Scenario = GenerationRequest['scenario'];

/** Runtime view of one generator node's latest generation. Never persisted. */
export type GenerationView = {
  readonly generatorNodeId: string;
  readonly generationId: string | null;
  readonly resultNodeId: string | null;
  readonly status: 'processing' | 'succeeded' | 'failed' | 'error';
  readonly imageUrl?: string;
  readonly message?: string;
};

type Deps = {
  readonly spaceId: string;
  readonly pollIntervalMs: number;
  /** Save any pending edits and resolve with the saved graph ETag. */
  readonly flush: () => Promise<string>;
  readonly resultNodeOf: (generatorNodeId: string) => string | null;
  readonly nodeExists: (nodeId: string) => boolean;
};

const isTerminal = (g: GenerationData) => g.status !== 'processing';

function viewFromData(data: GenerationData): GenerationView {
  return {
    generatorNodeId: data.nodeId,
    generationId: data.id,
    resultNodeId: data.resultNodeId,
    status: data.status,
    ...(data.imageUrl ? { imageUrl: data.imageUrl } : {}),
    ...(data.status === 'failed' ? { message: 'Генерация не удалась (SIMULATED_FAILURE).' } : {}),
  };
}

export function useGenerations(deps: Deps) {
  const { spaceId, pollIntervalMs, flush, resultNodeOf, nodeExists } = deps;
  const [byGenerator, setByGenerator] = useState<ReadonlyMap<string, GenerationView>>(
    () => new Map(),
  );
  const stateRef = useRef(byGenerator);
  stateRef.current = byGenerator;

  // Idempotency key per generator (reused only for a network retry of the POST).
  const keys = useRef(new Map<string, string>());
  const polls = useRef(new Map<string, AbortController>());
  const starting = useRef(new Set<string>());

  const setEntry = useCallback((id: string, view: GenerationView) => {
    setByGenerator((prev) => new Map(prev).set(id, view));
  }, []);

  const stopPoll = useCallback((generatorNodeId: string) => {
    polls.current.get(generatorNodeId)?.abort();
    polls.current.delete(generatorNodeId);
  }, []);

  const startPoll = useCallback(
    (generatorNodeId: string, generationId: string, initial?: GenerationData) => {
      stopPoll(generatorNodeId);
      const controller = new AbortController();
      polls.current.set(generatorNodeId, controller);
      poll({
        fetchOnce: (signal) => api.generations.get(spaceId, generationId, signal),
        isDone: isTerminal,
        intervalMs: pollIntervalMs,
        signal: controller.signal,
        ...(initial ? { initial } : {}),
      }).then(
        (final) => {
          if (controller.signal.aborted) return;
          // Ignore a result that a newer generation for this node has superseded,
          // or whose result node no longer exists.
          const current = stateRef.current.get(generatorNodeId);
          if (current?.generationId !== generationId) return;
          if (!nodeExists(final.resultNodeId)) {
            setEntry(generatorNodeId, { ...viewFromData(final), imageUrl: undefined });
            return;
          }
          setEntry(generatorNodeId, viewFromData(final));
        },
        (error) => {
          if (controller.signal.aborted) return;
          const current = stateRef.current.get(generatorNodeId);
          if (current?.generationId !== generationId) return;
          setEntry(generatorNodeId, {
            generatorNodeId,
            generationId,
            resultNodeId: current?.resultNodeId ?? null,
            status: 'error',
            message: asApiError(error).message,
          });
        },
      );
    },
    [spaceId, pollIntervalMs, nodeExists, setEntry, stopPoll],
  );

  const generate = useCallback(
    async (generatorNodeId: string, scenario: Scenario, reuseKey = false) => {
      if (starting.current.has(generatorNodeId)) return;
      starting.current.add(generatorNodeId);
      const resultNodeId = resultNodeOf(generatorNodeId);
      setEntry(generatorNodeId, {
        generatorNodeId,
        generationId: stateRef.current.get(generatorNodeId)?.generationId ?? null,
        resultNodeId,
        status: 'processing',
      });
      try {
        let etag: string;
        try {
          etag = await flush();
        } catch (caught) {
          setEntry(generatorNodeId, {
            generatorNodeId,
            generationId: null,
            resultNodeId,
            status: 'error',
            message: asApiError(caught).message,
          });
          return;
        }

        const key =
          reuseKey && keys.current.has(generatorNodeId)
            ? keys.current.get(generatorNodeId)!
            : newIdempotencyKey();
        keys.current.set(generatorNodeId, key);

        stopPoll(generatorNodeId);
        try {
          const { data } = await api.generations.create(
            spaceId,
            { nodeId: generatorNodeId, graphETag: etag, scenario },
            key,
          );
          setEntry(generatorNodeId, viewFromData(data));
          if (data.status === 'processing') startPoll(generatorNodeId, data.id, data);
        } catch (caught) {
          const error = asApiError(caught);
          if (error.code === 'GENERATION_IN_PROGRESS') {
            await adopt(generatorNodeId);
            return;
          }
          setEntry(generatorNodeId, {
            generatorNodeId,
            generationId: null,
            resultNodeId,
            status: 'error',
            message: error.message,
          });
        }
      } finally {
        starting.current.delete(generatorNodeId);
      }
      // adopt is stable; declared below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [spaceId, flush, resultNodeOf, setEntry, startPoll, stopPoll],
  );

  /** Adopt the latest server-side generation for a node (in-progress reconciliation). */
  const adopt = useCallback(
    async (generatorNodeId: string) => {
      const list = await api.generations.list(spaceId);
      const latest = list.find((g) => g.nodeId === generatorNodeId);
      if (!latest) return;
      setEntry(generatorNodeId, viewFromData(latest));
      if (latest.status === 'processing') startPoll(generatorNodeId, latest.id, latest);
    },
    [spaceId, setEntry, startPoll],
  );

  const retry = useCallback(
    (generatorNodeId: string, scenario: Scenario) => {
      const current = stateRef.current.get(generatorNodeId);
      // A lost POST leaves us with no generationId: reuse the key (idempotent replay).
      const reuseKey = current?.status === 'error' && current.generationId === null;
      void generate(generatorNodeId, scenario, reuseKey);
    },
    [generate],
  );

  /** Cancel and forget a generator's generation (e.g. when the node is deleted). */
  const cancel = useCallback((generatorNodeId: string) => {
    polls.current.get(generatorNodeId)?.abort();
    polls.current.delete(generatorNodeId);
    keys.current.delete(generatorNodeId);
    setByGenerator((prev) => {
      if (!prev.has(generatorNodeId)) return prev;
      const next = new Map(prev);
      next.delete(generatorNodeId);
      return next;
    });
  }, []);

  /** Restore runtime state from the server generation list after a reload. */
  const restore = useCallback(
    (list: readonly GenerationData[]) => {
      const next = new Map<string, GenerationView>();
      // The list is newest-first: the first entry per node is the latest.
      for (const generation of list) {
        if (next.has(generation.nodeId)) continue;
        next.set(generation.nodeId, viewFromData(generation));
      }
      setByGenerator(next);
      for (const [generatorNodeId, view] of next) {
        if (view.status === 'processing' && view.generationId) {
          startPoll(generatorNodeId, view.generationId);
        }
      }
    },
    [startPoll],
  );

  useEffect(() => {
    const controllers = polls.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  // resultNodeId -> latest view, for Result nodes to look up their image.
  const byResult = useMemo(() => {
    const map = new Map<string, GenerationView>();
    for (const view of byGenerator.values()) {
      if (view.resultNodeId) map.set(view.resultNodeId, view);
    }
    return map;
  }, [byGenerator]);

  return { byGenerator, byResult, generate, retry, cancel, restore };
}
