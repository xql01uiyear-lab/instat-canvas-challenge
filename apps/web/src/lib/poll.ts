/**
 * Cancellable polling used for generation status. One implementation covers
 * "read, wait, read again until done"; the specifics are passed in. Cancellation
 * is cooperative via `signal`: an abort stops the loop before the next read and
 * rejects with AbortError, which the calling effect ignores.
 */
export function retryAfterMs(res: Response, fallback: number): number {
  const header = res.headers.get('Retry-After');
  if (header === null) return fallback;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : fallback;
}

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export type PollOptions<T> = {
  readonly fetchOnce: (signal: AbortSignal) => Promise<T>;
  readonly isDone: (value: T) => boolean;
  readonly intervalMs: number;
  readonly signal: AbortSignal;
  readonly initial?: T;
};

export async function poll<T>(options: PollOptions<T>): Promise<T> {
  let value = options.initial ?? (await options.fetchOnce(options.signal));
  while (!options.isDone(value)) {
    await delay(options.intervalMs, options.signal);
    value = await options.fetchOnce(options.signal);
  }
  return value;
}
