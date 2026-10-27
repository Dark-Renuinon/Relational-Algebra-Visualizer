export const DEFAULT_GEMINI_TIMEOUT_MS = 110_000;
export const MAX_GEMINI_TIMEOUT_MS = 120_000;
export const MIN_GEMINI_TIMEOUT_MS = 5_000;
export const MAX_GEMINI_EXAM_TIMEOUT_MS = 10_000;

export interface GeminiDeadline {
  signal: AbortSignal;
  dispose: () => void;
}

/** One controller/timer for the complete upstream attempt, including response parsing. */
export function createGeminiDeadline(timeoutMs: number): GeminiDeadline {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Gemini request deadline exceeded.", "TimeoutError"));
  }, timeoutMs);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

/** Stop awaiting promptly even if a fetch implementation does not honor abort correctly. */
export function raceWithGeminiAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason || new DOMException("The request was aborted.", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(signal.reason || new DOMException("The request was aborted.", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => { cleanup(); resolve(value); },
      (error) => { cleanup(); reject(error); },
    );
  });
}

export function resolveGeminiTimeoutMs(configuredTimeout?: string | null): number {
  if (!configuredTimeout?.trim()) return DEFAULT_GEMINI_TIMEOUT_MS;

  const parsed = Number(configuredTimeout);
  if (!Number.isFinite(parsed) || parsed < MIN_GEMINI_TIMEOUT_MS) {
    return DEFAULT_GEMINI_TIMEOUT_MS;
  }
  return Math.min(Math.floor(parsed), MAX_GEMINI_TIMEOUT_MS);
}

export function isGeminiRequestAborted(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export function getGeminiAbortResponse(error: unknown, timeoutMs: number): {
  status: 504;
  body: { error: string; code: "GEMINI_UPSTREAM_TIMEOUT" | "GEMINI_UPSTREAM_ABORTED" };
} | null {
  if (!isGeminiRequestAborted(error)) return null;
  if (error instanceof Error && error.name === "TimeoutError") {
    return {
      status: 504,
      body: {
        error: `Gemini did not respond within ${Math.ceil(timeoutMs / 1000)} seconds. Try a smaller question set or retry later.`,
        code: "GEMINI_UPSTREAM_TIMEOUT",
      },
    };
  }
  return {
    status: 504,
    body: {
      error: "The Gemini request was interrupted before a response arrived. Please retry.",
      code: "GEMINI_UPSTREAM_ABORTED",
    },
  };
}
