import { useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { RESERVE_QUESTION_BANK } from '../data/reserveQuestionBank';
import { getExamOptionPresentation } from '../utils/examPresentation';
import { calculateExamScore, getExamProgress, getExamQuestionCountOptions } from '../utils/examSetup';
import { generateExamWithReserve } from '../utils/examGeneration';
import { generateLocalQuizQuestions } from '../utils/quizGeneration';

const LETTERS = ['A', 'B', 'C', 'D'];

function QuizSection() {
  const [count, setCount] = useState('5');
  const [difficulty, setDifficulty] = useState('Easy');
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const current = questions[index];

  async function startQuiz() {
    const amount = Number(count);
    if (!Number.isInteger(amount) || amount < 1 || amount > 20) { setError('Enter a whole number from 1 to 20.'); return; }
    setError(''); setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const nextQuestions = generateLocalQuizQuestions({ count: amount, difficulty });
      setQuestions(nextQuestions); setIndex(0); setCorrect(0); setSelected(null); setSubmitted(false); setPhase('quiz');
    } catch (requestError) { setError(requestError.message || 'Unable to prepare the quiz from the local question bank.'); }
    finally { setLoading(false); }
  }

  function submitAnswer() {
    if (selected === null || submitted) return;
    setSubmitted(true);
    if (selected === current.answer) setCorrect((score) => score + 1);
  }
  function nextQuestion() {
    if (index + 1 === questions.length) setPhase('results');
    else { setIndex((value) => value + 1); setSelected(null); setSubmitted(false); }
  }
  function restart() { setIndex(0); setCorrect(0); setSelected(null); setSubmitted(false); setPhase('quiz'); }

  return <section className="content-section practice-section quiz-section" id="quiz" aria-labelledby="quiz-heading">
    <div className="section-heading section-heading-wide"><div><span className="eyebrow">Gemini generated practice</span><h2 id="quiz-heading">AI Quiz</h2><p>Build a focused multiple-choice quiz across relational algebra and DBMS concepts.</p></div><span className="practice-count">AI assisted</span></div>
    {phase === 'setup' && !loading && <div className="quiz-setup">
      <label>Number of questions <input type="number" min="1" max="20" step="1" value={count} onChange={(event) => setCount(event.target.value)} /></label>
      <label>Difficulty <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
      <button className="accent-control" type="button" onClick={startQuiz}>Start Quiz</button>
    </div>}
    {phase === 'setup' && loading && <div className="quiz-loading" role="status" aria-live="polite"><strong>Fetching API</strong><progress aria-label="Quiz preparation" /></div>}
    {error && <div className="quiz-error" role="alert"><span>{error}</span><button type="button" onClick={startQuiz} disabled={loading}>Retry</button></div>}
    {phase === 'quiz' && current && <>
      <div className="practice-progress"><div><span>Question {index + 1} of {questions.length}</span><span>{correct} correct</span></div><progress value={index + 1} max={questions.length} aria-label="Question progress" /></div>
      <article className="question-card"><div className="question-meta"><span>Relational algebra and DBMS</span><span>{difficulty}</span></div><h3>{current.prompt}</h3>
        <div className="answer-options" role="radiogroup" aria-label="Answer options">{current.options.map((option, i) => <button key={option} type="button" role="radio" aria-checked={selected === i} className={`answer-option ${submitted && i === current.answer ? 'is-correct' : ''} ${submitted && selected === i && i !== current.answer ? 'is-incorrect' : ''}`} onClick={() => !submitted && setSelected(i)} disabled={submitted}><span className="option-letter">{LETTERS[i]}</span><span>{option}</span></button>)}</div>
        {submitted && <div className={`answer-feedback ${selected === current.answer ? 'feedback-success' : 'feedback-error'}`} aria-live="polite"><strong>{selected === current.answer ? 'Yes, you have correctly answered the question.' : 'Yet to answer correctly.'}</strong><p>Correct answer: {LETTERS[current.answer]}. {current.options[current.answer]}</p><p>{current.solution[0]}</p></div>}
      </article>
      <div className="practice-controls">{!submitted ? <button className="accent-control" type="button" onClick={submitAnswer} disabled={selected === null}>Submit answer</button> : <button className="accent-control" type="button" onClick={nextQuestion}>{index + 1 === questions.length ? 'See results' : 'Next Question'}</button>}</div>
    </>}
    {phase === 'results' && <div className="practice-results"><span className="eyebrow">Quiz complete</span><h3>{correct} / {questions.length} correct</h3><p>{correct === questions.length ? 'Excellent work—your understanding is strong across this set.' : correct >= Math.ceil(questions.length / 2) ? 'Good progress. Review the explanations for missed answers and try another set.' : 'Use the explanations to revisit the key concepts, then try again.'}</p><div className="result-metrics"><div><strong>{correct}</strong><span>Correct</span></div><div><strong>{questions.length - correct}</strong><span>Incorrect</span></div><div><strong>{Math.round(correct / questions.length * 100)}%</strong><span>Score</span></div></div><div className="practice-controls"><button type="button" className="accent-control" onClick={restart}>Restart Quiz</button><button type="button" onClick={() => { setPhase('setup'); setQuestions([]); setError(''); }}>Return</button></div></div>}
  </section>;
}

