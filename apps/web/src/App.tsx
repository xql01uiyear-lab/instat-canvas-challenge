import { useEffect, useState } from 'react';
import type { GenerationData, SpaceData } from '@canvas/contracts';
import { api, type ConfigData, type GraphWithETag } from './api/endpoints';
import { ApiError, asApiError } from './api/errors';
import { getSpaceId, setSpaceId } from './lib/persist';
import { CanvasEditor } from './features/graph/CanvasEditor';

type Ready = {
  readonly space: SpaceData;
  readonly config: ConfigData;
  readonly graph: GraphWithETag;
  readonly generations: readonly GenerationData[];
};

async function bootstrap(signal: AbortSignal): Promise<Ready> {
  const config = await api.config.get(signal);

  let space: SpaceData | null = null;
  const savedId = getSpaceId();
  if (savedId) {
    try {
      space = await api.spaces.get(savedId, signal);
    } catch (caught) {
      // A missing space (server reset) just means we open a fresh one.
      if (!(caught instanceof ApiError) || caught.status !== 404) throw caught;
    }
  }
  if (!space) {
    space = await api.spaces.create('Мой канвас', signal);
    setSpaceId(space.id);
  }

  const [graph, generations] = await Promise.all([
    api.graph.get(space.id, signal),
    api.generations.list(space.id, signal),
  ]);
  return { space, config, graph, generations };
}

export function App() {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; data: Ready } | { status: 'error'; error: ApiError }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    bootstrap(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      },
      (error) => {
        if (!controller.signal.aborted) setState({ status: 'error', error: asApiError(error) });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  if (state.status === 'loading') {
    return (
      <main className="screen screen--center">
        <div className="spinner">
          <span className="spinner__dot" aria-hidden="true" /> Открываем пространство…
        </div>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="screen screen--center">
        <div className="banner banner--error" role="alert">
          {state.error.message}
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAttempt((n) => n + 1)}>
          Повторить
        </button>
      </main>
    );
  }

  const { data } = state;
  // Remount the editor if the space changes so all runtime state resets cleanly.
  return (
    <CanvasEditor
      key={data.space.id}
      spaceId={data.space.id}
      config={data.config}
      initial={data.graph}
      initialGenerations={data.generations}
    />
  );
}
