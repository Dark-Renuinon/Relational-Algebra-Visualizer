/** Keep correctness feedback hidden until an exam has been finally submitted. */
export function getExamOptionPresentation(optionIndex, correctIndex, selectedIndex, submitted) {
  const selected = selectedIndex === optionIndex;
  const isCorrect = Boolean(submitted && optionIndex === correctIndex);
  const isIncorrect = Boolean(submitted && selected && optionIndex !== correctIndex);
  return { selected, isCorrect, isIncorrect };
}
