import { safeFetch, isNetworkTimeoutError } from '../lib/networkUtils';

describe('networkUtils - timeout and error handling', () => {
  it('identifies ETIMEDOUT and network timeout errors', () => {
    const etimedoutErr = { code: 'ETIMEDOUT', message: 'connection timed out, read', errno: -60 };
    expect(isNetworkTimeoutError(etimedoutErr)).toBe(true);

    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    expect(isNetworkTimeoutError(abortErr)).toBe(true);

    const refErr = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' };
    expect(isNetworkTimeoutError(refErr)).toBe(true);

    expect(isNetworkTimeoutError(new Error('Invalid credentials'))).toBe(false);
  });

  it('safeFetch handles successful fetch responses', async () => {
    const mockResponse = new Response(JSON.stringify({ status: 'UP' }), { status: 200 });
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const { response, error } = await safeFetch('https://example.com/api', { timeoutMs: 1000 });

    expect(error).toBeNull();
    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);

    global.fetch = originalFetch;
  });

  it('safeFetch catches ETIMEDOUT / network errors gracefully without crashing', async () => {
    const etimedoutErr = new Error('connect ETIMEDOUT 64:ff9b::c8ea:2539:443');
    (etimedoutErr as any).code = 'ETIMEDOUT';
    (etimedoutErr as any).errno = -60;

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(etimedoutErr);

    const { response, error } = await safeFetch('https://api.foodie.kwiko.org/api/v1/test', { timeoutMs: 100 });

    expect(response).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain('ETIMEDOUT');

    global.fetch = originalFetch;
  });
});
