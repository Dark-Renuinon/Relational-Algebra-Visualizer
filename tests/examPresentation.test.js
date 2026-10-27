import { describe, expect, it } from 'vitest';
import { ALL_EXAM_QUESTIONS } from '../src/data/questionBank';
import { getExamOptionPresentation } from '../src/utils/examPresentation';

describe('competitive exam answer presentation', () => {
  it('shows a selected option without revealing correct or incorrect status before final submission', () => {
    expect(getExamOptionPresentation(2, 2, 2, false)).toEqual({ selected: true, isCorrect: false, isIncorrect: false });
    expect(getExamOptionPresentation(1, 2, 1, false)).toEqual({ selected: true, isCorrect: false, isIncorrect: false });
    expect(getExamOptionPresentation(2, 2, 1, false)).toEqual({ selected: false, isCorrect: false, isIncorrect: false });
  });

  it('reveals correctness only after final submission', () => {
    expect(getExamOptionPresentation(2, 2, 1, true)).toEqual({ selected: false, isCorrect: true, isIncorrect: false });
    expect(getExamOptionPresentation(1, 2, 1, true)).toEqual({ selected: true, isCorrect: false, isIncorrect: true });
    expect(getExamOptionPresentation(2, 2, 2, true)).toEqual({ selected: true, isCorrect: true, isIncorrect: false });
  });

  it('keeps every competitive exam question type neutral before submission', () => {
    expect(ALL_EXAM_QUESTIONS.length).toBeGreaterThan(0);
    for (const question of ALL_EXAM_QUESTIONS) {
      for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
        expect(getExamOptionPresentation(optionIndex, question.answer, undefined, false)).toMatchObject({
          isCorrect: false,
          isIncorrect: false,
        });
      }
    }
  });
});
