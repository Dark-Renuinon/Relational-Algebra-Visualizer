import { describe, expect, it } from 'vitest';
import { RESERVE_QUESTION_BANK } from '../src/data/reserveQuestionBank';
import { calculateExamScore, EXAM_QUESTION_COUNTS, getExamProgress, getExamQuestionCountOptions, selectExamQuestions } from '../src/utils/examSetup';

describe('competitive exam question-count setup', () => {
  it.each([5, 10, 20, 50, 60])('selects exactly %i unique questions and uses that count throughout the attempt', (count) => {
    const selected = selectExamQuestions(RESERVE_QUESTION_BANK, count, () => 0);
    const ids = new Set(selected.map((question) => question.id));
    const answers = Object.fromEntries(selected.map((question, index) => [question.id, index === 0 ? question.answer : -1]));
    const score = calculateExamScore(selected, answers);

    expect(selected).toHaveLength(count);
    expect(ids.size).toBe(count);
    expect(score).toEqual({ correct: 1, total: count, percentage: Math.round((1 / count) * 100) });
    expect(getExamProgress(0, selected.length)).toEqual({ current: 1, total: count });
    expect(getExamProgress(selected.length - 1, selected.length)).toEqual({ current: count, total: count });
  });

  it('offers the requested count choices and disables choices above the available bank size', () => {
    expect(EXAM_QUESTION_COUNTS).toEqual([5, 10, 15, 20, 25, 50, 60]);
    expect(getExamQuestionCountOptions(9)).toEqual([
      { count: 5, disabled: false },
      { count: 10, disabled: true },
      { count: 15, disabled: true },
      { count: 20, disabled: true },
      { count: 25, disabled: true },
      { count: 50, disabled: true },
      { count: 60, disabled: true },
    ]);
    expect(() => selectExamQuestions(RESERVE_QUESTION_BANK.slice(0, 9), 10)).toThrow('Only 9 questions are available');
  });

  it('rejects a count when duplicate question IDs leave too few unique questions', () => {
    const duplicatePool = Array(5).fill(RESERVE_QUESTION_BANK[0]);
    expect(() => selectExamQuestions(duplicatePool, 5)).toThrow('Only 1 unique question is available');
  });
});
