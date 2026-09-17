import { useState } from 'react';

const OPERATIONS = [
  { name: 'Selection', symbol: 'σ', requirement: 'One relation and a true/false condition.', definition: 'Filters tuples; attributes stay the same.', example: "σ Department = 'CSE' (STUDENT)", output: 'Only STUDENT tuples whose Department is CSE.' },
  { name: 'Projection', symbol: 'π', requirement: 'One relation and one or more attribute names.', definition: 'Keeps selected columns and removes duplicate tuples.', example: 'π Name, Department (STUDENT)', output: 'A smaller relation containing just Name and Department.' },
  { name: 'Union', symbol: '∪', requirement: 'Two union-compatible relations with matching attributes in matching order.', definition: 'Combines tuples from both relations and removes duplicates.', example: 'CSE_STUDENTS ∪ ECE_STUDENTS', output: 'Students from either relation.' },
  { name: 'Set Difference', symbol: '−', requirement: 'Two union-compatible relations.', definition: 'Keeps tuples on the left that are absent on the right.', example: 'STUDENT − CSE_STUDENTS', output: 'Students who are not in CSE_STUDENTS.' },
  { name: 'Cartesian Product', symbol: '×', requirement: 'Two relations.', definition: 'Pairs every left tuple with every right tuple.', example: 'FACULTY × COURSE', output: 'Every possible faculty-course pair.' },
  { name: 'Rename', symbol: 'ρ', requirement: 'One relation and a new relation name.', definition: 'Changes a relation’s label without changing its tuples.', example: 'ρ LEARNER (STUDENT)', output: 'The STUDENT relation, now named LEARNER.' },
  { name: 'Intersection', symbol: '∩', requirement: 'Two union-compatible relations.', definition: 'Keeps tuples occurring in both inputs.', example: 'STUDENT ∩ CSE_STUDENTS', output: 'Students shared by the two relations.' },
  { name: 'Theta / Equi Join', symbol: '⋈', requirement: 'Two relations and a join condition.', definition: 'Combines pairs that satisfy the condition.', example: 'STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE', output: 'Student details paired with their matching course.' },
  { name: 'Natural Join', symbol: '⨝', requirement: 'Two relations with at least one shared attribute name.', definition: 'Matches all shared attributes automatically and keeps one copy.', example: 'STUDENT ⨝ COURSE', output: 'Matching student-course information.' },
  { name: 'Division', symbol: '÷', requirement: 'A dividend whose attributes include the divisor’s attributes.', definition: 'Finds left-side values related to every divisor tuple.', example: 'STUDENT_COURSES ÷ REQUIRED_COURSES', output: 'Students enrolled in every required course.' }
];

const REFERENCES = [
  {
    heading: 'Books',
    items: [
      { label: 'Database System Concepts — Abraham Silberschatz, Henry F. Korth, S. Sudarshan (7th ed.)', href: 'https://www.db-book.com/' },
      { label: 'Fundamentals of Database Systems — Ramez Elmasri, Shamkant B. Navathe (7th ed.)', href: 'https://www.pearson.com/en-us/subject-catalog/p/Elmasri-Fundamentals-of-Database-Systems-Instant-Access-7th-Edition/P200000003546/9780133971330' }
    ]
  },
  {
    heading: 'Websites & course material',
    items: [
      { label: 'University of Edinburgh — Introduction to Databases course materials', href: 'https://auth.opencourse.inf.ed.ac.uk/idb' },
      { label: 'Rensselaer Polytechnic Institute — Relational Model and Algebra notes', href: 'https://www.cs.rpi.edu/~sibel/csci4380/fall2018/course_notes/relational_algebra.html' }
    ]
  },
  {
    heading: 'Research / academic resource',
    items: [{ label: 'Relational Playground: Teaching the Duality of Relational Algebra and SQL (arXiv)', href: 'https://arxiv.org/abs/2306.13486' }]
  },
  {
    heading: 'Educational video',
    items: [{ label: 'Relational Algebra video used in this learning section (YouTube)', href: 'https://www.youtube.com/watch?v=z9IceBT2_ws' }]
  }
];

export default function LearnSection({ onTryExpression }) {
  const [selectedOperation, setSelectedOperation] = useState(OPERATIONS[0].name);
  const selected = OPERATIONS.find((operation) => operation.name === selectedOperation) || OPERATIONS[0];
  return (
    <section className="content-section learn-section" id="learn" aria-labelledby="learn-heading">
      <div className="section-heading section-heading-wide"><div><span className="eyebrow">Learn</span><h2 id="learn-heading">Understand relational algebra by doing</h2><p>Relational algebra is a procedural language for relational databases. Each operation accepts one or more relations (tables) and produces a new relation, so complex questions can be expressed as a sequence of small, inspectable transformations.</p></div></div>

      <div className="learn-intro-grid">
        <article className="theory-card"><h3>Why it matters</h3><p>It provides the formal ideas behind database query processing. Systems can turn a request into selections, projections, joins, and other steps before delivering an answer.</p></article>
        <article className="theory-card"><h3>Relations are tables</h3><p>A relation has named attributes (columns) and tuples (rows). An operation can filter rows, select columns, combine tables, or find matching tuples.</p></article>
        <article className="theory-card"><h3>Input → output</h3><p>Every valid expression is closed over relations: its inputs are relations and its result is also a relation. That is why operations can be nested.</p></article>
      </div>

      <div className="process-card" aria-label="Relational algebra processing flow"><h3>How this visualizer processes an expression</h3><div className="process-flow">{['User input', 'Parse / validate', 'Identify relations & operators', 'Apply operation(s)', 'Record intermediate results', 'Generate final result', 'Visualize result'].map((label, index, all) => <div className="process-flow-item" key={label}><span>{index + 1}</span><strong>{label}</strong>{index < all.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div></div>

      <div className="operation-explorer"><div><span className="eyebrow">Interactive operation explorer</span><h3>Choose an operation</h3></div><div className="operation-chip-list" role="tablist" aria-label="Relational algebra operations">{OPERATIONS.map((operation) => <button type="button" role="tab" aria-selected={selected.name === operation.name} className={selected.name === operation.name ? 'active' : ''} onClick={() => setSelectedOperation(operation.name)} key={operation.name}><b>{operation.symbol}</b>{operation.name}</button>)}</div><article className="operation-detail" aria-live="polite"><div className="operation-symbol" aria-hidden="true">{selected.symbol}</div><div><h4>{selected.name}</h4><p>{selected.definition}</p><dl><div><dt>Input requirement</dt><dd>{selected.requirement}</dd></div><div><dt>Example</dt><dd><code>{selected.example}</code></dd></div><div><dt>Expected output</dt><dd>{selected.output}</dd></div></dl><button type="button" className="secondary-button try-expression" onClick={() => onTryExpression(selected.example)}>Try this expression in the visualizer</button></div></article></div>

      <div className="video-card"><div><span className="eyebrow">Educational video</span><h3>See the notation explained</h3><p>This short video complements the interactive examples by introducing the ideas and symbols behind relational algebra.</p></div><div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/z9IceBT2_ws" title="Relational Algebra educational video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div></div>

      <div className="references-wrap" aria-labelledby="references-heading"><span className="eyebrow">Source acknowledgement</span><h3 id="references-heading">References</h3><div className="reference-grid">{REFERENCES.map((group) => <article key={group.heading}><h4>{group.heading}</h4><ul>{group.items.map((item) => <li key={item.href}><a href={item.href} target="_blank" rel="noreferrer">{item.label}<span aria-hidden="true"> ↗</span></a></li>)}</ul></article>)}</div></div>
    </section>
  );
}
