import { describe, expect, it } from 'vitest';
import { RESERVE_QUESTION_BANK } from '../src/data/reserveQuestionBank';
import { generateLocalQuizQuestions } from '../src/utils/quizGeneration';

describe('local AI Quiz generation', () => {
  it.each(['Easy', 'Medium', 'Hard'])('selects the requested count at %s difficulty without repeats when available', (difficulty) => {
    const questions = generateLocalQuizQuestions({ count: 5, difficulty, random: () => 0 });
    expect(questions).toHaveLength(5);
    expect(questions.every((question) => question.difficulty === difficulty.toLowerCase())).toBe(true);
    expect(new Set(questions.map((question) => question.prompt)).size).toBe(5);
  });

  it('duplicates eligible local questions only when the bank has too few unique prompts', () => {
    const oneQuestion = [RESERVE_QUESTION_BANK.find((question) => question.difficulty === 'easy')];
    const questions = generateLocalQuizQuestions({ count: 4, difficulty: 'Easy', questionBank: oneQuestion, random: () => 0 });

    expect(questions).toHaveLength(4);
    expect(new Set(questions.map((question) => question.prompt)).size).toBe(1);
    expect(new Set(questions.map((question) => question.id)).size).toBe(4);
  });

  it('shuffles options while keeping the correct option and explanation mapped', () => {
    const source = RESERVE_QUESTION_BANK.find((question) => question.difficulty === 'easy');
    const originalCorrectOption = source.options[source.answer];
    const [question] = generateLocalQuizQuestions({ count: 1, difficulty: 'Easy', questionBank: [source], random: () => 0 });

    expect(question.options).not.toEqual(source.options);
    expect(question.options[question.answer]).toBe(originalCorrectOption);
    expect(question.correctAnswer).toBe(originalCorrectOption);
    expect(question.explanation).toBe(source.explanation);
    expect(question.solution).toEqual(source.solution);
    expect(question.difficulty).toBe(source.difficulty);
  });

  it('rejects invalid counts and a difficulty with no eligible local questions', () => {
    expect(() => generateLocalQuizQuestions({ count: 0, difficulty: 'Easy' })).toThrow('question count');
    expect(() => generateLocalQuizQuestions({ count: 1, difficulty: 'expert', questionBank: RESERVE_QUESTION_BANK })).toThrow('No expert questions');
  });
});
