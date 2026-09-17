const CONTROLS = [
  ['Relational algebra / Basic SQL', 'Switches between handwritten algebra and the supported SELECT–FROM–WHERE SQL translator.'],
  ['Run query', 'Parses, validates, evaluates, and records the current expression.'],
  ['Working examples', 'Loads a valid expression into the editor without changing relation data.'],
  ['Expression tree', 'Shows the parsed query plan. Select a node to inspect that operation and its output.'],
  ['Timeline controls', 'Move through the real bottom-up execution steps; Reset returns to the first step.'],
  ['Download report', 'Creates a PDF, DOCX, or TXT report using the currently completed execution.'],
  ['Theme toggle', 'Switches the whole interface between Day and Night mode and remembers the choice.'],
  ['Edit sample relations', 'Add, update, or remove tuples in either browser storage or the optional local MySQL database. Browser changes stay on this device; MySQL changes are saved to that local database.'],
  ['Table manager', 'Create tables and add or remove columns in either storage mode. In browser mode, column names and primary-key choices are kept locally for the visualizer.'],
  ['SQL workspace', 'Appears only when the optional local MySQL API is connected. It runs one supported SQL statement against that local development database.']
];

const ERRORS = [
  ['Missing expression', 'Enter an expression, or load a working example, before running it.'],
  ['Unknown relation or attribute', 'Check the Available relations list and use the displayed spelling. After joins, qualify duplicate names, for example STUDENT.CourseID.'],
  ['Invalid condition', "Use a comparison such as Age > 20 or Department = 'CSE'. Combine comparisons with AND or OR."],
  ['Set-operation mismatch', 'Union, difference, and intersection need the same attributes in the same order on both sides.'],
  ['Invalid join', 'A theta/equi join needs a condition and a right relation; natural join needs at least one shared attribute.'],
  ['Empty result', 'An empty table is a valid result: no input tuples met the operation’s rule.']
];

export default function HelpSection() {
  return (
    <section className="content-section help-section" id="help" aria-labelledby="help-heading">
      <div className="section-heading section-heading-wide">
        <div>
          <span className="eyebrow">User manual</span>
          <h2 id="help-heading">Help: from relation to result</h2>
          <p>RAV is an interactive teaching tool. It accepts a relational algebra expression (or a small SQL subset), validates it, evaluates it over the available relations, and explains every resulting step.</p>
        </div>
      </div>

      <div className="help-layout">
        <article className="manual-card manual-card-wide">
          <h3>Available input</h3>
          <p>Choose <strong>Relational algebra</strong> to write an expression such as <code>π Name (σ Department = 'CSE' (STUDENT))</code>. Relations are the named tables listed in the workspace, with columns shown beneath each name. Use quoted text values such as <code>'CSE'</code>.</p>
          <p>Alternatively, choose <strong>Basic SQL</strong> for <code>SELECT columns FROM relation WHERE condition;</code>. The app previews its equivalent algebra before execution; joins, grouping, and other SQL forms are intentionally outside this translator.</p>
        </article>
        <article className="manual-card">
          <h3>Read the output</h3>
          <p>The result table is the output of the selected timeline step. The final timeline step is the final relation. The tree and timeline make intermediate input/output relations visible rather than hiding query processing.</p>
        </article>
      </div>

      <div className="usage-steps" aria-label="Step-by-step usage">
        {[
          'Open the Visualizer workspace and review the Available relations list.',
          'Load a Working example or type a relational algebra expression.',
          'Provide the required attributes, condition, or second relation.',
          'Click Run query. Read any validation message before trying again.',
          'Inspect the expression tree and select an operation if needed.',
          'Use First, Previous, Next, Last, or the timeline cards to see each actual processing step.',
          'Read the selected step’s inputs, tuple counts, explanation, and output table.',
          'Use Download report to save the current execution as PDF, DOCX, or TXT.'
        ].map((step, index) => <div className="usage-step" key={step}><span>{index + 1}</span><p>{step}</p></div>)}
      </div>

      <div className="help-layout help-bottom">
        <article className="manual-card">
          <h3>Important controls</h3>
          <dl className="control-list">{CONTROLS.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
        </article>
        <article className="manual-card">
          <h3>Validation and common errors</h3>
          <dl className="control-list">{ERRORS.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
        </article>
      </div>
    </section>
  );
}
