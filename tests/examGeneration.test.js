import { describe, expect, it, vi } from 'vitest';
import { RESERVE_QUESTION_BANK } from '../src/data/reserveQuestionBank';
import { assembleExamQuestions, examQuestionsOverlap, generateExamWithReserve, GEMINI_EXAM_CLIENT_TIMEOUT_MS } from '../src/utils/examGeneration';
import { calculateExamScore } from '../src/utils/examSetup';

const generated = (question, options, answer, difficulty = 'Easy', solution = 'This explanation describes why the selected relational algebra result is correct.') => ({
  question,
  options,
  correctAnswer: options[answer],
  solution,
  difficulty,
});

function localQuestion(id, difficulty = 'easy', prompt = `Unique reserve question ${id} asks how the relation operation works?`) {
  return {
    id,
    difficulty,
    topic: 'Relational Algebra',
    prompt,
    question: prompt,
    options: [`Correct ${id}`, `Wrong A ${id}`, `Wrong B ${id}`, `Wrong C ${id}`],
    answer: 0,
    correctAnswer: `Correct ${id}`,
    explanation: `The explanation for reserve question ${id} states why the first answer is correct.`,
    solution: [`The explanation for reserve question ${id} states why the first answer is correct.`],
    source: 'reserve',
  };
}

