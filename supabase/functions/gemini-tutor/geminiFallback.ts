import { buildGeminiGenerateContentUrl, normalizeGeminiModelName } from "./geminiModel.ts";

export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.6-flash";
export const GEMINI_FALLBACK_RETRY_BASE_MS = 250;
export const GEMINI_FALLBACK_RETRY_MAX_JITTER_MS = 250;

export interface GeminiModelPair {
  primaryModel: string;
  fallbackModel: string | null;
}

export function resolveGeminiModelPair(
  configuredPrimary?: string | null,
  configuredFallback?: string | null,
): GeminiModelPair {
  const primaryModel = normalizeGeminiModelName(configuredPrimary);
  const fallbackModel = normalizeGeminiModelName(configuredFallback || DEFAULT_GEMINI_FALLBACK_MODEL);

  return {
    primaryModel,
    // Avoid making a duplicate request if the two server settings accidentally match.
    fallbackModel: fallbackModel === primaryModel ? null : fallbackModel,
  };
}

export interface GeminiFetchResult {
  response: Response;
  model: string;
  fallbackAttempted: boolean;
  primaryErrorPayload?: unknown;
  attempts: Array<{ model: string; status: number; retryScheduled: boolean }>;
}

export interface GeminiAttemptDiagnostic {
  model: string;
  status: number;
  retryScheduled: boolean;
}

/**
 * Make one primary request and, only for a primary HTTP 503, switch to the
 * fallback model. Retry that fallback once after a further HTTP 503. The
 * caller supplies one shared AbortSignal so the timeout is an overall budget
 * for all attempts rather than a per-attempt timeout.
 */
export async function fetchGeminiWithFallback(
  fetcher: typeof fetch,
  primaryModel: string,
  fallbackModel: string | null,
  init: RequestInit,
  options: {
    wait?: (delayMs: number, signal?: AbortSignal | null) => Promise<void>;
    random?: () => number;
    onAttempt?: (attempt: GeminiAttemptDiagnostic, attemptNumber: number) => void;
  } = {},
): Promise<GeminiFetchResult> {
  const attempts: GeminiFetchResult["attempts"] = [];
  throwIfAborted(init.signal);
  const primaryResponse = await fetcher(buildGeminiGenerateContentUrl(primaryModel), init);
  throwIfAborted(init.signal);
  attempts.push({ model: primaryModel, status: primaryResponse.status, retryScheduled: primaryResponse.status === 503 && Boolean(fallbackModel) });
  options.onAttempt?.(attempts[0], 1);
  if (primaryResponse.status !== 503 || !fallbackModel) {
    return { response: primaryResponse, model: primaryModel, fallbackAttempted: false, attempts };
  }

  // Read the provider error only for safe in-memory classification by the caller.
  // It must never be logged or returned directly.
  let primaryErrorPayload: unknown = null;
  try {
    primaryErrorPayload = await primaryResponse.json();
  } catch {
    // An unreadable error body should not prevent the single fallback try.
  }

  throwIfAborted(init.signal);
  let fallbackResponse = await fetcher(buildGeminiGenerateContentUrl(fallbackModel), init);
  throwIfAborted(init.signal);
  attempts.push({ model: fallbackModel, status: fallbackResponse.status, retryScheduled: fallbackResponse.status === 503 });
  options.onAttempt?.(attempts[1], 2);

  if (fallbackResponse.status === 503) {
    try {
      await fallbackResponse.body?.cancel();
    } catch {
      // A body cancellation failure should not prevent the one bounded retry.
    }
    const jitter = Math.floor((options.random || Math.random)() * GEMINI_FALLBACK_RETRY_MAX_JITTER_MS);
    const delayMs = GEMINI_FALLBACK_RETRY_BASE_MS + jitter;
    await (options.wait || waitWithAbort)(delayMs, init.signal);
    throwIfAborted(init.signal);
    fallbackResponse = await fetcher(buildGeminiGenerateContentUrl(fallbackModel), init);
    throwIfAborted(init.signal);
    attempts.push({ model: fallbackModel, status: fallbackResponse.status, retryScheduled: false });
    options.onAttempt?.(attempts[2], 3);
  }

  return { response: fallbackResponse, model: fallbackModel, fallbackAttempted: true, primaryErrorPayload, attempts };
}

function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    throw signal.reason || new DOMException("The request was aborted.", "AbortError");
  }
}

function waitWithAbort(delayMs: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason || new DOMException("The request was aborted.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
