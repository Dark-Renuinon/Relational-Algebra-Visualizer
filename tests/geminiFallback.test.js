import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GEMINI_FALLBACK_MODEL, fetchGeminiWithFallback, resolveGeminiModelPair } from '../supabase/functions/gemini-tutor/geminiFallback.ts';

const primaryUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

describe('Gemini one-shot fallback', () => {
  it('defaults to a documented stable fallback and allows server configuration', () => {
    expect(DEFAULT_GEMINI_FALLBACK_MODEL).toBe('gemini-3.6-flash');
    expect(resolveGeminiModelPair()).toEqual({ primaryModel: 'gemini-3.8-flash', fallbackModel: 'gemini-3.6-flash' });
    expect(resolveGeminiModelPair('models/gemini-3.8-flash', 'gemini-3.5-flash-lite')).toEqual({
      primaryModel: 'gemini-3.8-flash', fallbackModel: 'gemini-3.5-flash-lite',
    });
  });

  it('returns a successful primary response without requesting the fallback', async () => {
    const primaryResponse = new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'primary result' }] } }] }), { status: 200 });
    const fetcher = vi.fn().mockResolvedValue(primaryResponse);

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST' });

    expect(result).toMatchObject({ response: primaryResponse, model: 'gemini-3.8-flash', fallbackAttempted: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(primaryUrl, { method: 'POST' });
  });

  it('tries the fallback once after a primary 503 and returns its success', async () => {
    const signal = new AbortController().signal;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { status: 'UNAVAILABLE' } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 }));

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST', signal });

    expect(result).toMatchObject({ model: 'gemini-3.6-flash', fallbackAttempted: true, response: { status: 200 } });
    expect(result.primaryErrorPayload).toEqual({ error: { status: 'UNAVAILABLE' } });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([primaryUrl, fallbackUrl]);
    expect(fetcher.mock.calls.every(([, init]) => init.signal === signal)).toBe(true);
  });

  it('stops after the primary, fallback, and one bounded fallback retry return 503', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('primary unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('fallback unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('fallback retry unavailable', { status: 503 }));

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST' }, { wait: async () => {} });

    expect(result).toMatchObject({ model: 'gemini-3.6-flash', fallbackAttempted: true, response: { status: 503 } });
    expect(result.attempts.map(({ model, status }) => [model, status])).toEqual([
      ['gemini-3.8-flash', 503], ['gemini-3.6-flash', 503], ['gemini-3.6-flash', 503],
    ]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('recovers when the single fallback retry succeeds', async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('primary unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('fallback busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('fallback success', { status: 200 }));

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST' }, {
      wait,
      random: () => 0,
    });

    expect(result).toMatchObject({ model: 'gemini-3.6-flash', fallbackAttempted: true, response: { status: 200 } });
    expect(wait).toHaveBeenCalledWith(250, undefined);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not retry a fallback rate-limit or quota response', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('primary unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('fallback rate limited', { status: 429 }));

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST' });

    expect(result.response.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 429])('does not fallback for non-retryable HTTP %i', async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response('provider error', { status }));

    const result = await fetchGeminiWithFallback(fetcher, 'gemini-3.8-flash', 'gemini-3.6-flash', { method: 'POST' }, { wait: async () => {} });

    expect(result).toMatchObject({ model: 'gemini-3.8-flash', fallbackAttempted: false, response: { status } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not make a duplicate request if both configured models match', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    const pair = resolveGeminiModelPair('gemini-3.8-flash', 'models/gemini-3.8-flash');

    const result = await fetchGeminiWithFallback(fetcher, pair.primaryModel, pair.fallbackModel, { method: 'POST' }, { wait: async () => {} });

    expect(pair.fallbackModel).toBeNull();
    expect(result.fallbackAttempted).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not start a fallback request if the shared deadline aborts during the primary request', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort(new DOMException('deadline', 'TimeoutError'));
      return new Response('unavailable', { status: 503 });
    });

    await expect(fetchGeminiWithFallback(
      fetcher,
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      { method: 'POST', signal: controller.signal },
    )).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
