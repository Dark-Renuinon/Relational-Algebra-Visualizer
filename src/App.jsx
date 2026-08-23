import { useEffect, useMemo, useState } from 'react';
import { EXAMPLES } from './data/sampleDatabase';
import { parseRelationalAlgebra, RAError } from './engine/parser';
import { executeAst, relationSummary } from './engine/executor';
import { sqlToRelationalAlgebra } from './engine/sql';
import { createMarkdownReport, downloadText, relationToCsv, relationToJson } from './engine/exporters';
import { loadTheme, saveTheme } from './utils/storage';
import { addColumn, clearHistory, createRow, createTable, deleteColumn, deleteHistoryEntry, deleteRow, deleteTable, executeSql, getDatabase, getHistory, saveHistoryEntry, updateRow } from './services/api';
import RelationTable from './components/RelationTable';
import ExpressionTree from './components/ExpressionTree';
import DataEditor from './components/DataEditor';
import LearnSection from './components/LearnSection';
import SchemaManager from './components/SchemaManager';
import SqlWorkspace from './components/SqlWorkspace';

const CHEAT_SHEET = [
  ['σ condition (R)', 'Selection'], ['π A, B (R)', 'Projection'], ['R ∪ S', 'Union'], ['R − S', 'Difference'], ['R × S', 'Product'],
  ['ρ NAME (R)', 'Rename'], ['R ∩ S', 'Intersection'], ['R ⋈ R.a = S.a S', 'Theta / equi join'], ['R ⨝ S', 'Natural join'], ['R ÷ S', 'Division']
];

function formatTimestamp(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function makeHistoryEntry({ query, mode, algebra, result, elapsed, status, error }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    query,
    mode,
    algebra,
    timestamp: new Date().toISOString(),
    result: result ? { tuples: result.rows.length, attributes: result.columns.length, columns: result.columns, rows: result.rows } : null,
    executionTime: elapsed ?? null,
    status,
    error: error || null
  };
}

