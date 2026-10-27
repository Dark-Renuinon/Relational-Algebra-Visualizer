import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createGeminiDeadline, DEFAULT_GEMINI_TIMEOUT_MS, getGeminiAbortResponse, isGeminiRequestAborted, MAX_GEMINI_EXAM_TIMEOUT_MS, raceWithGeminiAbort, resolveGeminiTimeoutMs } from "./geminiTimeout.ts";
import { classifyGeminiUpstreamFailure, isGeminiNetworkError } from "./geminiErrors.ts";
import { fetchGeminiWithFallback, resolveGeminiModelPair } from "./geminiFallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  let stage = "request_validation";
  let geminiTimeoutMs = DEFAULT_GEMINI_TIMEOUT_MS;
  let geminiDeadline: ReturnType<typeof createGeminiDeadline> | null = null;
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 16_000) {
      return new Response(JSON.stringify({ error: "Request is too large." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "A valid JSON request body is required." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { action, topic, difficulty, count, question, userAnswer, history } = body;
    const allowedActions = ["generateQuiz", "askTutor", "generateExamQuestions"];
    if (!allowedActions.includes(action)) {
      return new Response(JSON.stringify({ error: "Unsupported action." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (topic !== undefined && (typeof topic !== "string" || topic.length > 200)) {
      return new Response(JSON.stringify({ error: "Topic must be 200 characters or fewer." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "askTutor" && (typeof question !== "string" || question.trim().length < 1 || question.length > 4000)) {
      return new Response(JSON.stringify({ error: "Tutor questions must contain 1–4,000 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((action === "generateQuiz" || action === "generateExamQuestions") && (!Number.isInteger(count) || count < 1 || count > (action === "generateQuiz" ? 20 : 60))) {
      return new Response(JSON.stringify({ error: "Question count is outside the allowed range." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "generateQuiz" && !["Easy", "Medium", "Hard"].includes(difficulty)) {
      return new Response(JSON.stringify({ error: "Difficulty must be Easy, Medium, or Hard." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "generateExamQuestions" && !["Easy", "Medium", "Hard", "All"].includes(difficulty)) {
      return new Response(JSON.stringify({ error: "Exam difficulty must be Easy, Medium, Hard, or All." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (userAnswer !== undefined && (typeof userAnswer !== "string" || userAnswer.length > 2000)) {
      return new Response(JSON.stringify({ error: "Student answers must be 2,000 characters or fewer." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (history !== undefined && (!Array.isArray(history) || history.length > 10 || history.some((entry) => !entry || typeof entry !== "object" || !["user", "assistant"].includes(entry.role) || typeof entry.content !== "string" || entry.content.length > 2000))) {
      return new Response(JSON.stringify({ error: "Conversation history is invalid or too long." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    stage = "server_configuration";
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const configuredModel = Deno.env.get("GEMINI_MODEL");
    const configuredFallbackModel = Deno.env.get("GEMINI_FALLBACK_MODEL");
    const configuredTimeoutMs = resolveGeminiTimeoutMs(Deno.env.get("GEMINI_TIMEOUT_MS"));
    geminiTimeoutMs = action === "generateExamQuestions"
      ? Math.min(configuredTimeoutMs, MAX_GEMINI_EXAM_TIMEOUT_MS)
      : configuredTimeoutMs;

    if (!apiKey) {
      console.error(JSON.stringify({ event: "gemini_tutor_failure", stage, reason: "missing_server_secret" }));
      return new Response(JSON.stringify({ error: "Gemini is not configured on the server.", code: "GEMINI_KEY_MISSING" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let primaryModel: string;
    let fallbackModel: string | null;
    try {
      ({ primaryModel, fallbackModel } = resolveGeminiModelPair(configuredModel, configuredFallbackModel));
    } catch {
      console.error(JSON.stringify({ event: "gemini_tutor_failure", stage: "model_configuration", reason: "invalid_model_name" }));
      return new Response(JSON.stringify({ error: "GEMINI_MODEL and GEMINI_FALLBACK_MODEL must be valid Gemini model IDs.", code: "GEMINI_MODEL_INVALID" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = action === "generateQuiz"
      ? `Create exactly ${count} multiple-choice quiz questions about ${String(topic || "Relational Algebra").slice(0, 200)} at ${difficulty} difficulty.
Return ONLY valid JSON in this shape:
{"questions":[{"question":"...","options":["A...","B...","C...","D..."],"correctAnswer":"A...","explanation":"..."}]}
The correctAnswer must exactly match one of the options. Questions must be accurate and not falsely attributed to past exams.`
      : action === "generateExamQuestions"
      ? `Create exactly ${count} solved practice questions about ${String(topic || "Relational Algebra").slice(0, 200)} at ${difficulty === "All" ? "a balanced mix of Easy, Medium, and Hard" : difficulty} difficulty. Prioritize accuracy and include valid partial questions if you cannot complete the full set within a short generation window.
Return ONLY valid JSON:
{"questions":[{"question":"...","options":["A...","B...","C...","D..."],"correctAnswer":"A...","solution":"Step-by-step explanation","difficulty":"Easy|Medium|Hard","topic":"...","examTag":"Exam-style practice","year":null}]}
Do not invent past-exam years or claim an unverified question is an official previous-year question.`
      : `You are a helpful tutor for a Relational Algebra Visualizer project.
Topic: ${String(topic || "Relational Algebra").slice(0, 200)}
Student question: ${String(question || "").slice(0, 4000)}
Student answer, if provided: ${String(userAnswer || "").slice(0, 2000)}
Recent conversation: ${JSON.stringify(Array.isArray(history) ? history.slice(-10).map((entry) => ({ role: entry.role, content: entry.content })) : []).slice(0, 5000)}
Explain concepts clearly with step-by-step reasoning and examples when helpful.`;

    stage = "gemini_upstream_request";
    geminiDeadline = createGeminiDeadline(geminiTimeoutMs);
    const requestSignal = geminiDeadline.signal;
    const upstreamRequest = await raceWithGeminiAbort(fetchGeminiWithFallback(
      fetch,
      primaryModel,
      action === "generateExamQuestions" ? null : fallbackModel,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: action === "askTutor" ? 1800 : 5000,
            responseMimeType: action === "askTutor" ? "text/plain" : "application/json",
          },
        }),
        signal: requestSignal,
      },
      {
        onAttempt: (attempt, attemptNumber) => console.info(JSON.stringify({
          event: "gemini_tutor_attempt",
          stage,
          attempt: attemptNumber,
          model: attempt.model,
          upstreamStatus: attempt.status,
          result: attempt.status < 400 ? "success" : attempt.retryScheduled ? (attemptNumber === 1 ? "fallback_scheduled" : "retry_scheduled") : "failure",
          action,
        })),
      },
    ), requestSignal);
    const { response, model, fallbackAttempted, primaryErrorPayload } = upstreamRequest;

    if (fallbackAttempted && response.ok) {
      const primaryDiagnostic = classifyGeminiUpstreamFailure(503, primaryErrorPayload);
      console.warn(JSON.stringify({
        event: "gemini_tutor_fallback_succeeded",
        stage,
        primaryModel,
        primaryStatus: 503,
        fallbackModel: model,
        fallbackStatus: response.status,
        classification: primaryDiagnostic.classification,
        providerCode: primaryDiagnostic.providerCode,
        providerReason: primaryDiagnostic.providerReason,
        providerMessage: primaryDiagnostic.providerMessage,
        action,
      }));
    }

    if (!response.ok) {
      let providerPayload: unknown = null;
      if (action !== "generateExamQuestions") {
        try {
          providerPayload = await raceWithGeminiAbort(response.json(), requestSignal);
        } catch {
          if (requestSignal.aborted) throw requestSignal.reason;
          // Do not log or return unparsed provider data.
        }
      } else {
        // Exam generation falls back locally as soon as upstream status is known;
        // do not hold the student for an optional provider error body.
        void response.body?.cancel().catch(() => {});
      }
      const diagnostic = classifyGeminiUpstreamFailure(response.status, providerPayload);
      const primaryDiagnostic = fallbackAttempted
        ? classifyGeminiUpstreamFailure(503, primaryErrorPayload)
        : null;
      console.error(JSON.stringify({
        event: "gemini_tutor_failure",
        stage,
        upstreamStatus: diagnostic.status,
        classification: diagnostic.classification,
        providerCode: diagnostic.providerCode,
        providerReason: diagnostic.providerReason,
        providerMessage: diagnostic.providerMessage,
        action,
        model,
        fallbackAttempted,
        ...(primaryDiagnostic ? {
          primaryModel,
          primaryStatus: 503,
          primaryClassification: primaryDiagnostic.classification,
          primaryProviderCode: primaryDiagnostic.providerCode,
          primaryProviderReason: primaryDiagnostic.providerReason,
        } : {}),
      }));
      const clientStatus = response.status === 503 || response.status === 429 ? response.status : 502;
      console.info(JSON.stringify({
        event: "gemini_tutor_result",
        stage,
        result: "error",
        httpStatus: clientStatus,
        upstreamStatus: diagnostic.status,
        classification: diagnostic.classification,
        model,
        fallbackAttempted,
        action,
      }));
      return new Response(JSON.stringify({
        error: diagnostic.providerMessage,
        code: diagnostic.clientCode,
        upstreamStatus: diagnostic.status,
        classification: diagnostic.classification,
      }), {
        status: clientStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    stage = "gemini_response_parsing";
    const result = await raceWithGeminiAbort(response.json(), requestSignal);
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("");

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    let data: unknown = text;

    if (action !== "askTutor") {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Gemini returned invalid JSON.");
      }
      if (requestSignal.aborted) throw requestSignal.reason;
      const questions = (data as { questions?: unknown })?.questions;
      if (!Array.isArray(questions)) throw new Error("Gemini returned an invalid question set.");
      if (action === "generateExamQuestions") {
        const validQuestions: Record<string, unknown>[] = [];
        for (const item of questions.slice(0, count)) {
          const row = item as Record<string, unknown> | null;
          const options = row?.options;
          const answer = row?.correctAnswer;
          const explanation = row?.solution;
          const normalizedOptions = Array.isArray(options)
            ? options.map((option) => typeof option === "string" ? option.trim() : "")
            : [];
          const normalizedAnswer = typeof answer === "string" ? answer.trim() : "";
          const rawDifficulty = typeof row?.difficulty === "string" ? row.difficulty.trim().toLowerCase() : difficulty === "All" ? "medium" : difficulty.toLowerCase();
          const rowDifficulty = rawDifficulty ? rawDifficulty[0].toUpperCase() + rawDifficulty.slice(1) : "";
          const validDifficulty = ["Easy", "Medium", "Hard"].includes(rowDifficulty);
          const matchesRequestedDifficulty = difficulty === "All" || rowDifficulty.toLowerCase() === difficulty.toLowerCase();
          if (!row || (row.difficulty !== undefined && typeof row.difficulty !== "string") ||
            typeof row.question !== "string" || row.question.trim().length < 12 || row.question.length > 1200 ||
            normalizedOptions.length !== 4 || normalizedOptions.some((option) => !option || option.length > 300) ||
            new Set(normalizedOptions).size !== 4 || !normalizedOptions.includes(normalizedAnswer) ||
            typeof explanation !== "string" || explanation.trim().length < 12 || explanation.length > 1800 ||
            !validDifficulty || !matchesRequestedDifficulty) continue;
          validQuestions.push({
            question: row.question.trim(),
            options: normalizedOptions,
            correctAnswer: normalizedAnswer,
            solution: explanation.trim(),
            difficulty: rowDifficulty,
            topic: typeof row.topic === "string" && row.topic.trim() ? row.topic.trim().slice(0, 100) : "Relational Algebra",
            examTag: "Exam-style practice",
            year: null,
          });
        }
        data = { questions: validQuestions };
      } else {
        if (questions.length !== count) throw new Error("Gemini returned an incomplete question set.");
        for (const item of questions) {
          const row = item as Record<string, unknown>;
          const options = row?.options;
          const answer = row?.correctAnswer;
          const explanation = row?.explanation;
          if (typeof row?.question !== "string" || row.question.trim().length < 12 || row.question.length > 1200 ||
            !Array.isArray(options) || options.length !== 4 || options.some((option) => typeof option !== "string" || !option.trim() || option.length > 300) ||
            new Set(options).size !== 4 || typeof answer !== "string" || !options.includes(answer) ||
            typeof explanation !== "string" || explanation.trim().length < 12 || explanation.length > 1800) {
            throw new Error("Gemini returned a malformed question.");
          }
        }
      }
    }

    console.info(JSON.stringify({
      event: "gemini_tutor_result",
      stage,
      result: "success",
      httpStatus: 200,
      model,
      fallbackAttempted,
      action,
    }));
    return new Response(JSON.stringify({ data }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const requestAborted = isGeminiRequestAborted(error);
    const networkError = isGeminiNetworkError(stage, error);
    console.error(JSON.stringify({
      event: "gemini_tutor_failure",
      stage,
      errorName,
      classification: requestAborted ? "request_timeout" : networkError ? "network_error" : "function_error",
      ...(requestAborted ? { timeoutMs: geminiTimeoutMs } : {}),
    }));
    const abortResponse = getGeminiAbortResponse(error, geminiTimeoutMs);
    const failureStatus = abortResponse?.status || (networkError ? 502 : 500);
    console.info(JSON.stringify({
      event: "gemini_tutor_result",
      stage,
      result: "error",
      httpStatus: failureStatus,
      classification: requestAborted ? "request_timeout" : networkError ? "network_error" : "function_error",
    }));
    if (abortResponse) {
      return new Response(JSON.stringify(abortResponse.body), { status: abortResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (networkError) {
      return new Response(JSON.stringify({ error: "Could not connect to the Gemini API. Check the server network path and retry.", code: "GEMINI_NETWORK_ERROR", classification: "network_error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ error: "Unable to process the Gemini request." }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } finally {
    geminiDeadline?.dispose();
  }
});