describe('Gemini exam generation with local reserve completion', () => {
  it('uses all valid Gemini questions when generation succeeds completely', async () => {
    const rows = [
      generated('For R(A,B), what does σA>2(R) select?', ['Rows with A>2', 'Rows with A<2', 'All columns', 'No tuples'], 0),
      generated('Which operation returns only attribute A from R(A,B)?', ['Selection', 'Projection πA', 'Union', 'Product'], 1),
      generated('When are two relations union-compatible?', ['Same tuple count', 'Same name', 'Same degree and compatible domains', 'Common key'], 2),
      generated('How many pairs are in R×S when R has 2 tuples and S has 3?', ['5', '6', '2', '3'], 1),
      generated('Which operator renames the relation S to T?', ['σ', 'π', 'ρ', '−'], 2),
    ];
    const requestGemini = vi.fn().mockResolvedValue({ data: { questions: rows } });

    const exam = await generateExamWithReserve({ requestGemini, reserveQuestions: [localQuestion('unused')], count: 5, difficulty: 'easy' });

    expect(requestGemini).toHaveBeenCalledTimes(1);
    expect(requestGemini).toHaveBeenCalledWith(expect.objectContaining({ count: 5, difficulty: 'easy', signal: expect.any(AbortSignal) }));
    expect(exam).toHaveLength(5);
    expect(exam.every((question) => question.source === 'gemini')).toBe(true);
    expect(exam.map((question) => question.answer)).toEqual([0, 1, 2, 1, 2]);
    expect(exam[1].options[exam[1].answer]).toBe(exam[1].correctAnswer);
    expect(GEMINI_EXAM_CLIENT_TIMEOUT_MS).toBe(10_000);
  });

  it('preserves valid partial Gemini questions and fills exactly the missing count', async () => {
    const rows = [
      generated('Which operator filters tuples satisfying a predicate?', ['Selection', 'Projection', 'Union', 'Rename'], 0),
      { question: 'Malformed item with missing choices' },
      generated('What does projection πA keep from R(A,B)?', ['Only attribute A values', 'Only rows with A>0', 'All attributes', 'No tuples'], 0),
    ];

    const exam = await generateExamWithReserve({
      requestGemini: vi.fn().mockResolvedValue({ data: { questions: rows } }),
      reserveQuestions: [localQuestion('fallback-1'), localQuestion('fallback-2'), localQuestion('fallback-3')],
      count: 5,
      difficulty: 'easy',
      random: () => 0,
    });

    expect(exam).toHaveLength(5);
    expect(exam.filter((question) => question.source === 'gemini')).toHaveLength(2);
    expect(exam.filter((question) => question.source === 'reserve')).toHaveLength(3);
    expect(new Set(exam.map((question) => question.id)).size).toBe(5);
  });

  it('falls back immediately when Gemini fails after one second', async () => {
    const startedAt = Date.now();
    const requestGemini = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      throw new Error('Gemini request failed');
    });
    const exam = await generateExamWithReserve({
      requestGemini,
      reserveQuestions: [localQuestion('fast-fallback')],
      count: 1,
      difficulty: 'easy',
    });

    expect(Date.now() - startedAt).toBeLessThan(GEMINI_EXAM_CLIENT_TIMEOUT_MS);
    expect(requestGemini).toHaveBeenCalledTimes(1);
    expect(exam).toHaveLength(1);
    expect(exam[0].id).toBe('fast-fallback');
  });

  it('aborts a Gemini request that never resolves at the single deadline', async () => {
    let requestSignal;
    const requestGemini = vi.fn(({ signal }) => {
      requestSignal = signal;
      return new Promise(() => {});
    });
    const exam = await generateExamWithReserve({
      requestGemini,
      reserveQuestions: [localQuestion('deadline-fallback')],
      count: 1,
      difficulty: 'easy',
      timeoutMs: 25,
    });

    expect(requestSignal.aborted).toBe(true);
    expect(requestGemini).toHaveBeenCalledTimes(1);
    expect(exam).toHaveLength(1);
    expect(exam[0].id).toBe('deadline-fallback');
  });

  it.each([
    ['timeout', Object.assign(new Error('deadline'), { name: 'TimeoutError' })],
    ['quota error', new Error('HTTP 429 quota exceeded')],
    ['HTTP 503', new Error('Gemini unavailable')],
  ])('fills the full exam from reserve questions after a Gemini %s', async (_failureName, error) => {
    const requestGemini = vi.fn().mockRejectedValue(error);
    const exam = await generateExamWithReserve({ requestGemini, reserveQuestions: RESERVE_QUESTION_BANK, count: 10, difficulty: 'medium', random: () => 0.5 });

    expect(requestGemini).toHaveBeenCalledTimes(1);
    expect(exam).toHaveLength(10);
    expect(exam.every((question) => question.source === 'reserve')).toBe(true);
    expect(exam.every((question) => question.difficulty === 'medium')).toBe(true);
  });

  it('fills the exam when Gemini returns a malformed response', async () => {
    const exam = await generateExamWithReserve({
      requestGemini: vi.fn().mockResolvedValue({ data: { questions: 'not an array' } }),
      reserveQuestions: RESERVE_QUESTION_BANK,
      count: 5,
      difficulty: 'easy',
      random: () => 0,
    });
    expect(exam).toHaveLength(5);
    expect(exam.every((question) => question.source === 'reserve')).toBe(true);
  });

  it('assembles a full 60-question mixed-difficulty exam from the offline bank', async () => {
    const exam = await generateExamWithReserve({
      requestGemini: vi.fn().mockRejectedValue(new Error('offline')),
      reserveQuestions: RESERVE_QUESTION_BANK,
      count: 60,
      difficulty: 'all',
      random: () => 0,
    });
    expect(exam).toHaveLength(60);
    expect(new Set(exam.map((question) => question.id)).size).toBe(60);
    expect(Object.fromEntries(['easy', 'medium', 'hard'].map((level) => [level, exam.filter((item) => item.difficulty === level).length]))).toEqual({ easy: 20, medium: 20, hard: 20 });
  });

  it('rejects overlapping reserve items and preserves the requested answer mapping', () => {
    const fromGemini = {
      question: 'For relation R(A,B), what does selection σA>5(R) return?',
      options: ['The tuples where A exceeds 5', 'The tuples where A is below 5', 'Only attribute A', 'The empty schema'],
      correctAnswer: 'The tuples where A exceeds 5',
      solution: 'Selection retains every complete tuple that satisfies the predicate A>5.',
      difficulty: 'Easy',
    };
    const overlappingReserve = localQuestion('overlap', 'easy', 'Apply selection σA>5 to relation R(A,B). Which tuples remain?');
    const distinctReserve = localQuestion('distinct', 'easy');
    expect(examQuestionsOverlap(fromGemini, overlappingReserve)).toBe(true);

    const exam = assembleExamQuestions({
      geminiQuestions: [{
        id: 'gemini-1', difficulty: 'easy', topic: 'Selection', prompt: fromGemini.question,
        options: fromGemini.options, answer: 0, correctAnswer: fromGemini.correctAnswer,
        explanation: fromGemini.solution, solution: [fromGemini.solution],
      }],
      reserveQuestions: [overlappingReserve, distinctReserve],
      count: 2,
      difficulty: 'easy',
      random: () => 0,
    });

    expect(exam).toHaveLength(2);
    expect(exam.some((question) => question.id === 'overlap')).toBe(false);
    const reserveSelected = exam.find((question) => question.id === 'distinct');
    expect(reserveSelected.options[reserveSelected.answer]).toBe(reserveSelected.correctAnswer);
  });

  it('prefers matching difficulty and duplicates only after unique reserve questions are exhausted', () => {
    const bank = [localQuestion('easy-1', 'easy'), localQuestion('hard-1', 'hard'), localQuestion('hard-2', 'hard')];
    const exam = assembleExamQuestions({ geminiQuestions: [], reserveQuestions: bank, count: 2, difficulty: 'hard', random: () => 0 });
    expect(exam.map((question) => question.difficulty)).toEqual(['hard', 'hard']);
    expect(new Set(exam.map((question) => question.id)).size).toBe(2);

    const duplicateOnly = [localQuestion('same', 'easy')];
    const duplicatedExam = assembleExamQuestions({ geminiQuestions: [], reserveQuestions: duplicateOnly, count: 3, difficulty: 'easy' });
    expect(duplicatedExam).toHaveLength(3);
    expect(duplicatedExam[1].id).toContain('-repeat-');
    expect(duplicatedExam[2].id).toContain('-repeat-');
  });

  it('uses the assembled question count as the score denominator', () => {
    const exam = assembleExamQuestions({ geminiQuestions: [], reserveQuestions: RESERVE_QUESTION_BANK, count: 5, difficulty: 'hard', random: () => 0 });
    const result = calculateExamScore(exam, Object.fromEntries(exam.slice(0, 2).map((question) => [question.id, question.answer])));
    expect(result).toEqual({ correct: 2, total: 5, percentage: 40 });
  });
});
