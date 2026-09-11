/**
 * Single normalized error shape for the whole app. Every failure — a dropped
 * connection, a non-2xx HTTP status, or an unreadable body — becomes one
 * discriminated union so components never inspect a raw `Response` or duplicate
 * `catch`/status handling. A generation that comes back `failed` on HTTP 200 is
 * NOT an error: it is domain data and flows through as a normal result.
 */
export type ApiErrorInfo =
  | { readonly kind: 'network'; readonly message: string }
  | {
      readonly kind: 'http';
      readonly status: number;
      readonly code: string;
      readonly message: string;
    }
  | { readonly kind: 'parse'; readonly message: string };

export class ApiError extends Error {
  constructor(readonly info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    return this.info.kind === 'http' ? this.info.code : undefined;
  }

  get status(): number | undefined {
    return this.info.kind === 'http' ? this.info.status : undefined;
  }

  get isNetwork(): boolean {
    return this.info.kind === 'network';
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ kind: 'network', message: 'Запрос отменён.' });
  }
  return new ApiError({
    kind: 'network',
    message: error instanceof Error ? error.message : 'Неизвестная ошибка.',
  });
}
