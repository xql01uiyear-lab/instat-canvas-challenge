import { ApiError, asApiError } from './errors';

/**
 * The one place that talks to the network. Base URL, headers, JSON
 * serialization, status checks, empty-body handling and error normalization live
 * here and nowhere else. Callers get typed `data` plus the raw `Response` for the
 * headers that matter (ETag on the graph, Retry-After / Location on generations).
 */
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4001').replace(/\/+$/, '');

type Method = 'GET' | 'POST' | 'PUT';

/** Absolute URL for a server asset (e.g. a generated image path). */
export function apiAssetUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export type RequestOptions = {
  readonly method?: Method;
  readonly body?: unknown;
  /** Pre-serialized JSON string sent verbatim (used for the graph save so the
   * bytes we diffed are exactly the bytes stored). Takes precedence over `body`. */
  readonly rawBody?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
};

export type ApiResponse<T> = { readonly data: T; readonly res: Response };

const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Некорректный запрос.',
  404: 'Ресурс не найден.',
  409: 'Данные изменились. Обновите и повторите.',
  412: 'Версия графа на сервере отличается.',
  413: 'Слишком большой запрос.',
  415: 'Неподдерживаемый формат запроса.',
  422: 'Запрос не может быть обработан.',
  428: 'Требуется условие If-Match.',
  500: 'Сервис временно недоступен.',
};

async function toHttpError(res: Response): Promise<ApiError> {
  let code = `HTTP_${res.status}`;
  let message = DEFAULT_MESSAGES[res.status] ?? 'Ошибка запроса.';
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    /* non-JSON error body — keep status-based defaults */
  }
  return new ApiError({ kind: 'http', status: res.status, code, message });
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body, rawBody, headers, idempotencyKey, signal } = opts;
  const payload =
    rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined;
  const requestHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  if (payload !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (idempotencyKey) requestHeaders['Idempotency-Key'] = idempotencyKey;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: payload,
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    throw asApiError(error);
  }

  if (!res.ok) throw await toHttpError(res);
  if (res.status === 204 || res.status === 304 || res.headers.get('Content-Length') === '0') {
    return { data: undefined as T, res };
  }
  try {
    return { data: (await res.json()) as T, res };
  } catch {
    throw new ApiError({ kind: 'parse', message: 'Не удалось разобрать ответ сервера.' });
  }
}
