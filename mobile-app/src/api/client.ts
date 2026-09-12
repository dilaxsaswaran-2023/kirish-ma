import {Platform} from 'react-native';

/**
 * Thin transport for the AgroThulir API. The backend authenticates demo calls
 * with X-User-Id / X-Corporation-Id / X-Role headers (TenantContextInterceptor),
 * so identity lives here and is swapped by the session store at sign-in.
 */

/** Android emulators reach the host machine's localhost through 10.0.2.2. */
export const DEFAULT_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080';

export type Identity = {userId: string; corporationId: string; role: string};

export const DEMO_IDENTITY: Identity = {
  userId: 'user-anjali',
  corporationId: 'corp-greenroot',
  role: 'OPERATOR',
};

let baseUrl = DEFAULT_BASE_URL;
let identity: Identity = DEMO_IDENTITY;

export function getBaseUrl() {
  return baseUrl;
}

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
}

export function getIdentity() {
  return identity;
}

export function setIdentity(next: Identity) {
  identity = next;
}

/** Error carrying the backend's machine-readable code (ApiExceptionHandler). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: string[];

  constructor(status: number, code: string, message: string, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the phone could not reach the service at all. */
  get isTransport() {
    return this.code === 'NETWORK_UNREACHABLE';
  }
}

const TIMEOUT_MS = 12000;

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': identity.userId,
        'X-Corporation-Id': identity.corporationId,
        'X-Role': identity.role,
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (cause) {
    const reason = options.signal?.aborted ? 'The request was cancelled.' : `No reply from ${baseUrl}.`;
    throw new ApiError(0, 'NETWORK_UNREACHABLE', reason, [String(cause)]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const body = (payload ?? {}) as {code?: string; message?: string; details?: string[]};
    throw new ApiError(
      response.status,
      body.code ?? `HTTP_${response.status}`,
      body.message ?? `The service replied with ${response.status}.`,
      body.details,
    );
  }

  return payload as T;
}

/** Idempotency keys are mandatory on control writes (ApiController). */
export function idempotencyKey(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}
