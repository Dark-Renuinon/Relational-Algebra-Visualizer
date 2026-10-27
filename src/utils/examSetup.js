export const EXAM_QUESTION_COUNTS = [5, 10, 15, 20, 25, 50, 60];

export function getExamQuestionCountOptions(availableCount) {
  return EXAM_QUESTION_COUNTS.map((count) => ({
    count,
    disabled: count > availableCount,
  }));
}

/** Select exactly count unique questions using a partial Fisher-Yates shuffle. */
export function selectExamQuestions(questions, count, random = Math.random) {
  if (!EXAM_QUESTION_COUNTS.includes(count)) {
    throw new Error('Choose a supported competitive exam question count.');
  }
  if (!Array.isArray(questions) || questions.length < count) {
    const availableCount = Array.isArray(questions) ? questions.length : 0;
    throw new Error(`Only ${availableCount} question${availableCount === 1 ? '' : 's'} are available for this exam setup.`);
  }

  const uniqueQuestions = [...new Map(questions.map((question) => [question.id, question])).values()];
  if (uniqueQuestions.length < count) {
    throw new Error(`Only ${uniqueQuestions.length} unique question${uniqueQuestions.length === 1 ? ' is' : 's are'} available for this exam setup.`);
  }

  for (let index = 0; index < count; index += 1) {
    const randomIndex = index + Math.floor(random() * (uniqueQuestions.length - index));
    [uniqueQuestions[index], uniqueQuestions[randomIndex]] = [uniqueQuestions[randomIndex], uniqueQuestions[index]];
  }
  return uniqueQuestions.slice(0, count);
}

export function calculateExamScore(questions, answers) {
  const total = questions.length;
  const correct = questions.filter((question) => answers[question.id] === question.answer).length;
  return { correct, total, percentage: total ? Math.round((correct / total) * 100) : 0 };
}

export function getExamProgress(index, total) {
  return { current: total ? index + 1 : 0, total };
}
