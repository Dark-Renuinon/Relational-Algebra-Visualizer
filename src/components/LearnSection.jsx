const TOPICS = [
  ['Relational Algebra', 'A procedural query language: every expression takes relations as input and produces a relation as output.'],
  ['Relation, tuple, attribute', 'A relation is a table, a tuple is one row, and an attribute is a named column.'],
  ['Selection (σ)', 'Filters tuples using a condition. SQL equivalent: WHERE. Complexity O(n).'],
  ['Projection (π)', 'Chooses attributes and removes duplicate tuples. SQL equivalent: SELECT columns.'],
  ['Set operations', 'Union, difference, and intersection require union-compatible relations: matching attributes in matching order.'],
  ['Product and joins', 'Cartesian product creates every pair. Theta/equi joins keep pairs satisfying a predicate; natural join uses all shared attribute names.'],
  ['Rename (ρ) and division (÷)', 'Rename supplies an alias. Division answers “which left-side values are associated with every right-side value?”'],
  ['Expression trees and processing', 'Leaves are input relations. Internal nodes are operations. The engine evaluates bottom-up, making intermediate results visible.'],
  ['Relational Algebra vs SQL', 'SQL describes the desired result; relational algebra describes the operations. This app translates a basic SELECT–FROM–WHERE SQL subset.'],
  ['Applications, advantages, limits', 'Database optimizers use relational algebra ideas. Its clear theory helps query planning, but this teaching implementation uses simple in-memory algorithms rather than indexes or a full SQL grammar.']
];

export default function LearnSection() {
  return <section className="learn-section" aria-labelledby="learn-heading"><div className="section-heading"><span className="eyebrow">Reference</span><h2 id="learn-heading">Learn relational algebra</h2><p>Open a topic for concise theory, practical context, and the concepts used by this visualizer.</p></div><div className="learn-grid">{TOPICS.map(([title, text]) => <details key={title}><summary>{title}</summary><p>{text}</p></details>)}</div></section>;
}
