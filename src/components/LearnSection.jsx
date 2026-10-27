import { useState } from 'react';

const STUDENT_COLUMNS = ['StudentID', 'Name', 'Age', 'Department'];
const STUDENT_ROWS = [[1, 'Arun', 20, 'CSE'], [2, 'Beena', 22, 'CSE'], [3, 'Chitra', 19, 'ECE']];

const OPERATIONS = [
  {
    id: 'selection', name: 'Selection', symbol: 'σ', short: 'Choose rows',
    problem: 'Use it when you know which records you want but need to filter out the rest.',
    concept: 'Selection is a row filter. It tests every tuple against a condition and keeps only the tuples for which that condition is true.',
    syntax: 'σ Age > 20 (STUDENT)', syntaxMeaning: 'Read this as: “from STUDENT, keep rows whose Age is greater than 20.”',
    inputs: [{ label: 'STUDENT', columns: STUDENT_COLUMNS, rows: STUDENT_ROWS }],
    output: { label: 'Selected STUDENT', columns: STUDENT_COLUMNS, rows: [[2, 'Beena', 22, 'CSE']] },
    rowEffect: 'Rows can decrease; columns stay exactly the same.', columnEffect: 'No columns are removed or added.',
    note: 'RAV accepts =, !=, <>, >, >=, <, <= and combines comparisons with AND or OR. NOT is not part of the current visualizer grammar.',
    mistake: 'Do not use σ when you only want fewer columns—that is projection.', runnable: 'σ Age > 20 (STUDENT)'
  },
  {
    id: 'projection', name: 'Projection', symbol: 'π', short: 'Choose columns',
    problem: 'Use it when the answer needs only particular attributes, such as names rather than every student detail.',
    concept: 'Projection is a column selector. It forms new tuples from just the named attributes and removes duplicate tuples because relations use set semantics.',
    syntax: 'π Name, Age (STUDENT)', syntaxMeaning: 'Read this as: “from STUDENT, keep only Name and Age.”',
    inputs: [{ label: 'STUDENT', columns: STUDENT_COLUMNS, rows: STUDENT_ROWS }],
    output: { label: 'Projected STUDENT', columns: ['Name', 'Age'], rows: [['Arun', 20], ['Beena', 22], ['Chitra', 19]] },
    rowEffect: 'The tuple count may decrease if projected values become duplicates.', columnEffect: 'Only the requested columns remain.',
    note: 'RAV validates every requested attribute and removes duplicate output tuples.',
    mistake: 'Do not expect π to filter by a condition. Use σ for conditions, then π for the columns you want.', runnable: 'π Name, Age (STUDENT)'
  },
  {
    id: 'union', name: 'Union', symbol: '∪', short: 'Combine compatible rows',
    problem: 'Use it when two relations describe the same kind of thing and you want every tuple from either one.',
    concept: 'Union combines the rows in the left relation with the rows in the right relation. A repeated tuple appears once.',
    syntax: 'CSE_STUDENTS ∪ ECE_STUDENTS', syntaxMeaning: 'Both inputs must have matching attributes in matching order.',
    inputs: [{ label: 'CSE_STUDENTS', columns: ['StudentID', 'Name'], rows: [[1, 'Arun'], [2, 'Beena']] }, { label: 'ECE_STUDENTS', columns: ['StudentID', 'Name'], rows: [[3, 'Chitra'], [4, 'Deepak']] }],
    output: { label: 'Students in either group', columns: ['StudentID', 'Name'], rows: [[1, 'Arun'], [2, 'Beena'], [3, 'Chitra'], [4, 'Deepak']] },
    rowEffect: 'Rows from either input can appear; duplicates are removed.', columnEffect: 'The common schema is kept.',
    note: 'Conceptually, union-compatible relations have the same schema and compatible domains. RAV checks matching attribute names and order.',
    mistake: 'Having the same number of columns is not enough if the corresponding attribute names differ.', runnable: 'CSE_STUDENTS ∪ ECE_STUDENTS'
  },
  {
    id: 'difference', name: 'Set Difference', symbol: '−', short: 'Find rows in the left only',
    problem: 'Use it to ask what is in one compatible relation but absent from another.',
    concept: 'A − B keeps tuples found in A that are not found in B. The order matters.',
    syntax: 'STUDENT − CSE_STUDENTS', syntaxMeaning: 'Start with the left relation, then remove matching tuples from the right relation.',
    inputs: [{ label: 'A', columns: ['Name'], rows: [['Arun'], ['Beena'], ['Chitra']] }, { label: 'B', columns: ['Name'], rows: [['Arun'], ['Beena']] }],
    output: { label: 'A − B', columns: ['Name'], rows: [['Chitra']] },
    rowEffect: 'Rows can only come from the left input.', columnEffect: 'The compatible schema is kept.',
    note: 'Like union, RAV requires compatible schemas before it evaluates difference.',
    mistake: 'A − B is not the same as B − A; reverse the inputs and you ask a different question.', runnable: 'STUDENT − CSE_STUDENTS'
  },
  {
    id: 'intersection', name: 'Intersection', symbol: '∩', short: 'Find common rows',
    problem: 'Use it when you need the tuples that occur in both compatible relations.',
    concept: 'Intersection keeps only the overlap: rows that appear in the left input and in the right input.',
    syntax: 'STUDENT ∩ CSE_STUDENTS', syntaxMeaning: 'The two input schemas must be compatible.',
    inputs: [{ label: 'A', columns: ['Name'], rows: [['Arun'], ['Beena'], ['Chitra']] }, { label: 'B', columns: ['Name'], rows: [['Arun'], ['Beena']] }],
    output: { label: 'A ∩ B', columns: ['Name'], rows: [['Arun'], ['Beena']] },
    rowEffect: 'Only rows shared by both inputs remain.', columnEffect: 'The compatible schema is kept.',
    note: 'Intersection is implemented in RAV and uses the same compatibility rule as union and difference.',
    mistake: 'An empty intersection is still a valid result—it means the two inputs have no tuples in common.', runnable: 'STUDENT ∩ CSE_STUDENTS'
  },
  {
    id: 'product', name: 'Cartesian Product', symbol: '×', short: 'Pair every row with every row',
    problem: 'Use it when every possible pair is meaningful, or as the conceptual building block behind a join.',
    concept: 'Cartesian product pairs every tuple from the left relation with every tuple from the right relation. If A has 2 rows and B has 3 rows, A × B has 6 rows.',
    syntax: 'FACULTY × COURSE', syntaxMeaning: 'RAV pairs every FACULTY row with every COURSE row.',
    inputs: [{ label: 'A', columns: ['Advisor'], rows: [['Meera'], ['Ravi']] }, { label: 'B', columns: ['Club'], rows: [['DBMS'], ['AI'], ['Web']] }],
    output: { label: 'A × B', columns: ['Advisor', 'Club'], rows: [['Meera', 'DBMS'], ['Meera', 'AI'], ['Meera', 'Web'], ['Ravi', 'DBMS'], ['Ravi', 'AI'], ['Ravi', 'Web']] },
    rowEffect: 'The row count multiplies: left rows × right rows.', columnEffect: 'Columns from both inputs are included; RAV qualifies colliding names.',
    note: 'The bundled RAV example has 3 FACULTY rows and 4 COURSE rows, so its product has 12 rows.',
    mistake: 'Product does not look for matching values. A join adds the matching condition.', runnable: 'FACULTY × COURSE'
  },
  {
    id: 'rename', name: 'Rename', symbol: 'ρ', short: 'Give a relation an alias',
    problem: 'Use it to make an intermediate result easier to refer to or to avoid relation-name ambiguity.',
    concept: 'Rename changes a relation label without changing the tuples inside it.',
    syntax: 'ρ LEARNER (STUDENT)', syntaxMeaning: 'The resulting relation is named LEARNER and contains the STUDENT tuples.',
    inputs: [{ label: 'STUDENT', columns: ['StudentID', 'Name'], rows: [[1, 'Arun'], [2, 'Beena']] }],
    output: { label: 'LEARNER', columns: ['StudentID', 'Name'], rows: [[1, 'Arun'], [2, 'Beena']] },
    rowEffect: 'No rows change.', columnEffect: 'No columns change in the RAV implementation.',
    note: 'Standard relational algebra can also rename attributes. RAV currently supports relation aliases only, so its syntax supplies one new relation name.',
    mistake: 'Rename does not create a copied table or filter data; it only changes the relation label.', runnable: 'ρ LEARNER (STUDENT)'
  },
  {
    id: 'theta-join', name: 'Theta / Equi Join', symbol: '⋈', short: 'Combine related rows by a condition',
    problem: 'Use it when information is split across two relations and a condition tells you which rows belong together.',
    concept: 'A theta join combines pairs that satisfy its condition. When the condition uses equality, it is commonly called an equi join.',
    syntax: 'STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE', syntaxMeaning: 'RAV also accepts standard subscript notation: STUDENT ⋈_{STUDENT.CourseID = COURSE.CourseID} COURSE.',
    inputs: [{ label: 'STUDENT', columns: ['StudentID', 'Name', 'CourseID'], rows: [[1, 'Arun', 'CS101'], [2, 'Beena', 'CS102']] }, { label: 'COURSE', columns: ['CourseID', 'CourseName'], rows: [['CS101', 'Database Systems'], ['CS102', 'Algorithms']] }],
    output: { label: 'Joined result', columns: ['StudentID', 'Name', 'STUDENT.CourseID', 'COURSE.CourseID', 'CourseName'], rows: [[1, 'Arun', 'CS101', 'CS101', 'Database Systems'], [2, 'Beena', 'CS102', 'CS102', 'Algorithms']] },
    rowEffect: 'Only paired rows that make the condition true remain.', columnEffect: 'Columns from both inputs are retained; duplicate names are qualified.',
    note: 'Use qualified attributes after a join when names collide, for example STUDENT.CourseID.',
    mistake: 'Do not omit the condition or the right relation. A theta join needs both.', runnable: 'STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE'
  },
  {
    id: 'natural-join', name: 'Natural Join', symbol: '⨝', short: 'Join on every shared attribute name',
    problem: 'Use it when two relations deliberately share identically named attributes and every shared name should be matched.',
    concept: 'A natural join automatically compares all common attribute names and retains one copy of each shared attribute in the result.',
    syntax: 'STUDENT ⨝ COURSE', syntaxMeaning: 'No explicit condition is written because the shared attribute names define it.',
    inputs: [{ label: 'STUDENT', columns: ['StudentID', 'Name', 'CourseID', 'Department'], rows: [[1, 'Arun', 'CS101', 'CSE'], [2, 'Beena', 'CS102', 'CSE']] }, { label: 'COURSE', columns: ['CourseID', 'CourseName', 'Department'], rows: [['CS101', 'Database Systems', 'CSE'], ['CS102', 'Algorithms', 'CSE']] }],
    output: { label: 'Natural join result', columns: ['StudentID', 'Name', 'CourseID', 'Department', 'CourseName'], rows: [[1, 'Arun', 'CS101', 'CSE', 'Database Systems'], [2, 'Beena', 'CS102', 'CSE', 'Algorithms']] },
    rowEffect: 'Rows remain only when every shared attribute agrees.', columnEffect: 'Shared columns appear once; other columns are added.',
    note: 'RAV matches every identically named attribute—not only CourseID. Use a theta join if you need an explicit, narrower condition.',
    mistake: 'Do not use a natural join casually when relations share an unrelated column name such as Department.', runnable: 'STUDENT ⨝ COURSE'
  },
  {
    id: 'division', name: 'Division', symbol: '÷', short: 'Find “for every” matches',
    problem: 'Use it for questions such as “which students are enrolled in every required course?”',
    concept: 'Division returns the left-side values that are associated with every tuple in the divisor relation.',
    syntax: 'STUDENT_COURSES ÷ REQUIRED_COURSES', syntaxMeaning: 'The divisor attributes must be present in the dividend.',
    inputs: [{ label: 'STUDENT_COURSES', columns: ['StudentID', 'CourseID'], rows: [[1, 'CS101'], [1, 'CS102'], [2, 'CS101'], [2, 'CS102'], [3, 'CS101']] }, { label: 'REQUIRED_COURSES', columns: ['CourseID'], rows: [['CS101'], ['CS102']] }],
    output: { label: 'Students taking every required course', columns: ['StudentID'], rows: [[1], [2]] },
    rowEffect: 'Only left-side values that match every divisor tuple remain.', columnEffect: 'Divisor attributes are removed from the result.',
    note: 'Division is supported by RAV and is the most direct way to demonstrate the relational-algebra idea of “for all.”',
    mistake: 'Matching just one required course is not enough; a result row must match every divisor row.', runnable: 'STUDENT_COURSES ÷ REQUIRED_COURSES'
  }
];

