export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export function normalizeGeminiModelName(configuredModel?: string | null): string {
  const configured = configuredModel?.trim() || DEFAULT_GEMINI_MODEL;
  const model = configured.replace(/^(?:models\/)+/i, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(model)) {
    throw new Error("Invalid GEMINI_MODEL configuration.");
  }
  return model;
}

export function buildGeminiGenerateContentUrl(configuredModel?: string | null): string {
  const model = normalizeGeminiModelName(configuredModel);
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}
