import { useMemo, useState } from 'react';
import { getQuestions } from '../data/questionBank';
import { getExamOptionPresentation } from '../utils/examPresentation';

const LEVELS = ['easy', 'medium', 'hard'];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function PracticeSection({ kind }) {
  const isQuiz = kind === 'quiz';
  const [difficulty, setDifficulty] = useState('easy');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [solved, setSolved] = useState({});
  const [attempts, setAttempts] = useState({});
  const [finished, setFinished] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const questions = useMemo(() => getQuestions(isQuiz ? 'quiz' : 'exam', difficulty), [isQuiz, difficulty]);
  const question = questions[index];
  const key = `${difficulty}:${question?.id}`;
  const answered = answers[key];
  const isSolved = Boolean(solved[key]);
  const attemptedCount = Object.values(attempts).filter((count) => count > 0).length;
  const score = Object.values(solved).filter(Boolean).length;
  const percent = questions.length ? Math.round((score / questions.length) * 100) : 0;

  function selectDifficulty(level) {
    setDifficulty(level);
    setIndex(0);
    setFinished(false);
    setReviewId(null);
    setAnswers({});
    setSolved({});
    setAttempts({});
  }

  function chooseAnswer(optionIndex) {
    if (!question || (isQuiz && isSolved) || (!isQuiz && answered !== undefined)) return;
    setAttempts((previous) => ({ ...previous, [key]: (previous[key] || 0) + 1 }));
    if (optionIndex === question.answer) {
      setAnswers((previous) => ({ ...previous, [key]: optionIndex }));
      setSolved((previous) => ({ ...previous, [key]: true }));
    } else if (!isQuiz) {
      setAnswers((previous) => ({ ...previous, [key]: optionIndex }));
    }
  }

  function moveNext() {
    if (reviewId) setReviewId(null);
    if (index === questions.length - 1) setFinished(true);
    else setIndex((current) => current + 1);
  }

  function restart() {
    setIndex(0);
    setFinished(false);
    setReviewId(null);
    setAnswers({});
    setSolved({});
    setAttempts({});
  }

  const reviewQuestion = reviewId ? questions.find((item) => item.id === reviewId) : null;
  const displayed = reviewQuestion || question;
  const displayedKey = displayed ? `${difficulty}:${displayed.id}` : '';
  const displayedAnswer = answers[displayedKey];
  const revealExamAnswer = !isQuiz && Boolean(reviewQuestion);

  return (
    <section className={`content-section practice-section ${isQuiz ? 'quiz-section' : 'exam-section'}`} id={isQuiz ? 'quiz' : 'competitive-exams'} aria-labelledby={`${kind}-heading`}>
      <div className="section-heading section-heading-wide">
        <div><span className="eyebrow">{isQuiz ? 'Retry practice' : 'GATE past questions'}</span><h2 id={`${kind}-heading`}>{isQuiz ? 'Quiz' : 'Competitive Exams'}</h2>
          <p>{isQuiz ? 'Practice relational algebra and DBMS concepts. Wrong attempts stay neutral; open the solution any time.' : 'Practice paraphrased GATE past-paper questions with source and answer-key references.'}</p>
        </div>
        <span className="practice-count">{isQuiz ? 'Practice bank' : 'Source-backed'}</span>
      </div>

      <div className="difficulty-picker" role="group" aria-label={`${isQuiz ? 'Quiz' : 'Exam'} difficulty`}>
        <strong>Difficulty</strong>{LEVELS.map((level) => <button type="button" key={level} aria-pressed={difficulty === level} className={difficulty === level ? 'active' : ''} onClick={() => selectDifficulty(level)}>{level[0].toUpperCase() + level.slice(1)} <span>{getQuestions(isQuiz ? 'quiz' : 'exam', level).length}</span></button>)}
      </div>

      {!isQuiz && questions.length > 0 && questions.length < 10 && <p className="limited-content-note" role="status">{questions.length} verified single-answer question{questions.length === 1 ? '' : 's'} available at this difficulty. Only questions with a checked source and answer reference are included.</p>}

      {finished ? <div className="practice-results" aria-live="polite">
        <span className="eyebrow">Practice complete</span><h3>{score} / {questions.length} correct</h3>
        <p>{percent}% accuracy across {attemptedCount} attempted question{attemptedCount === 1 ? '' : 's'}. {score === questions.length ? 'Excellent work.' : score > 0 ? 'Review any missed questions and try again.' : 'Use the solutions to review the key ideas.'}</p>
        <div className="result-metrics"><div><strong>{score}</strong><span>Correct</span></div><div><strong>{attemptedCount}</strong><span>Attempted</span></div><div><strong>{percent}%</strong><span>Accuracy</span></div></div>
        <h4>Review attempted questions</h4>
        <div className="review-list">{questions.filter((item) => (attempts[`${difficulty}:${item.id}`] || 0) > 0).map((item, i) => <button type="button" key={item.id} onClick={() => { setReviewId(item.id); setFinished(false); setIndex(questions.indexOf(item)); }}><span>{solved[`${difficulty}:${item.id}`] ? '✓' : '•'}</span> {i + 1}. {item.topic} — {item.prompt}</button>)}</div>
        <div className="practice-controls"><button type="button" className="accent-control" onClick={restart}>Retry this difficulty</button><label>Choose another difficulty from the selector above.</label></div>
      </div> : !displayed ? <div className="empty-state">There are no verified questions for this difficulty yet. Choose another difficulty.</div> : <>
        <div className="practice-progress"><div><span>{reviewQuestion ? 'Review' : `Question ${index + 1} of ${questions.length}`}</span><span>{isQuiz || revealExamAnswer ? `${score} correct` : `${Object.values(attempts).filter((count) => count > 0).length} attempted`}</span></div><progress value={index + 1} max={questions.length} aria-label="Question progress" /></div>
        {!isQuiz && <div className="exam-provenance"><strong>{displayed.exam.exam} {displayed.exam.year}</strong><span>{displayed.exam.date} · {displayed.exam.session} · {displayed.paper} · Question {displayed.questionNumber}</span><small>Topic: {displayed.topic} · Difficulty: {difficulty} · Wording: {displayed.wording?.toLowerCase()}.</small><small>Verification: {displayed.exam.verificationStatus}</small><div><a href={displayed.exam.sourceUrl} target="_blank" rel="noreferrer">{displayed.citationLabel} ↗</a>{revealExamAnswer && <> · <a href={displayed.exam.answerKeyUrl} target="_blank" rel="noreferrer">Answer / solution reference ↗</a></>}{displayed.exam.scheduleUrl && <> · <a href={displayed.exam.scheduleUrl} target="_blank" rel="noreferrer">Official exam schedule ↗</a></>}</div></div>}
        <article className="question-card" key={displayed.id}>
          <div className="question-meta"><span>{displayed.topic}</span><span>{difficulty}</span></div>
          <h3>{displayed.prompt}</h3>
          <div className="answer-options" role="group" aria-label="Answer options">{displayed.options.map((option, optionIndex) => {
            const selected = displayedAnswer === optionIndex;
            const presentation = getExamOptionPresentation(optionIndex, displayed.answer, displayedAnswer, revealExamAnswer);
            const isQuizCorrect = isQuiz && isSolved && optionIndex === displayed.answer;
            const stateClass = [isQuizCorrect || presentation.isCorrect ? 'is-correct' : '', presentation.isIncorrect ? 'is-incorrect' : '', !isQuiz && selected && !revealExamAnswer ? 'is-selected' : ''].filter(Boolean).join(' ');
            return <button type="button" key={option} className={`answer-option ${stateClass}`} onClick={() => chooseAnswer(optionIndex)} disabled={isQuiz ? isSolved : displayedAnswer !== undefined} aria-pressed={selected}><span className="option-letter">{LETTERS[optionIndex]}</span><span>{option}</span>{(isQuizCorrect || (revealExamAnswer && presentation.isCorrect)) && <b>Correct</b>}{revealExamAnswer && presentation.isIncorrect && <b>Incorrect</b>}</button>;
          })}</div>

          <div className={`answer-feedback ${isQuiz ? (isSolved ? 'feedback-success' : attempts[key] ? 'feedback-neutral' : '') : (!revealExamAnswer || answered === undefined ? '' : answered === displayed.answer ? 'feedback-success' : 'feedback-error')}`} aria-live="polite">
            {isQuiz ? (isSolved ? <><strong>✓ Correct!</strong> Nice work — continue when you’re ready.</> : attempts[key] ? 'Not quite! Try again.' : '') : !revealExamAnswer || answered === undefined ? '' : answered === displayed.answer ? 'Correct — well done.' : <>That answer is incorrect. The correct answer is <strong>{LETTERS[displayed.answer]}. {displayed.options[displayed.answer]}</strong></>}
          </div>

          {(isQuiz || revealExamAnswer) && <details className="solution-panel"><summary>{isQuiz ? 'View Step-by-Step Solution' : 'View Step-by-Step Answer Key & Solution'}</summary>
            {!isQuiz && <p className="solution-answer"><strong>Answer: {LETTERS[displayed.answer]}. {displayed.options[displayed.answer]}</strong></p>}
            <ol>{displayed.solution.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>
            {displayed.distractors?.length > 0 && <p className="solution-note"><strong>Option check:</strong> {displayed.distractors.join(' ')}</p>}
            {!isQuiz && <p className="solution-note"><strong>Provenance:</strong> {displayed.exam.exam} {displayed.exam.year}; {displayed.exam.date}; {displayed.exam.session}; {displayed.paper}; question {displayed.questionNumber}; wording is {displayed.wording?.toLowerCase()}. {displayed.exam.verificationStatus}. <a href={displayed.exam.sourceUrl} target="_blank" rel="noreferrer">Open source paper</a> · <a href={displayed.exam.answerKeyUrl} target="_blank" rel="noreferrer">Open answer / solution reference</a>{displayed.exam.scheduleUrl && <> · <a href={displayed.exam.scheduleUrl} target="_blank" rel="noreferrer">Open official schedule</a></>}.</p>}
          </details>}
        </article>
        <div className="practice-controls">
          <button type="button" onClick={() => { setReviewId(null); setIndex((current) => Math.max(0, current - 1)); }} disabled={index === 0}>Previous</button>
          <button type="button" onClick={moveNext} disabled={isQuiz ? !isSolved : answered === undefined}>{index === questions.length - 1 ? 'Finish practice' : 'Next question'}</button>
          {reviewQuestion && <button type="button" onClick={() => { setReviewId(null); setFinished(true); }}>Back to results</button>}
        </div>
      </>}
    </section>
  );
}
