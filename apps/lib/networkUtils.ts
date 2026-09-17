export type SafeFetchOptions = RequestInit & {
  timeoutMs?: number;
};

/**
 * Checks if an error is a network connection or socket read timeout error (ETIMEDOUT, ECONNREFUSED, AbortError, etc.).
 */
export function isNetworkTimeoutError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = String(err.code || '');
    const message = String(err.message || '');
    const name = String(err.name || '');

    if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET') {
      return true;
    }
    if (name === 'AbortError' || name === 'TimeoutError') {
      return true;
    }
    if (message.includes('ETIMEDOUT') || message.includes('timed out') || message.includes('fetch failed')) {
      return true;
    }
  }
  return false;
}

/**
 * Executes a fetch request with an explicit AbortSignal timeout and robust error catching.
 * Defaults to 3,000ms (3 seconds) timeout to avoid hanging indefinitely on socket reads.
 */
export async function safeFetch(
  url: string | URL,
  options: SafeFetchOptions = {},
): Promise<{ response: Response | null; error: Error | null }> {
  const { timeoutMs = 3000, ...fetchInit } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If signal already exists, combine abort signals
  let signal = controller.signal;
  if (fetchInit.signal) {
    const externalSignal = fetchInit.signal;
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort());
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchInit,
      signal,
    });
    return { response, error: null };
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    return { response: null, error: errorObj };
  } finally {
    clearTimeout(timeoutId);
  }
}
