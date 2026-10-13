import { describe, expect, it } from 'vitest';
import { EXAM_QUESTIONS, getQuestions, QUIZ_QUESTIONS, validateQuestionBank } from '../src/data/questionBank';

describe('practice question bank', () => {
  it('has a valid, consistent schema and unique ids', () => {
    expect(validateQuestionBank()).toEqual([]);
  });

  it('provides ten original quiz questions for each difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      expect(getQuestions('quiz', difficulty)).toHaveLength(10);
    }
    expect(QUIZ_QUESTIONS.every((question) => question.sourceType === 'practice')).toBe(true);
  });

  it('keeps only verified, sourced exam items in the competitive bank', () => {
    expect(EXAM_QUESTIONS).toHaveLength(3);
    expect(['easy', 'medium', 'hard'].map((difficulty) => getQuestions('exam', difficulty).length)).toEqual([1, 1, 1]);
    expect(EXAM_QUESTIONS.every((question) => question.exam.verified && /^https:\/\//.test(question.exam.sourceUrl))).toBe(true);
    expect(EXAM_QUESTIONS.find((question) => question.id === 'gate-2023-q16').exam.date).toBe('4 February 2023');
    expect(EXAM_QUESTIONS.filter((question) => question.exam.year === '2001').every((question) => question.exam.date === 'Exact exam date not verified')).toBe(true);
  });
});
