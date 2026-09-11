import { request } from './http';
import { ApiError } from './errors';
import type { GenerationData, GenerationRequest, GraphData, SpaceData } from '@canvas/contracts';

export type ConfigData = {
  readonly debounceMs: number;
  readonly pollIntervalMs: number;
  readonly generationDelayMs: number;
  readonly maxNodes: number;
  readonly maxEdges: number;
  readonly nodeTypes: readonly string[];
};

export type GraphWithETag = { readonly graph: GraphData; readonly etag: string };

function requireETag(res: Response): string {
  const etag = res.headers.get('ETag');
  if (!etag) throw new ApiError({ kind: 'parse', message: 'Сервер не вернул ETag графа.' });
  return etag;
}

/**
 * Typed endpoint catalogue. Adding an endpoint means declaring its path, method
 * and types here — transport, error handling and parsing come from
 * {@link request}. The graph endpoints surface the ETag explicitly because
 * optimistic concurrency is part of their contract.
 */
export const api = {
  config: {
    get: (signal?: AbortSignal) =>
      request<ConfigData>('/api/config', { signal }).then((r) => r.data),
  },
  spaces: {
    list: (signal?: AbortSignal) =>
      request<SpaceData[]>('/api/spaces', { signal }).then((r) => r.data),
    create: (title: string, signal?: AbortSignal) =>
      request<SpaceData>('/api/spaces', { method: 'POST', body: { title }, signal }).then(
        (r) => r.data,
      ),
    get: (spaceId: string, signal?: AbortSignal) =>
      request<SpaceData>(`/api/spaces/${spaceId}`, { signal }).then((r) => r.data),
  },
  graph: {
    get: (spaceId: string, signal?: AbortSignal): Promise<GraphWithETag> =>
      request<GraphData>(`/api/spaces/${spaceId}/graph`, { signal }).then((r) => ({
        graph: r.data,
        etag: requireETag(r.res),
      })),
    /** Save the exact serialized bytes we diffed; `If-Match` guards the version. */
    save: (
      spaceId: string,
      raw: string,
      etag: string,
      signal?: AbortSignal,
    ): Promise<GraphWithETag> =>
      request<GraphData>(`/api/spaces/${spaceId}/graph`, {
        method: 'PUT',
        rawBody: raw,
        headers: { 'If-Match': etag },
        signal,
      }).then((r) => ({ graph: r.data, etag: requireETag(r.res) })),
  },
  generations: {
    list: (spaceId: string, signal?: AbortSignal) =>
      request<GenerationData[]>(`/api/spaces/${spaceId}/generations`, { signal }).then(
        (r) => r.data,
      ),
    /** Returns the full response so the caller can read `Retry-After`. */
    create: (
      spaceId: string,
      body: GenerationRequest,
      idempotencyKey: string,
      signal?: AbortSignal,
    ) =>
      request<GenerationData>(`/api/spaces/${spaceId}/generations`, {
        method: 'POST',
        body,
        idempotencyKey,
        signal,
      }),
    get: (spaceId: string, generationId: string, signal?: AbortSignal) =>
      request<GenerationData>(`/api/spaces/${spaceId}/generations/${generationId}`, {
        signal,
      }).then((r) => r.data),
  },
} as const;
