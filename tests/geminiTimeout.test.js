import { describe, expect, it } from 'vitest';
import { createGeminiDeadline, DEFAULT_GEMINI_TIMEOUT_MS, MAX_GEMINI_EXAM_TIMEOUT_MS, MAX_GEMINI_TIMEOUT_MS, MIN_GEMINI_TIMEOUT_MS, getGeminiAbortResponse, isGeminiRequestAborted, raceWithGeminiAbort, resolveGeminiTimeoutMs } from '../supabase/functions/gemini-tutor/geminiTimeout.ts';

describe('Gemini request timeout handling', () => {
  it('uses a 110-second default and accepts a valid server-side override', () => {
    expect(DEFAULT_GEMINI_TIMEOUT_MS).toBe(110_000);
    expect(resolveGeminiTimeoutMs()).toBe(110_000);
    expect(resolveGeminiTimeoutMs('65000')).toBe(65_000);
  });

  it('keeps configured values within the safe range', () => {
    expect(resolveGeminiTimeoutMs('200000')).toBe(MAX_GEMINI_TIMEOUT_MS);
    expect(resolveGeminiTimeoutMs('4000')).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
    expect(resolveGeminiTimeoutMs('not-a-number')).toBe(DEFAULT_GEMINI_TIMEOUT_MS);
    expect(MIN_GEMINI_TIMEOUT_MS).toBe(5_000);
    expect(MAX_GEMINI_EXAM_TIMEOUT_MS).toBe(10_000);
  });

  it('recognizes timeout and abort errors without misclassifying other failures', () => {
    expect(isGeminiRequestAborted(new DOMException('expired', 'TimeoutError'))).toBe(true);
    expect(isGeminiRequestAborted(new DOMException('cancelled', 'AbortError'))).toBe(true);
    expect(isGeminiRequestAborted(new TypeError('network failure'))).toBe(false);
  });

  it('returns a clear safe response for timeout and abort errors', () => {
    expect(getGeminiAbortResponse(new DOMException('expired', 'TimeoutError'), 110_000)).toEqual({
      status: 504,
      body: { error: 'Gemini did not respond within 110 seconds. Try a smaller question set or retry later.', code: 'GEMINI_UPSTREAM_TIMEOUT' },
    });
    expect(getGeminiAbortResponse(new DOMException('cancelled', 'AbortError'), 110_000)?.body.code).toBe('GEMINI_UPSTREAM_ABORTED');
    expect(getGeminiAbortResponse(new Error('other failure'), 110_000)).toBeNull();
  });

  it('aborts and stops awaiting an operation that never resolves at the deadline', async () => {
    const deadline = createGeminiDeadline(15);
    try {
      await expect(raceWithGeminiAbort(new Promise(() => {}), deadline.signal))
        .rejects.toMatchObject({ name: 'TimeoutError' });
      expect(deadline.signal.aborted).toBe(true);
    } finally {
      deadline.dispose();
    }
  });
});
