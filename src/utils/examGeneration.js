import { RESERVE_QUESTION_BANK } from '../data/reserveQuestionBank';

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'does', 'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'which', 'with', 'would']);
export const GEMINI_EXAM_CLIENT_TIMEOUT_MS = 10_000;

function normalizeDifficulty(value, fallback) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'all' || normalized === 'all difficulties') return 'all';
  return VALID_DIFFICULTIES.has(normalized) ? normalized : fallback;
}

function getQuestionPrompt(question) {
  return typeof question?.prompt === 'string' ? question.prompt : typeof question?.question === 'string' ? question.question : '';
}

function normalizeQuestionText(value) {
  return value.toLowerCase()
    .normalize('NFKD')
    .replace(/[σ]/g, ' selection ')
    .replace(/[π]/g, ' projection ')
    .replace(/[⋈⨝]/g, ' join ')
    .replace(/[×]/g, ' product ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getQuestionFeatures(prompt) {
  const normalized = normalizeQuestionText(prompt);
  const tokens = new Set(normalized.split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
  const predicates = new Set([...prompt.toLowerCase().matchAll(/([a-z][a-z0-9_.]*)\s*(!=|<=|>=|=|<|>)\s*([a-z0-9_.]+)/g)].map((match) => `${match[1]}${match[2]}${match[3]}`));
  const operators = new Set();
  if (/[σ]|\bselection\b|\bselecting\b/i.test(prompt)) operators.add('selection');
  if (/[π]|\bprojection\b|\bprojecting\b/i.test(prompt)) operators.add('projection');
  if (/[⋈⨝]|\bjoin\b/i.test(prompt)) operators.add('join');
  if (/[×]|\bCartesian product\b|\bproduct\b/i.test(prompt)) operators.add('product');
  return { normalized, tokens, predicates, operators };
}

export function examQuestionsOverlap(left, right) {
  const leftPrompt = getQuestionPrompt(left);
  const rightPrompt = getQuestionPrompt(right);
  if (!leftPrompt || !rightPrompt) return false;

  const a = getQuestionFeatures(leftPrompt);
  const b = getQuestionFeatures(rightPrompt);
  if (a.normalized === b.normalized) return true;

  const sharedPredicates = [...a.predicates].filter((predicate) => b.predicates.has(predicate));
  const sharedOperators = [...a.operators].some((operator) => b.operators.has(operator));
  if (sharedPredicates.length > 0 && sharedOperators) return true;

  const common = [...a.tokens].filter((token) => b.tokens.has(token)).length;
  if (common < 4) return false;
  const union = new Set([...a.tokens, ...b.tokens]).size;
  const jaccard = union ? common / union : 0;
  const containment = Math.min(a.tokens.size, b.tokens.size) ? common / Math.min(a.tokens.size, b.tokens.size) : 0;
  return jaccard >= 0.7 || (containment >= 0.88 && common >= 5);
}

export function validateGeminiExamQuestions(payload, count, requestedDifficulty) {
  const requested = normalizeDifficulty(requestedDifficulty, 'easy');
  const rows = payload?.data?.questions ?? payload?.questions;
  if (!Array.isArray(rows)) return [];

  const accepted = [];
  for (const [index, row] of rows.entries()) {
    if (accepted.length >= count || !row || typeof row !== 'object' || Array.isArray(row)) continue;
    const prompt = typeof row.question === 'string' ? row.question.trim() : typeof row.prompt === 'string' ? row.prompt.trim() : '';
    const options = Array.isArray(row.options) ? row.options.map((option) => typeof option === 'string' ? option.trim() : '') : [];
    const correctAnswer = typeof row.correctAnswer === 'string' ? row.correctAnswer.trim() : '';
    const solution = typeof row.solution === 'string'
      ? row.solution.trim()
      : Array.isArray(row.solution)
      ? row.solution.filter((step) => typeof step === 'string').join(' ').trim()
      : typeof row.explanation === 'string' ? row.explanation.trim() : '';
    if (row.difficulty !== undefined && !VALID_DIFFICULTIES.has(String(row.difficulty).trim().toLowerCase())) continue;
    const itemDifficulty = normalizeDifficulty(row.difficulty, requested === 'all' ? 'medium' : requested);

    if ((requested !== 'all' && itemDifficulty !== requested) || prompt.length < 12 || prompt.length > 1200 ||
      options.length !== 4 || options.some((option) => !option || option.length > 300) ||
      new Set(options.map((option) => option.toLowerCase())).size !== 4 ||
      !correctAnswer || !options.includes(correctAnswer) || solution.length < 12 || solution.length > 1800) continue;

    accepted.push({
      id: `gemini-${index + 1}`,
      difficulty: itemDifficulty,
      topic: typeof row.topic === 'string' && row.topic.trim() ? row.topic.trim().slice(0, 100) : 'Relational Algebra',
      prompt,
      question: prompt,
      options,
      answer: options.indexOf(correctAnswer),
      correctAnswer,
      explanation: solution,
      solution: [solution],
      source: 'gemini',
      sourceType: 'exam-style-practice',
    });
  }
  return accepted;
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function assembleExamQuestions({
  geminiQuestions = [],
  reserveQuestions = RESERVE_QUESTION_BANK,
  count,
  difficulty = 'easy',
  random = Math.random,
}) {
  if (!Number.isInteger(count) || count < 1) throw new Error('The exam question count must be a positive integer.');
  const targetDifficulty = normalizeDifficulty(difficulty, 'easy');
  const selected = [];
  for (const question of geminiQuestions) {
    if (selected.length >= count) break;
    if (!selected.some((item) => examQuestionsOverlap(item, question))) selected.push({ ...question, source: 'gemini' });
  }

  const missing = count - selected.length;
  if (missing === 0) return selected;
  if (!reserveQuestions.length) throw new Error('No reserve questions are available.');

  let reserveOrder;
  if (targetDifficulty === 'all') {
    const levels = ['easy', 'medium', 'hard'].map((level) => shuffle(
      reserveQuestions.filter((question) => question.difficulty === level),
      random,
    ));
    reserveOrder = [];
    for (let index = 0; levels.some((level) => level.length > index); index += 1) {
      for (const level of levels) if (level[index]) reserveOrder.push(level[index]);
    }
  } else {
    const matchingDifficulty = reserveQuestions.filter((question) => normalizeDifficulty(question.difficulty, targetDifficulty) === targetDifficulty);
    const otherDifficulties = reserveQuestions.filter((question) => normalizeDifficulty(question.difficulty, targetDifficulty) !== targetDifficulty);
    reserveOrder = [...shuffle(matchingDifficulty, random), ...shuffle(otherDifficulties, random)];
  }
  const uniqueReserve = [];
  for (const question of reserveOrder) {
    if (selected.length + uniqueReserve.length >= count) break;
    if ([...selected, ...uniqueReserve].some((item) => examQuestionsOverlap(item, question))) continue;
    uniqueReserve.push({ ...question, source: 'reserve' });
  }

  const assembled = [...selected, ...uniqueReserve];
  // Reuse reserve items only if every non-overlapping reserve candidate is exhausted.
  let duplicateIndex = 0;
  while (assembled.length < count) {
    const question = reserveOrder[duplicateIndex % reserveOrder.length] || reserveQuestions[duplicateIndex % reserveQuestions.length];
    assembled.push({ ...question, id: `${question.id}-repeat-${duplicateIndex + 1}`, source: 'reserve' });
    duplicateIndex += 1;
  }
  return assembled;
}

export async function generateExamWithReserve({
  requestGemini,
  reserveQuestions = RESERVE_QUESTION_BANK,
  count,
  difficulty,
  random = Math.random,
  includeGemini = true,
  matchesGeminiQuestion = () => true,
  timeoutMs = GEMINI_EXAM_CLIENT_TIMEOUT_MS,
}) {
  let payload = null;
  if (includeGemini && typeof requestGemini === 'function') {
    const controller = new AbortController();
    let timer;
    let rejectDeadline;
    const deadline = new Promise((_, reject) => { rejectDeadline = reject; });
    timer = setTimeout(() => {
      const timeoutError = new DOMException(`Gemini exam generation exceeded its ${Math.ceil(timeoutMs / 1000)}-second deadline.`, 'TimeoutError');
      controller.abort(timeoutError);
      rejectDeadline(timeoutError);
    }, timeoutMs);
    try {
      // The one deadline covers the full Supabase invoke (including its response body).
      // Racing it ensures reserve assembly does not wait for a transport that ignores abort.
      payload = await Promise.race([
        Promise.resolve().then(() => requestGemini({ count, difficulty, signal: controller.signal })),
        deadline,
      ]);
    } catch {
      // A provider, network, parse, quota, or timeout failure immediately uses local data.
    } finally {
      clearTimeout(timer);
      if (!controller.signal.aborted) controller.abort();
    }
  }
  const geminiQuestions = includeGemini
    ? validateGeminiExamQuestions(payload, count, difficulty).filter(matchesGeminiQuestion)
    : [];
  return assembleExamQuestions({ geminiQuestions, reserveQuestions, count, difficulty, random });
}