const REFERENCES = [
  { heading: 'Books', items: [{ label: 'Database System Concepts — Abraham Silberschatz, Henry F. Korth, S. Sudarshan (7th ed.)', href: 'https://www.db-book.com/' }, { label: 'Fundamentals of Database Systems — Ramez Elmasri, Shamkant B. Navathe (7th ed.)', href: 'https://www.pearson.com/en-us/subject-catalog/p/Elmasri-Fundamentals-of-Database-Systems-Instant-Access-7th-Edition/P200000003546/9780133971330' }] },
  { heading: 'Academic course notes', items: [{ label: 'Rensselaer Polytechnic Institute — Relational Model and Algebra notes', href: 'https://www.cs.rpi.edu/~sibel/csci4380/fall2018/course_notes/relational_algebra.html' }] },
  { heading: 'Research / teaching resource', items: [{ label: 'Mior — Relational Playground: Teaching the Duality of Relational Algebra and SQL (arXiv)', href: 'https://arxiv.org/abs/2306.13486' }] },
  { heading: 'Educational video', items: [{ label: 'Relational Algebra video used in this learning section (YouTube)', href: 'https://www.youtube.com/watch?v=z9IceBT2_ws' }] }
];

function ExampleTable({ label, columns, rows }) {
  return <figure className="learn-table-card"><figcaption>{label}</figcaption><div className="learn-table-scroll"><table><thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${label}-${rowIndex}`}>{row.map((value, index) => <td key={`${label}-${rowIndex}-${columns[index]}`}>{value}</td>)}</tr>)}</tbody></table></div></figure>;
}

function OperationLesson({ operation, onTryExpression }) {
  return <article className="operation-lesson" id={operation.id}><details><summary><span className="lesson-symbol" aria-hidden="true">{operation.symbol}</span><span><strong>{operation.name}</strong><small>{operation.short} · Supported by RAV</small></span><span className="lesson-expand" aria-hidden="true">+</span></summary><div className="lesson-body"><div className="lesson-intro"><div><span className="eyebrow">What problem does it solve?</span><p>{operation.problem}</p></div><div><span className="eyebrow">Concept</span><p>{operation.concept}</p></div></div><div className="syntax-card"><span>Syntax accepted by this visualizer</span><code>{operation.syntax}</code><p>{operation.syntaxMeaning}</p></div><div className="operation-example-grid"><div className="operation-inputs"><span className="eyebrow">Input relation{operation.inputs.length > 1 ? 's' : ''}</span>{operation.inputs.map((input) => <ExampleTable key={input.label} {...input} />)}</div><div className="operation-result"><span className="eyebrow">Output relation</span><ExampleTable {...operation.output} /></div></div><div className="lesson-facts"><div><strong>Rows</strong><span>{operation.rowEffect}</span></div><div><strong>Columns</strong><span>{operation.columnEffect}</span></div></div><div className="lesson-callouts"><p><strong>RAV note:</strong> {operation.note}</p><p><strong>Common mistake:</strong> {operation.mistake}</p></div><button type="button" className="secondary-button try-expression" onClick={() => onTryExpression(operation.runnable)}>Try this exact RAV expression →</button></div></details></article>;
}

export default function LearnSection({ onTryExpression }) {
  const [selectedOperation, setSelectedOperation] = useState(OPERATIONS[0].name);
  const selected = OPERATIONS.find((operation) => operation.name === selectedOperation) || OPERATIONS[0];
  const cseQuery = "π Name (σ Department = 'CSE' (STUDENT))";
  return <section className="content-section learn-section" id="learn" aria-labelledby="learn-heading">
    <div className="section-heading section-heading-wide"><div><span className="eyebrow">Learn relational algebra</span><h2 id="learn-heading">From tables to query thinking</h2><p>Relational algebra becomes much easier when you can see every input, operation, and result. This guide starts with the idea, builds the notation, and then lets you send the same expressions straight to RAV.</p></div></div>
    <nav className="learn-map" aria-label="Learn section guide"><a href="#learn-foundation">Foundation</a><a href="#learn-building-blocks">Building blocks</a><a href="#learn-operators">Operators</a><a href="#learn-combining">Complex expressions</a><a href="#learn-sql">RA and SQL</a><a href="#learn-practice">Try it yourself</a></nav>

    <section className="learn-chapter" id="learn-foundation" aria-labelledby="foundation-heading"><div className="chapter-heading"><span>1</span><div><h3 id="foundation-heading">What is Relational Algebra?</h3><p>A formal language for retrieving and transforming data stored in relational databases.</p></div></div><div className="foundation-grid"><article className="theory-card"><h4>Think in transformations</h4><p>A relation is like a table. An operation takes one or more relations as input and produces a <strong>new relation</strong> as output. The output can then be used by another operation.</p><div className="input-output-flow"><span>Input relation(s)</span><b>→</b><span>Operation</span><b>→</b><span>New relation</span></div></article><article className="theory-card"><h4>Closure makes nesting possible</h4><p>Relational algebra is <strong>closed</strong>: every operation returns another relation. That is why a result can flow into the next operation instead of ending the query.</p><div className="closure-flow"><span>STUDENT</span><b>↓</b><span>Selection</span><b>↓</b><span>Filtered STUDENT</span><b>↓</b><span>Projection</span><b>↓</b><span>Selected columns</span></div></article><article className="theory-card"><h4>Why do we need it?</h4><p>Databases hold more rows and columns than one question needs. Relational algebra gives us a precise toolkit to filter rows, select columns, compare sets, combine related tables, and build complex questions from small steps.</p></article></div></section>

    <section className="learn-chapter" id="learn-building-blocks" aria-labelledby="building-heading"><div className="chapter-heading"><span>2</span><div><h3 id="building-heading">Basic building blocks</h3><p>Before using symbols, name the parts of a relation.</p></div></div><div className="building-block-grid"><ExampleTable label="Relation: STUDENT" columns={STUDENT_COLUMNS} rows={STUDENT_ROWS} /><div className="building-definitions"><article><strong>Relation</strong><p>A named table containing data about one kind of thing, such as STUDENT.</p></article><article><strong>Tuple</strong><p>One row: for example <code>(1, Arun, 20, CSE)</code>.</p></article><article><strong>Attribute</strong><p>One column/property, such as <code>Name</code>, <code>Age</code>, or <code>Department</code>.</p></article><article><strong>Domain</strong><p>The valid kind of value for an attribute. Age uses numbers; Department might allow values such as CSE, ECE, or ME.</p></article></div></div></section>

    <section className="learn-chapter" id="learn-operators" aria-labelledby="operators-heading"><div className="chapter-heading"><span>3</span><div><h3 id="operators-heading">Relational Algebra operators</h3><p>RAV supports every operation below. Start with the overview, then open a lesson for a concrete input → expression → result walkthrough.</p></div></div><div className="operator-overview-scroll"><table className="operator-overview"><thead><tr><th>Operator</th><th>Symbol</th><th>Question it answers</th></tr></thead><tbody>{OPERATIONS.map((operation) => <tr key={operation.name}><td><a href={`#${operation.id}`}>{operation.name}</a></td><td><strong>{operation.symbol}</strong></td><td>{operation.short}</td></tr>)}</tbody></table></div><div className="selection-projection-compare"><article><span>σ = ROW FILTER</span><h4>Selection</h4><p><strong>Which rows do I want?</strong> It preserves the columns and tests each tuple against a condition.</p><code>σ Age &gt; 20 (STUDENT)</code></article><article><span>π = COLUMN SELECTOR</span><h4>Projection</h4><p><strong>Which columns do I want?</strong> It preserves only named attributes and may remove duplicate tuples.</p><code>π Name, Age (STUDENT)</code></article></div>
      <div className="operation-explorer"><div><span className="eyebrow">Interactive operation explorer</span><h3>Explore one operation before opening its full lesson</h3></div><div className="operation-chip-list" role="tablist" aria-label="Relational algebra operations">{OPERATIONS.map((operation) => <button type="button" role="tab" aria-selected={selected.name === operation.name} className={selected.name === operation.name ? 'active' : ''} onClick={() => setSelectedOperation(operation.name)} key={operation.name}><b>{operation.symbol}</b>{operation.name}</button>)}</div><article className="operation-detail" aria-live="polite"><div className="operation-symbol" aria-hidden="true">{selected.symbol}</div><div><h4>{selected.name}</h4><p>{selected.concept}</p><dl><div><dt>Solves</dt><dd>{selected.problem}</dd></div><div><dt>RAV syntax</dt><dd><code>{selected.syntax}</code></dd></div><div><dt>Key effect</dt><dd>{selected.rowEffect}</dd></div></dl><div className="explorer-actions"><a href={`#${selected.id}`}>Read the full {selected.name} lesson</a><button type="button" className="secondary-button try-expression" onClick={() => onTryExpression(selected.runnable)}>Try this expression in RAV</button></div></div></article></div>
      <div className="operator-lessons" aria-label="Detailed lessons for supported operations">{OPERATIONS.map((operation) => <OperationLesson key={operation.name} operation={operation} onTryExpression={onTryExpression} />)}</div>
    </section>

    <section className="learn-chapter" id="learn-combining" aria-labelledby="combining-heading"><div className="chapter-heading"><span>4</span><div><h3 id="combining-heading">Combining operations, step by step</h3><p>Read a nested expression from the inside outward. Each completed step gives the next step a new relation to work with.</p></div></div><div className="complex-expression-card"><div><span className="eyebrow">Question</span><h4>Find the names of CSE students</h4><p>The compact expression is:</p><code>{cseQuery}</code><p>Start at <code>STUDENT</code>, apply the inner selection, then project the resulting names.</p></div><div className="nested-steps"><article><span>1</span><div><strong>Input</strong><p>Load STUDENT.</p></div></article><article><span>2</span><div><strong>Selection</strong><p>Keep rows where Department = 'CSE'.</p></div></article><article><span>3</span><div><strong>Projection</strong><p>Keep only Name for the final relation.</p></div></article></div></div><div className="rav-bridge"><div><span className="eyebrow">How RAV makes this visible</span><h4>Use the expression tree, timeline, and result table together</h4><p>RAV parses the expression into a tree, evaluates it bottom-up, records each real intermediate relation, and lets you inspect a selected step. The final timeline step is the final answer—not a hard-coded demonstration.</p></div><div className="rav-bridge-flow"><span>Expression</span><b>→</b><span>Tree</span><b>→</b><span>Timeline</span><b>→</b><span>Intermediate tables</span><b>→</b><span>Final output</span></div></div></section>

    <section className="learn-chapter" id="learn-sql" aria-labelledby="sql-heading"><div className="chapter-heading"><span>5</span><div><h3 id="sql-heading">Relational Algebra vs SQL</h3><p>They are closely related, but they serve different roles.</p></div></div><div className="ra-sql-grid"><article><span className="eyebrow">Relational algebra</span><h4>Describe transformations</h4><code>{cseQuery}</code><p>It explicitly shows the operations and their nesting. This is useful for understanding query processing.</p></article><article><span className="eyebrow">SQL</span><h4>Ask for the result declaratively</h4><code>{"SELECT Name\nFROM STUDENT\nWHERE Department = 'CSE';"}</code><p>SQL is the practical language used to query database systems. Database systems use relational concepts and algebraic transformations during processing and optimization.</p></article></div><p className="learn-note"><strong>In this app:</strong> the Basic SQL tab translates a single-relation <code>SELECT ... FROM ... WHERE ...</code> query into RAV’s relational algebra. Joins, grouping, and other SQL forms are not part of that small browser translator.</p></section>

    <section className="learn-chapter" aria-labelledby="mistakes-heading"><div className="chapter-heading"><span>6</span><div><h3 id="mistakes-heading">Common beginner mistakes</h3><p>Errors are useful clues. RAV’s validation message explains what to check next.</p></div></div><div className="mistakes-grid"><article><strong>σ vs π</strong><p>Selection chooses rows; projection chooses columns.</p></article><article><strong>Incompatible set operations</strong><p>Union, difference, and intersection need matching schemas.</p></article><article><strong>Product is not join</strong><p>Product makes every pair. A join keeps only pairs satisfying a condition.</p></article><article><strong>Reading left to right</strong><p>Use parentheses and begin with the innermost relation or operation.</p></article><article><strong>Unknown attributes</strong><p>Use the Available relations list; after joins, qualify duplicate names.</p></article><article><strong>Empty means failed</strong><p>An empty relation can be the correct answer: no tuple met the rule.</p></article></div></section>

    <section className="learn-chapter learn-practice" id="learn-practice" aria-labelledby="practice-heading"><div><span className="eyebrow">Try it yourself</span><h3 id="practice-heading">Ready to move from theory to a real execution?</h3><p>Load the CSE example into the existing Visualizer, then use the expression tree and processing timeline to inspect the selection and projection one by one.</p></div><button type="button" className="run-button learn-cta" onClick={() => onTryExpression(cseQuery)}>Open Visualizer with this example →</button></section>

    <section className="video-card" aria-labelledby="video-heading"><div><span className="eyebrow">Educational video</span><h3 id="video-heading">See the notation explained</h3><p>This video complements the tutorial and the interactive examples with an explanation of relational-algebra ideas and symbols.</p></div><div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/z9IceBT2_ws" title="Relational Algebra educational video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></section>

    <section className="references-wrap" aria-labelledby="references-heading"><span className="eyebrow">Source acknowledgement</span><h3 id="references-heading">References</h3><p className="reference-intro">These books, course notes, teaching resource, and video support the terminology and examples used in this tutorial.</p><div className="reference-grid">{REFERENCES.map((group) => <article key={group.heading}><h4>{group.heading}</h4><ul>{group.items.map((item) => <li key={item.href}><a href={item.href} target="_blank" rel="noreferrer">{item.label}<span aria-hidden="true"> ↗</span></a></li>)}</ul></article>)}</div></section>
  </section>;
}
