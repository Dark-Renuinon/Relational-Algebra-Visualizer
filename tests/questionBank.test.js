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

  it('keeps sourced exam items with answer references in the competitive bank', () => {
    expect(EXAM_QUESTIONS).toHaveLength(13);
    expect(['easy', 'medium', 'hard'].map((difficulty) => getQuestions('exam', difficulty).length)).toEqual([5, 4, 4]);
    expect(EXAM_QUESTIONS.every((question) => question.exam.verified && /^https:\/\//.test(question.exam.sourceUrl))).toBe(true);
    expect(EXAM_QUESTIONS.every((question) => /^https:\/\//.test(question.exam.answerKeyUrl) && question.exam.verificationStatus && question.wording === 'Paraphrase')).toBe(true);
    expect(EXAM_QUESTIONS.find((question) => question.id === 'gate-2023-q16').exam.date).toBe('4 February 2023');
    expect(EXAM_QUESTIONS.find((question) => question.id === 'gate-2024-set2-q45').exam.date).toBe('10 February 2024');
    expect(EXAM_QUESTIONS.filter((question) => question.exam.year === '2001').every((question) => question.exam.date === 'Exact exam date not verified')).toBe(true);
  });
});
