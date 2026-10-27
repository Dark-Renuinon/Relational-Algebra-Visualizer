import { describe, expect, it } from 'vitest';
import { RESERVE_QUESTION_BANK } from '../src/data/reserveQuestionBank';

describe('offline reserve exam bank', () => {
  it('contains 100 unique, complete questions across all three difficulty levels', () => {
    expect(RESERVE_QUESTION_BANK).toHaveLength(100);
    expect(new Set(RESERVE_QUESTION_BANK.map((question) => question.id)).size).toBe(100);
    expect(new Set(RESERVE_QUESTION_BANK.map((question) => question.prompt.trim().toLowerCase())).size).toBe(100);
    expect(new Set(RESERVE_QUESTION_BANK.map((question) => question.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']));
    for (const question of RESERVE_QUESTION_BANK) {
      expect(question.question).toBe(question.prompt);
      expect(question.options).toHaveLength(4);
      expect(question.options[question.answer]).toBe(question.correctAnswer);
      expect(question.explanation.trim().length).toBeGreaterThan(11);
    }
  });
});