export default function App() {
  const [theme, setTheme] = useState(loadTheme);
  const [database, setDatabase] = useState({});
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('ra');
  const [query, setQuery] = useState(EXAMPLES[2].query);
  const [execution, setExecution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [notice, setNotice] = useState({ type: 'info', text: 'Choose an example or enter a relational algebra expression, then run it.' });

  useEffect(() => { document.documentElement.dataset.theme = theme; saveTheme(theme); }, [theme]);
  useEffect(() => {
    let active = true;
    Promise.all([getDatabase(), getHistory()]).then(([nextDatabase, nextHistory]) => {
      if (!active) return;
      setDatabase(nextDatabase);
      setHistory(nextHistory);
      setNotice({ type: 'info', text: 'Connected to MySQL. You can now run queries and save relation changes.' });
    }).catch((error) => active && setNotice({ type: 'error', text: `Could not connect to MySQL: ${error.message}` }));
    return () => { active = false; };
  }, []);

  const sqlPreview = useMemo(() => {
    if (mode !== 'sql' || !query.trim()) return '';
    try { return sqlToRelationalAlgebra(query); } catch { return ''; }
  }, [mode, query]);

  const selectedStep = execution?.result.steps[currentStep] ?? null;
  const displayedRelation = selectedStep?.output ?? execution?.result.relation;
  const finalRelation = execution?.result.relation;

  function persistHistory(entry) {
    setHistory((previous) => [entry, ...previous].slice(0, 25));
    saveHistoryEntry(entry).catch((error) => setNotice({ type: 'error', text: `Query ran, but its history was not saved: ${error.message}` }));
  }

  function runExpression(rawQuery = query, rawMode = mode) {
    if (!Object.keys(database).length) {
      setNotice({ type: 'error', text: 'The MySQL database is still loading or unavailable.' });
      return;
    }
    const started = performance.now();
    try {
      const algebra = rawMode === 'sql' ? sqlToRelationalAlgebra(rawQuery) : rawQuery;
      const ast = parseRelationalAlgebra(algebra);
      const result = executeAst(ast, database);
      const elapsed = performance.now() - started;
      setExecution({ query: rawQuery, algebra, ast, result, executionTime: elapsed });
      setCurrentStep(0);
      setSelectedNodeId(result.steps[0]?.nodeId ?? ast.id);
      setNotice({ type: 'success', text: `Success — ${relationSummary(result.relation)} in ${elapsed.toFixed(2)} ms.` });
      persistHistory(makeHistoryEntry({ query: rawQuery, mode: rawMode, algebra, result: result.relation, elapsed, status: 'success' }));
    } catch (error) {
      const message = error instanceof RAError ? error.message : 'The expression could not be executed.';
      const hint = error instanceof RAError && error.hint ? ` ${error.hint}` : '';
      setNotice({ type: 'error', text: `${message}${hint}` });
      persistHistory(makeHistoryEntry({ query: rawQuery, mode: rawMode, algebra: rawQuery, status: 'error', error: message }));
    }
  }

  function selectNode(nodeId) {
    setSelectedNodeId(nodeId);
    const index = execution?.result.steps.findIndex((step) => step.nodeId === nodeId);
    if (index >= 0) setCurrentStep(index);
  }

  function useExample(example) {
    setMode('ra');
    setQuery(example.query);
    setNotice({ type: 'info', text: `${example.label}: ${example.description}` });
  }

  function loadHistoryItem(item) {
    setMode(item.mode || 'ra');
    setQuery(item.query);
    setNotice({ type: 'info', text: 'History item loaded. Press Run to execute it against your current browser database.' });
  }

  async function reloadDatabase() {
    try {
      setDatabase(await getDatabase());
      setNotice({ type: 'success', text: 'Relations reloaded from MySQL.' });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  async function saveUpdatedRow(relation, originalRow, row) {
    try {
      const keyColumns = database[relation]?.key || [];
      if (!keyColumns.length) throw new Error(`${relation} has no primary key, so it cannot be updated through the editor.`);
      const key = Object.fromEntries(keyColumns.map((column) => [column, originalRow[column]]));
      await updateRow(relation, key, row);
      await reloadDatabase();
      setNotice({ type: 'success', text: `${relation} row saved to MySQL.` });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  async function saveNewRow(relation, row) {
    try { await createRow(relation, row); await reloadDatabase(); setNotice({ type: 'success', text: `New ${relation} row saved to MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  async function removeDatabaseRow(relation, row) {
    try {
      const keyColumns = database[relation]?.key || [];
      if (!keyColumns.length) throw new Error(`${relation} has no primary key, so it cannot be deleted through the editor.`);
      const key = Object.fromEntries(keyColumns.map((column) => [column, row[column]]));
      await deleteRow(relation, key);
      await reloadDatabase();
      setNotice({ type: 'success', text: `${relation} row deleted from MySQL.` });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  async function createDatabaseTable(name, columns) {
    try { await createTable(name, columns); await reloadDatabase(); setNotice({ type: 'success', text: `${name} table created in MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function removeDatabaseTable(name) {
    try { await deleteTable(name); await reloadDatabase(); setNotice({ type: 'success', text: `${name} table deleted from MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function createDatabaseColumn(table, column) {
    try { await addColumn(table, column); await reloadDatabase(); setNotice({ type: 'success', text: `${column.name} added to ${table}.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function removeDatabaseColumn(table, column) {
    try { await deleteColumn(table, column); await reloadDatabase(); setNotice({ type: 'success', text: `${column} removed from ${table}.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function runSqlStatement(sql) {
    const result = await executeSql(sql);
    if (result.type === 'change') await reloadDatabase();
    return result;
  }

  function exportResult(kind) {
    if (!execution || !finalRelation) return;
    const safeName = 'relational-algebra-result';
    if (kind === 'csv') downloadText(`${safeName}.csv`, relationToCsv(finalRelation), 'text/csv;charset=utf-8');
    if (kind === 'json') downloadText(`${safeName}.json`, relationToJson(finalRelation), 'application/json;charset=utf-8');
    if (kind === 'markdown') downloadText(`${safeName}.md`, createMarkdownReport({ query: execution.query, algebra: execution.algebra, relation: finalRelation, steps: execution.result.steps, executionTime: execution.executionTime }), 'text/markdown;charset=utf-8');
  }

  const lastStep = Math.max((execution?.result.steps.length ?? 1) - 1, 0);
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">σ</span><div><h1>Relational Algebra Visualizer</h1><p>Explore query processing — entirely in your browser.</p></div></div>
        <button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span> {theme === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </header>

      <div className="notice-wrap" aria-live="polite"><div className={`notice ${notice.type}`}>{notice.type === 'error' ? '⚠' : notice.type === 'success' ? '✓' : 'i'} <span>{notice.text}</span></div></div>

      <section className="dashboard-grid" aria-label="Relational algebra workspace">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <div className="panel-heading"><div><span className="eyebrow">Input</span><h2 id="input-heading">Query builder</h2></div></div>
          <div className="mode-tabs" role="tablist" aria-label="Query language">
            <button type="button" role="tab" aria-selected={mode === 'ra'} className={mode === 'ra' ? 'active' : ''} onClick={() => setMode('ra')}>Relational algebra</button>
            <button type="button" role="tab" aria-selected={mode === 'sql'} className={mode === 'sql' ? 'active' : ''} onClick={() => setMode('sql')}>Basic SQL</button>
          </div>
          <label className="query-label" htmlFor="query-input">{mode === 'ra' ? 'Expression' : 'SQL query'}</label>
          <textarea id="query-input" value={query} onChange={(event) => setQuery(event.target.value)} spellCheck="false" placeholder={mode === 'ra' ? "π Name (σ Department = 'CSE' (STUDENT))" : "SELECT Name FROM STUDENT WHERE Department = 'CSE';"} />
          {mode === 'sql' && <div className="sql-preview"><span>Equivalent RA</span><code>{sqlPreview || 'Enter a supported SELECT … FROM … WHERE query.'}</code></div>}
          <button type="button" className="run-button" onClick={() => runExpression()}><span aria-hidden="true">▶</span> Run query</button>

          <div className="subsection"><h3>Working examples</h3><div className="example-list">{EXAMPLES.map((example) => <button type="button" key={example.label} onClick={() => useExample(example)} title={example.description}>{example.label}</button>)}</div></div>
          <div className="subsection schema"><h3>Available relations</h3>{Object.entries(database).map(([name, relation]) => <div key={name} className="schema-row"><strong>{name}</strong><span>{relation.columns.join(', ')}</span></div>)}</div>
          <details className="cheat-sheet"><summary>Operator cheat sheet</summary><div>{CHEAT_SHEET.map(([syntax, meaning]) => <p key={syntax}><code>{syntax}</code><span>{meaning}</span></p>)}</div></details>
        </section>

        <section className="panel visualization-panel" aria-labelledby="visual-heading">
          <div className="panel-heading"><div><span className="eyebrow">Visualization</span><h2 id="visual-heading">Expression tree</h2></div>{execution && <span className="result-badge">{finalRelation.rows.length} tuples</span>}</div>
          <ExpressionTree ast={execution?.ast} selectedNodeId={selectedNodeId} onSelect={selectNode} />
          <div className="result-heading"><div><h3>{selectedStep ? `Step ${currentStep + 1} output` : 'Result table'}</h3>{displayedRelation && <span>{relationSummary(displayedRelation)}</span>}</div>{execution && <div className="export-buttons"><button type="button" onClick={() => exportResult('csv')}>CSV</button><button type="button" onClick={() => exportResult('json')}>JSON</button><button type="button" onClick={() => exportResult('markdown')}>Report</button><button type="button" onClick={() => window.print()}>Print</button></div>}</div>
          <RelationTable relation={displayedRelation} />
        </section>

        <aside className="panel explanation-panel" aria-labelledby="explanation-heading">
          <div className="panel-heading"><div><span className="eyebrow">Explanation</span><h2 id="explanation-heading">{selectedStep?.operation || 'How it works'}</h2></div></div>
          {selectedStep ? <div className="explanation-content">
            <p className="lead-explanation">{selectedStep.explanation}</p>
            {selectedStep.condition && <div className="detail-card"><span>Condition / attributes</span><code>{selectedStep.condition}</code></div>}
            <div className="metric-grid"><div><span>Input tuples</span><strong>{selectedStep.rowsBefore}</strong></div><div><span>Output tuples</span><strong>{selectedStep.rowsAfter}</strong></div><div><span>Attributes</span><strong>{selectedStep.output.columns.length}</strong></div></div>
            <div className="detail-card"><span>Complexity</span><p>{selectedStep.complexity}</p></div>
            <div className="detail-card"><span>Why use it?</span><p>{selectedStep.operation} transforms relations into smaller, combined, or more meaningful results before the next operation runs.</p></div>
            {selectedStep.inputs.length > 0 && <div className="input-relations"><h3>Operation input{selectedStep.inputs.length > 1 ? 's' : ''}</h3>{selectedStep.inputs.map((input) => <RelationTable key={input.name} relation={input} compact />)}</div>}
          </div> : <div className="empty-state explanation-empty"><p>Run a query, then select a tree node or timeline step.</p><p>Each step explains its input, output, tuple count, use case, and algorithmic complexity.</p></div>}
        </aside>
      </section>

      <section className="timeline-section" aria-labelledby="timeline-heading">
        <div className="section-heading"><div><span className="eyebrow">Execution timeline</span><h2 id="timeline-heading">{execution ? `Step ${currentStep + 1} / ${execution.result.steps.length}` : 'Step-by-step execution'}</h2></div>{execution && <span className="time-chip">{execution.executionTime.toFixed(2)} ms total</span>}</div>
        {execution ? <><div className="timeline-controls"><button type="button" onClick={() => setCurrentStep(0)} disabled={currentStep === 0}>First</button><button type="button" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))} disabled={currentStep === 0}>Previous</button><button type="button" onClick={() => setCurrentStep((step) => Math.min(step + 1, lastStep))} disabled={currentStep === lastStep}>Next</button><button type="button" onClick={() => setCurrentStep(lastStep)} disabled={currentStep === lastStep}>Last</button><button type="button" className="accent-control" onClick={() => setCurrentStep(lastStep)}>Run All</button><button type="button" onClick={() => { setCurrentStep(0); setSelectedNodeId(execution.result.steps[0]?.nodeId); }}>Reset</button></div>
          <div className="step-track">{execution.result.steps.map((step, index) => <button type="button" key={step.nodeId} className={`step-pill ${index === currentStep ? 'active' : ''}`} onClick={() => { setCurrentStep(index); setSelectedNodeId(step.nodeId); }}><span>{index + 1}</span><strong>{step.title}</strong><small>{step.output.rows.length} tuples</small></button>)}</div></> : <div className="timeline-placeholder">The execution timeline appears here after a successful query.</div>}
      </section>

      <DataEditor database={database} onCreateRow={saveNewRow} onDeleteRow={removeDatabaseRow} onReload={reloadDatabase} onUpdateRow={saveUpdatedRow} />

      <SchemaManager database={database} onAddColumn={createDatabaseColumn} onCreateTable={createDatabaseTable} onDeleteColumn={removeDatabaseColumn} onDeleteTable={removeDatabaseTable} />

      <SqlWorkspace onRun={runSqlStatement} />

      <section className="history-section" aria-labelledby="history-heading"><div className="section-heading"><div><span className="eyebrow">MySQL</span><h2 id="history-heading">Query history</h2><p>Saved permanently in MySQL. The newest 25 runs are shown.</p></div>{history.length > 0 && <button type="button" className="text-button" onClick={async () => { try { await clearHistory(); setHistory([]); } catch (error) { setNotice({ type: 'error', text: error.message }); } }}>Clear history</button>}</div>
        {history.length ? <div className="history-list">{history.map((item) => <article className="history-item" key={item.id}><div className={`status-dot ${item.status}`} aria-label={item.status} /><div className="history-main"><code>{item.query}</code><p>{formatTimestamp(item.timestamp)} · {item.status === 'success' ? `${item.result.tuples} tuples · ${Number(item.executionTime).toFixed(2)} ms` : item.error}</p></div><div className="history-actions"><button type="button" onClick={() => loadHistoryItem(item)}>Load</button><button type="button" onClick={() => runExpression(item.query, item.mode || 'ra')}>Re-run</button><button type="button" className="danger" aria-label="Delete history item" onClick={async () => { try { await deleteHistoryEntry(item.id); setHistory((items) => items.filter((entry) => entry.id !== item.id)); } catch (error) { setNotice({ type: 'error', text: error.message }); } }}>×</button></div></article>)}</div> : <div className="empty-state">Your executed queries will appear here.</div>}
      </section>

      <LearnSection />
      <footer>Built with React + Vite. Relation data and query history are stored in MySQL through a Node.js API; parsing and visualization run in the browser.</footer>
    </main>
  );
}
