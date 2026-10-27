const SAFE_PROVIDER_STATUSES = new Set([
  "INVALID_ARGUMENT", "FAILED_PRECONDITION", "UNAUTHENTICATED", "PERMISSION_DENIED",
  "NOT_FOUND", "RESOURCE_EXHAUSTED", "INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED",
]);
const SAFE_PROVIDER_REASONS = new Set([
  "API_KEY_INVALID", "API_KEY_SERVICE_BLOCKED", "RATE_LIMIT_EXCEEDED", "QUOTA_EXCEEDED",
  "DAILY_LIMIT_EXCEEDED", "SERVICE_DISABLED", "BILLING_DISABLED", "USER_PROJECT_DENIED",
  "MODEL_CAPACITY_EXHAUSTED", "ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
]);

type FailureClassification =
  | "api_key_problem" | "project_access" | "billing_prerequisite" | "quota_exceeded"
  | "rate_limited" | "model_capacity" | "service_unavailable" | "model_or_resource_not_found"
  | "invalid_request" | "provider_error";

export interface GeminiUpstreamDiagnostic {
  status: number;
  classification: FailureClassification;
  clientCode: string;
  providerCode?: string;
  providerReason?: string;
  providerMessage: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeProviderReason(error: Record<string, unknown>): string | undefined {
  const details = Array.isArray(error.details) ? error.details.slice(0, 10) : [];
  for (const value of details) {
    const reason = asRecord(value)?.reason;
    if (typeof reason === "string" && SAFE_PROVIDER_REASONS.has(reason)) return reason;
  }
  return undefined;
}

export function classifyGeminiUpstreamFailure(status: number, payload: unknown): GeminiUpstreamDiagnostic {
  const providerError = asRecord(asRecord(payload)?.error);
  const rawStatus = providerError?.status;
  const providerCode = typeof rawStatus === "string" && SAFE_PROVIDER_STATUSES.has(rawStatus)
    ? rawStatus
    : undefined;
  const providerReason = providerError ? safeProviderReason(providerError) : undefined;
  const details = Array.isArray(providerError?.details) ? providerError.details.slice(0, 10) : [];
  const detailMessages = details.map((detail) => asRecord(detail)?.message)
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.slice(0, 500));
  const topMessage = typeof providerError?.message === "string" ? providerError.message.slice(0, 1000) : "";
  // Provider text is used only for classification. It is never copied to logs or returned to the client.
  const providerText = [topMessage, ...detailMessages].join(" ").toLowerCase();

  let classification: FailureClassification;
  if (providerReason === "API_KEY_INVALID" || providerReason === "API_KEY_SERVICE_BLOCKED" || /api.?key.{0,24}(invalid|not valid|expired)/i.test(providerText) || status === 401) {
    classification = "api_key_problem";
  } else if (status === 403 || providerReason === "SERVICE_DISABLED" || providerReason === "USER_PROJECT_DENIED" || providerReason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") {
    classification = "project_access";
  } else if (status === 402 || providerReason === "BILLING_DISABLED") {
    classification = "billing_prerequisite";
  } else if (status === 429 && (providerReason === "QUOTA_EXCEEDED" || providerReason === "DAILY_LIMIT_EXCEEDED" || /quota|spend limit|daily limit/i.test(providerText))) {
    classification = "quota_exceeded";
  } else if (status === 429 || providerReason === "RATE_LIMIT_EXCEEDED") {
    classification = "rate_limited";
  } else if (status === 503 && (providerReason === "MODEL_CAPACITY_EXHAUSTED" || /capacity|overload|high demand|out of capacity/i.test(providerText))) {
    classification = "model_capacity";
  } else if (status === 503) {
    classification = "service_unavailable";
  } else if (status === 404 || providerCode === "NOT_FOUND") {
    classification = "model_or_resource_not_found";
  } else if (status === 400 || providerCode === "INVALID_ARGUMENT" || providerCode === "FAILED_PRECONDITION") {
    classification = "invalid_request";
  } else {
    classification = "provider_error";
  }

  const providerMessage: Record<FailureClassification, string> = {
    api_key_problem: "Gemini rejected the server API key.",
    project_access: "Gemini denied access for this key or project.",
    billing_prerequisite: "Gemini reports a billing prerequisite.",
    quota_exceeded: "Gemini reports a quota or spend limit.",
    rate_limited: "Gemini reports a request or token rate limit.",
    model_capacity: "Gemini reports temporary model capacity pressure.",
    service_unavailable: "Gemini reports temporary service unavailability.",
    model_or_resource_not_found: "Gemini could not find the configured model or resource.",
    invalid_request: "Gemini rejected the request parameters.",
    provider_error: "Gemini returned an upstream error.",
  }[classification];

  const clientCode: Record<FailureClassification, string> = {
    api_key_problem: "GEMINI_API_KEY_REJECTED",
    project_access: "GEMINI_PROJECT_ACCESS_DENIED",
    billing_prerequisite: "GEMINI_BILLING_PREREQUISITE",
    quota_exceeded: "GEMINI_QUOTA_EXCEEDED",
    rate_limited: "GEMINI_RATE_LIMITED",
    model_capacity: "GEMINI_MODEL_CAPACITY",
    service_unavailable: "GEMINI_SERVICE_UNAVAILABLE",
    model_or_resource_not_found: "GEMINI_RESOURCE_NOT_FOUND",
    invalid_request: "GEMINI_INVALID_REQUEST",
    provider_error: "GEMINI_UPSTREAM_ERROR",
  }[classification];

  return { status, classification, clientCode, providerCode, providerReason, providerMessage };
}

export function isGeminiNetworkError(stage: string, error: unknown): boolean {
  return stage === "gemini_upstream_request" && error instanceof TypeError;
}