function ExamSection() {
  const [topic, setTopic] = useState('All topics');
  const [difficulty, setDifficulty] = useState('All difficulties');
  const [provenance, setProvenance] = useState('All provenance');
  const [search, setSearch] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedId, setSelectedId] = useState(RESERVE_QUESTION_BANK[0]?.id);
  const [attemptQuestions, setAttemptQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const topics = useMemo(() => [...new Set(RESERVE_QUESTION_BANK.map((question) => question.topic))].sort(), []);
  const filtered = useMemo(() => RESERVE_QUESTION_BANK.filter((question) => {
    const type = question.sourceType === 'verified-exam' ? 'verified-exam' : question.sourceType === 'adapted-exam' ? 'adapted-exam' : 'exam-style-practice';
    const query = search.trim().toLowerCase();
    return (topic === 'All topics' || question.topic === topic) && (difficulty === 'All difficulties' || question.difficulty === difficulty) && (provenance === 'All provenance' || type === provenance) && (!query || `${question.prompt} ${question.topic} ${question.exam?.exam || ''}`.toLowerCase().includes(query));
  }), [topic, difficulty, provenance, search]);
  const availableQuestions = useMemo(() => [...new Map(filtered.map((question) => [question.id, question])).values()], [filtered]);
  const attemptIds = attemptQuestions.map((question) => question.id);
  const questionCountOptions = getExamQuestionCountOptions(availableQuestions.length);
  const selectedCountAvailable = questionCount <= availableQuestions.length;
  const started = attemptIds.length > 0;
  const visibleQuestions = started ? attemptQuestions : filtered;
  const current = visibleQuestions.find((question) => question.id === selectedId) || visibleQuestions[0];
  const selectedAnswer = current ? answers[current.id] : undefined;
  const currentIndex = current ? visibleQuestions.findIndex((question) => question.id === current.id) : -1;
  const progress = getExamProgress(currentIndex, attemptIds.length);
  const answeredCount = attemptIds.filter((id) => answers[id] !== undefined).length;
  const score = submitted ? calculateExamScore(attemptQuestions, answers) : null;
  const labelFor = (question) => question.sourceType === 'verified-exam' ? `Verified previous-year · ${question.exam.exam} ${question.exam.year}` : question.sourceType === 'adapted-exam' ? 'Adapted previous-year question' : 'Exam-style practice';

  async function startExam() {
    if (!selectedCountAvailable) return;
    setLoading(true);
    try {
      const requestedDifficulty = difficulty === 'All difficulties' ? 'all' : difficulty;
      const searchTerm = search.trim().toLowerCase();
      const promptTopic = [topic === 'All topics' ? 'Relational Algebra' : topic, search.trim() ? `focus: ${search.trim()}` : ''].filter(Boolean).join('; ').slice(0, 200);
      const assembledQuestions = await generateExamWithReserve({
        count: questionCount,
        difficulty: requestedDifficulty,
        reserveQuestions: availableQuestions,
        includeGemini: provenance !== 'verified-exam' && provenance !== 'adapted-exam',
        matchesGeminiQuestion: (question) => {
          const matchesTopic = topic === 'All topics' || question.topic.toLowerCase() === topic.toLowerCase() || question.prompt.toLowerCase().includes(topic.toLowerCase());
          const matchesSearch = !searchTerm || `${question.prompt} ${question.topic}`.toLowerCase().includes(searchTerm);
          return matchesTopic && matchesSearch;
        },
        requestGemini: async ({ count, difficulty: requestedLevel }) => {
          const { data, error: invokeError } = await supabase.functions.invoke('gemini-tutor', {
            body: {
              action: 'generateExamQuestions',
              topic: promptTopic,
              difficulty: requestedLevel === 'all' ? 'All' : requestedLevel[0].toUpperCase() + requestedLevel.slice(1),
              count,
            },
            // A single client deadline cancels the outstanding Edge Function call
            // and lets the local reserve bank assemble the exam immediately.
            signal,
          });
          if (invokeError) throw invokeError;
          return data;
        },
      });
      setAttemptQuestions(assembledQuestions);
      setAnswers({});
      setSelectedId(assembledQuestions[0]?.id);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  function startNewExam() {
    setAttemptQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setSelectedId(filtered[0]?.id);
  }

  function chooseAnswer(optionIndex) {
    if (!started || submitted || !current) return;
    setAnswers((previous) => ({ ...previous, [current.id]: optionIndex }));
  }

  function moveQuestion(offset) {
    const nextQuestion = visibleQuestions[currentIndex + offset];
    if (nextQuestion) setSelectedId(nextQuestion.id);
  }

  return <section className="content-section practice-section exam-section" id="competitive-exams" aria-labelledby="exams-heading">
    <div className="section-heading section-heading-wide"><div><span className="eyebrow">Exam mode</span><h2 id="exams-heading">Competitive Exam Practice</h2><p>Offline reserve questions plus Gemini-generated questions. Answers and explanations appear after final submission.</p></div></div>
    <div className="exam-filters"><label>Search <input type="search" disabled={started || loading} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions or topics" /></label><label>Topic <select disabled={started || loading} value={topic} onChange={(event) => setTopic(event.target.value)}><option>All topics</option>{topics.map((item) => <option key={item}>{item}</option>)}</select></label><label>Difficulty <select disabled={started || loading} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>All difficulties</option>{['easy','medium','hard'].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label><label>Provenance <select disabled={started || loading} value={provenance} onChange={(event) => setProvenance(event.target.value)}><option value="All provenance">All provenance</option><option value="verified-exam">Verified previous-year</option><option value="adapted-exam">Adapted previous-year</option><option value="exam-style-practice">Exam-style practice</option></select></label><label>Number of Questions <select disabled={started || loading} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>{questionCountOptions.map(({ count, disabled }) => <option key={count} value={count} disabled={disabled}>{count} questions{disabled ? ` (only ${availableQuestions.length} available)` : ''}</option>)}</select></label></div>
    {!started && availableQuestions.length < questionCount && <p className="exam-count-validation" role="status">Only {availableQuestions.length} unique questions match these filters. Choose an available question count to continue.</p>}
    <div className="exam-start-controls">{!started ? <button type="button" className="accent-control" onClick={startExam} disabled={!selectedCountAvailable || loading}>{loading ? 'Generating with Gemini…' : `Start exam (${questionCount} questions)`}</button> : submitted ? <><strong className="exam-score" role="status">Final score: {score.correct} / {score.total} ({score.percentage}%)</strong><button type="button" className="accent-control" onClick={startNewExam}>Start new exam</button></> : <><span>Answered {answeredCount} / {attemptIds.length}</span><button type="button" className="accent-control" onClick={() => setSubmitted(true)} disabled={answeredCount !== attemptIds.length}>Submit exam</button></>}</div>
    <div className="exam-browser"><div className="exam-question-list" aria-label="Question results">{visibleQuestions.map((question, index) => <button type="button" key={question.id} className={question.id === current?.id ? 'active' : ''} onClick={() => setSelectedId(question.id)}><span>{index + 1}. {question.topic}</span><small>{question.difficulty} · {labelFor(question)}{started && answers[question.id] !== undefined ? ' · Answered' : ''}</small><strong>{question.prompt}</strong></button>)}{!visibleQuestions.length && <div className="empty-state">No questions match these filters.</div>}</div>
      {current ? <article className="exam-detail"><div className="question-meta"><span>{current.topic}</span><span>{current.difficulty}</span></div>{started && <div className="practice-progress"><span>Question {progress.current} of {progress.total}</span></div>}<h3>{current.prompt}</h3><div className="answer-options" role="radiogroup" aria-label="Answer options">{current.options.map((option, index) => {
        const presentation = getExamOptionPresentation(index, current.answer, selectedAnswer, submitted);
        const optionClass = [
          'answer-option',
          presentation.selected && !submitted ? 'is-selected' : '',
          presentation.isCorrect ? 'is-correct' : '',
          presentation.isIncorrect ? 'is-incorrect' : '',
        ].filter(Boolean).join(' ');
        return <button key={option} type="button" role="radio" aria-checked={presentation.selected} className={optionClass} disabled={!started || submitted} onClick={() => chooseAnswer(index)}><span className="option-letter">{LETTERS[index]}</span><span>{option}</span>{submitted && presentation.isCorrect && <b>Correct answer</b>}{submitted && presentation.isIncorrect && <b>Incorrect</b>}</button>;
      })}</div>{submitted && <div className={`answer-feedback ${selectedAnswer === current.answer ? 'feedback-success' : 'feedback-error'}`} aria-live="polite"><strong>{selectedAnswer === current.answer ? 'Correct.' : 'Incorrect.'}</strong><p>Correct answer: {LETTERS[current.answer]}. {current.options[current.answer]}</p></div>}<div className="exam-provenance"><strong>{labelFor(current)}</strong>{current.sourceType === 'verified-exam' ? <><span>{current.paper} · Question {current.questionNumber} · {current.wording?.toLowerCase()}</span><small>{current.exam.verificationStatus}</small><a href={current.exam.sourceUrl} target="_blank" rel="noreferrer">Open question source ↗</a>{submitted && <a href={current.exam.answerKeyUrl} target="_blank" rel="noreferrer">Open answer reference ↗</a>}</> : <span>Original practice item, written for exam preparation. No exam or year attribution is claimed.</span>}</div>{submitted && <details className="solution-panel"><summary>Step-by-step solution</summary><ol>{current.solution.map((step, index) => <li key={index}>{step}</li>)}</ol></details>}{started && !submitted && <div className="practice-controls"><button type="button" onClick={() => moveQuestion(-1)} disabled={currentIndex <= 0}>Previous question</button><button type="button" onClick={() => moveQuestion(1)} disabled={currentIndex < 0 || currentIndex + 1 >= attemptIds.length}>Next question</button></div>}</article> : <div className="empty-state">Choose filters, then start an exam to answer questions.</div>}</div>
  </section>;
}

export default function PracticeHub({ kind }) { return kind === 'quiz' ? <QuizSection /> : <ExamSection />; }
