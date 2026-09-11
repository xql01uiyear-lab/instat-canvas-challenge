import { ApiError, asApiError } from '../../api/errors';

/**
 * Serializes graph saves for one space.
 *
 * - Debounce: a burst of edits collapses into one PUT 500 ms after the last one.
 * - Single-flight queue: never two PUTs of the same graph in parallel. Edits made
 *   while a save is in flight wait, then a follow-up save sends the newest state.
 * - ETag: each PUT sends `If-Match`; the response ETag becomes the next guard.
 * - Conflict (412): stops auto-saving, keeps the local draft, and surfaces a
 *   conflict the user resolves explicitly — no silent overwrite, no data loss.
 *
 * The controller is UI-agnostic: it reads the current graph via `getGraph`,
 * persists via `save`, and reports state via `onStatus`.
 */
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict';

type Waiter = { resolve: (etag: string) => void; reject: (error: ApiError) => void };

type SaveDeps = {
  readonly getGraph: () => string;
  readonly save: (raw: string, etag: string) => Promise<string>;
  readonly onStatus: (status: SaveStatus, error: ApiError | null) => void;
  readonly debounceMs: number;
};

export class SaveController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private conflicted = false;
  private disposed = false;
  private lastError: ApiError | null = null;
  private waiters: Waiter[] = [];

  constructor(
    private etag: string,
    private lastSavedRaw: string,
    private readonly deps: SaveDeps,
  ) {}

  getEtag(): string {
    return this.etag;
  }

  /** Called after any local edit. Debounces, then saves the newest graph. */
  schedule(): void {
    if (this.disposed || this.conflicted) return;
    this.deps.onStatus('pending', null);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.tick();
    }, this.deps.debounceMs);
  }

  /**
   * Save immediately (used before generation): resolves with the ETag of the
   * saved graph once the queue is drained, or rejects on conflict/error.
   */
  flush(): Promise<string> {
    if (this.conflicted) {
      return Promise.reject(this.lastError ?? this.conflictError());
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.saving && this.deps.getGraph() === this.lastSavedRaw) {
      return Promise.resolve(this.etag);
    }
    return new Promise<string>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      void this.tick();
    });
  }

  /** Retry after a transient (non-conflict) save error. */
  retry(): void {
    if (this.conflicted) return;
    void this.tick();
  }

  /** Apply a re-read server graph, clearing the conflict. */
  resolveConflict(etag: string, raw: string): void {
    this.conflicted = false;
    this.lastError = null;
    this.etag = etag;
    this.lastSavedRaw = raw;
    this.deps.onStatus('saved', null);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.rejectWaiters(new ApiError({ kind: 'network', message: 'Редактор закрыт.' }));
  }

  private conflictError(): ApiError {
    return new ApiError({
      kind: 'http',
      status: 412,
      code: 'GRAPH_VERSION_CONFLICT',
      message: 'Версия графа на сервере отличается.',
    });
  }

  private resolveWaiters(): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) waiter.resolve(this.etag);
  }

  private rejectWaiters(error: ApiError): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) waiter.reject(error);
  }

  private async tick(): Promise<void> {
    if (this.disposed || this.conflicted || this.saving) return;
    const raw = this.deps.getGraph();
    if (raw === this.lastSavedRaw) {
      this.deps.onStatus('saved', null);
      this.resolveWaiters();
      return;
    }
    await this.doSave(raw);
  }

  private async doSave(raw: string): Promise<void> {
    this.saving = true;
    this.deps.onStatus('saving', null);
    try {
      const nextEtag = await this.deps.save(raw, this.etag);
      this.saving = false;
      if (this.disposed) return;
      this.etag = nextEtag;
      this.lastSavedRaw = raw;
      // Newer edits may have arrived during the PUT: save the latest, in order.
      const current = this.deps.getGraph();
      if (current !== raw && !this.conflicted) {
        await this.doSave(current);
        return;
      }
      this.deps.onStatus('saved', null);
      this.resolveWaiters();
    } catch (caught) {
      this.saving = false;
      if (this.disposed) return;
      const error = asApiError(caught);
      this.lastError = error;
      if (error.status === 412) {
        this.conflicted = true;
        this.deps.onStatus('conflict', error);
      } else {
        this.deps.onStatus('error', error);
      }
      this.rejectWaiters(error);
    }
  }
}
