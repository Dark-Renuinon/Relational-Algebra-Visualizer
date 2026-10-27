import { RESERVE_QUESTION_BANK } from '../data/reserveQuestionBank';

function normalizePrompt(question) {
  const prompt = typeof question?.prompt === 'string' ? question.prompt : question?.question;
  return typeof prompt === 'string' ? prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function isEligible(question, difficulty) {
  const options = question?.options;
  const answer = question?.answer;
  return question?.difficulty?.toLowerCase() === difficulty.toLowerCase() &&
    Boolean(normalizePrompt(question)) && Array.isArray(options) && options.length === 4 &&
    options.every((option) => typeof option === 'string' && option.trim()) &&
    new Set(options.map((option) => option.trim().toLowerCase())).size === 4 &&
    Number.isInteger(answer) && answer >= 0 && answer < options.length;
}

function toQuizQuestion(question, repeatIndex, random) {
  const prompt = normalizePrompt(question) ? (question.prompt || question.question).trim() : '';
  const choices = shuffle(question.options.map((text, originalIndex) => ({ text, originalIndex })), random);
  const answer = choices.findIndex((choice) => choice.originalIndex === question.answer);
  const explanation = typeof question.explanation === 'string' ? question.explanation : (question.solution || []).join(' ');
  return {
    id: repeatIndex === 0 ? question.id : `${question.id}-quiz-repeat-${repeatIndex}`,
    prompt,
    options: choices.map((choice) => choice.text),
    answer,
    correctAnswer: choices[answer]?.text,
    explanation,
    solution: Array.isArray(question.solution) ? [...question.solution] : [explanation],
    difficulty: question.difficulty,
  };
}

/** Generate a difficulty-matched quiz offline and shuffle options without losing the answer mapping. */
export function generateLocalQuizQuestions({ count, difficulty, questionBank = RESERVE_QUESTION_BANK, random = Math.random }) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Choose a whole-number question count from 1 to 20.');
  }

  const requestedDifficulty = typeof difficulty === 'string' ? difficulty.trim() : '';
  const eligible = questionBank.filter((question) => isEligible(question, requestedDifficulty));
  const uniqueEligible = [...new Map(eligible.map((question) => [normalizePrompt(question), question])).values()];
  if (!uniqueEligible.length) throw new Error(`No ${requestedDifficulty.toLowerCase()} questions are available in the local question bank.`);

  const shuffled = shuffle(uniqueEligible, random);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  while (selected.length < count) {
    selected.push(shuffled[(selected.length - uniqueEligible.length) % shuffled.length]);
  }

  const repeats = new Map();
  return selected.map((question) => {
    const key = normalizePrompt(question);
    const repeatIndex = repeats.get(key) || 0;
    repeats.set(key, repeatIndex + 1);
    return toQuizQuestion(question, repeatIndex, random);
  });
}
