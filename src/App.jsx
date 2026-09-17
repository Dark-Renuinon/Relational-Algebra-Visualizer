import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAMPLES } from './data/sampleDatabase';
import { parseRelationalAlgebra, RAError } from './engine/parser';
import { executeAst, relationSummary } from './engine/executor';
import { sqlToRelationalAlgebra } from './engine/sql';
import { createMarkdownReport, downloadText, relationToCsv, relationToJson } from './engine/exporters';
import { loadDatabase, loadHistory, loadTheme, saveDatabase, saveHistory, saveTheme } from './utils/storage';
import { addColumn, clearHistory, createRow, createTable, deleteColumn, deleteHistoryEntry, deleteRow, deleteTable, executeSql, getDatabase, getHistory, saveHistoryEntry, updateRow } from './services/api';
import RelationTable from './components/RelationTable';
import ExpressionTree from './components/ExpressionTree';
import DataEditor from './components/DataEditor';
import LearnSection from './components/LearnSection';
import SchemaManager from './components/SchemaManager';
import SqlWorkspace from './components/SqlWorkspace';
import HelpSection from './components/HelpSection';
import ReportDownload from './components/ReportDownload';
import TeamSection from './components/TeamSection';

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
  const [dataSource, setDataSource] = useState('loading');
  const [mode, setMode] = useState('ra');
  const [query, setQuery] = useState(EXAMPLES[2].query);
  const [execution, setExecution] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [notice, setNotice] = useState({ type: 'info', text: 'Choose an example or enter a relational algebra expression, then run it.' });
  const workspaceRef = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; saveTheme(theme); }, [theme]);
  useEffect(() => {
    let active = true;
    Promise.all([getDatabase(), getHistory()]).then(([nextDatabase, nextHistory]) => {
      if (!active) return;
      setDatabase(nextDatabase);
      setHistory(nextHistory);
      setDataSource('mysql');
      setNotice({ type: 'info', text: 'Connected to MySQL. You can now run queries and save relation changes.' });
    }).catch(() => {
      if (!active) return;
      setDatabase(loadDatabase());
      setHistory(loadHistory());
      setDataSource('browser');
      setNotice({ type: 'info', text: 'Using the browser sample relations. You can edit relations locally; optional MySQL persistence and the SQL workspace are available when the local API is running.' });
    });
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
    setHistory((previous) => {
      const next = [entry, ...previous].slice(0, 25);
      if (dataSource === 'browser') saveHistory(next);
      return next;
    });
    if (dataSource === 'mysql') saveHistoryEntry(entry).catch((error) => setNotice({ type: 'error', text: `Query ran, but its history was not saved: ${error.message}` }));
  }

  function runExpression(rawQuery = query, rawMode = mode) {
    if (!database || !Object.keys(database).length) {
      setNotice({ type: 'error', text: dataSource === 'loading' ? 'Relations are still loading. Wait a moment, then try again.' : 'No relations are available. Create a table in the Table manager, then run your expression.' });
      return;
    }
    const started = performance.now();
    try {
      const algebra = rawMode === 'sql' ? sqlToRelationalAlgebra(rawQuery) : rawQuery;
      const ast = parseRelationalAlgebra(algebra);
      const result = executeAst(ast, database);
      const elapsed = performance.now() - started;
      setExecution({ query: rawQuery, algebra, ast, result, executionTime: elapsed, mode: rawMode });
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

  function goToStep(index) {
    const steps = execution?.result.steps;
    if (!steps?.length) return;
    const nextIndex = Math.max(0, Math.min(index, steps.length - 1));
    setCurrentStep(nextIndex);
    setSelectedNodeId(steps[nextIndex].nodeId);
  }

  function useExample(example) {
    setMode('ra');
    setQuery(example.query);
    setNotice({ type: 'info', text: `${example.label}: ${example.description}` });
  }

  function tryExpression(expression) {
    setMode('ra');
    setQuery(expression);
    setNotice({ type: 'info', text: 'Example loaded into the query builder. Review it, then choose Run query to see every processing step.' });
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function loadHistoryItem(item) {
    setMode(item.mode || 'ra');
    setQuery(item.query);
    setNotice({ type: 'info', text: `History item loaded. Press Run to execute it against the current ${dataSource === 'mysql' ? 'MySQL database' : 'browser relations'}.` });
  }

  async function reloadDatabase() {
    if (dataSource === 'browser') {
      setDatabase(loadDatabase());
      setNotice({ type: 'success', text: 'Relations reloaded from browser storage.' });
      return;
    }
    try {
      setDatabase(await getDatabase());
      setNotice({ type: 'success', text: 'Relations reloaded from MySQL.' });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  function updateBrowserDatabase(updater) {
    setDatabase((previous) => {
      const next = updater(structuredClone(previous));
      saveDatabase(next);
      return next;
    });
  }
  async function saveUpdatedRow(relation, originalRow, row, rowIndex) {
    if (dataSource === 'browser') {
      updateBrowserDatabase((next) => { next[relation].rows[rowIndex] = { ...row }; return next; });
      setNotice({ type: 'success', text: `${relation} row saved in browser storage.` });
      return;
    }
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
    if (dataSource === 'browser') {
      updateBrowserDatabase((next) => { next[relation].rows.push({ ...row }); return next; });
      setNotice({ type: 'success', text: `New ${relation} row saved in browser storage.` });
      return;
    }
    try { await createRow(relation, row); await reloadDatabase(); setNotice({ type: 'success', text: `New ${relation} row saved to MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); }
  }
  async function removeDatabaseRow(relation, row, rowIndex) {
    if (dataSource === 'browser') {
      updateBrowserDatabase((next) => { next[relation].rows.splice(rowIndex, 1); return next; });
      setNotice({ type: 'success', text: `${relation} row deleted from browser storage.` });
      return;
    }
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
    if (dataSource === 'browser') {
      const cleanName = String(name || '').trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(cleanName)) throw new Error('Table name must start with a letter and contain only letters, numbers, or underscores.');
      if (Object.keys(database).some((table) => table.toLowerCase() === cleanName.toLowerCase())) throw new Error(`A table named ${cleanName} already exists.`);
      if (!columns.length || columns.some((column) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(column.name))) throw new Error('Every column needs a valid name.');
      if (new Set(columns.map((column) => column.name.toLowerCase())).size !== columns.length) throw new Error('Column names must be unique.');
      if (!columns.some((column) => column.primaryKey)) throw new Error('Select at least one primary-key column.');
      updateBrowserDatabase((next) => { next[cleanName] = { columns: columns.map((column) => column.name), key: columns.filter((column) => column.primaryKey).map((column) => column.name), rows: [] }; return next; });
      setNotice({ type: 'success', text: `${cleanName} table created in browser storage.` });
      return;
    }
    try { await createTable(name, columns); await reloadDatabase(); setNotice({ type: 'success', text: `${name} table created in MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function removeDatabaseTable(name) {
    if (dataSource === 'browser') {
      updateBrowserDatabase((next) => { delete next[name]; return next; });
      setNotice({ type: 'success', text: `${name} table deleted from browser storage.` });
      return;
    }
    try { await deleteTable(name); await reloadDatabase(); setNotice({ type: 'success', text: `${name} table deleted from MySQL.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function createDatabaseColumn(table, column) {
    if (dataSource === 'browser') {
      const cleanName = String(column?.name || '').trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(cleanName)) throw new Error('Column name must start with a letter and contain only letters, numbers, or underscores.');
      if (database[table]?.columns.some((name) => name.toLowerCase() === cleanName.toLowerCase())) throw new Error('A column with that name already exists.');
      updateBrowserDatabase((next) => { next[table].columns.push(cleanName); next[table].rows.forEach((row) => { row[cleanName] = ''; }); return next; });
      setNotice({ type: 'success', text: `${cleanName} added to ${table} in browser storage.` });
      return;
    }
    try { await addColumn(table, column); await reloadDatabase(); setNotice({ type: 'success', text: `${column.name} added to ${table}.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function removeDatabaseColumn(table, column) {
    if (dataSource === 'browser') {
      if (database[table]?.key?.includes(column)) throw new Error('A primary-key column cannot be removed in browser storage.');
      if ((database[table]?.columns.length ?? 0) <= 1) throw new Error('A relation must keep at least one column. Delete the table instead if it is no longer needed.');
      updateBrowserDatabase((next) => { next[table].columns = next[table].columns.filter((item) => item !== column); next[table].rows.forEach((row) => delete row[column]); return next; });
      setNotice({ type: 'success', text: `${column} removed from ${table} in browser storage.` });
      return;
    }
    try { await deleteColumn(table, column); await reloadDatabase(); setNotice({ type: 'success', text: `${column} removed from ${table}.` }); }
    catch (error) { setNotice({ type: 'error', text: error.message }); throw error; }
  }
  async function runSqlStatement(sql) {
    if (dataSource !== 'mysql') throw new Error('The full SQL workspace requires the optional local MySQL API. The query builder still supports Basic SQL SELECT–FROM–WHERE in this browser-only mode.');
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
    <main className="app-shell" id="home">
      <header className="topbar">
        <a className="brand" href="#visualizer" aria-label="Go to visualizer"><span className="brand-mark" aria-hidden="true">σ</span><span><h1>Relational Algebra Visualizer</h1><p>Explore query processing — step by step.</p></span></a>
        <div className="header-controls">
          <nav className="primary-nav" aria-label="Primary navigation"><a href="#home">Home</a><a href="#visualizer">Visualizer</a><a href="#learn">Learn</a><a href="#help">Help</a><a href="#developed-by">Developed By</a><a href="#download">Download</a></nav>
          <button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'day' : 'night'} mode`}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span> {theme === 'dark' ? 'Day' : 'Night'} mode
          </button>
        </div>
      </header>

      <div className="notice-wrap" aria-live="polite"><div className={`notice ${notice.type}`}>{notice.type === 'error' ? '⚠' : notice.type === 'success' ? '✓' : 'i'} <span>{notice.text}</span></div></div>

      <section className="dashboard-grid" id="visualizer" ref={workspaceRef} aria-label="Relational algebra workspace">
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
          <div className="result-heading"><div><h3>{selectedStep ? `Step ${currentStep + 1} output` : 'Result table'}</h3>{displayedRelation && <span>{relationSummary(displayedRelation)}</span>}</div>{execution && <div className="export-buttons" aria-label="Raw data exports"><button type="button" onClick={() => exportResult('csv')}>CSV</button><button type="button" onClick={() => exportResult('json')}>JSON</button><button type="button" onClick={() => exportResult('markdown')}>MD</button></div>}</div>
          <RelationTable relation={displayedRelation} />
          <ReportDownload execution={execution} onNotice={setNotice} />
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
        {execution ? <><div className="timeline-controls"><button type="button" onClick={() => goToStep(0)} disabled={currentStep === 0}>First</button><button type="button" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}>Previous</button><button type="button" onClick={() => goToStep(currentStep + 1)} disabled={currentStep === lastStep}>Next</button><button type="button" onClick={() => goToStep(lastStep)} disabled={currentStep === lastStep}>Last</button><button type="button" className="accent-control" onClick={() => goToStep(lastStep)}>Run All</button><button type="button" onClick={() => goToStep(0)}>Reset</button></div>
          <div className="step-track">{execution.result.steps.map((step, index) => <button type="button" key={step.nodeId} className={`step-pill ${index === currentStep ? 'active' : ''}`} onClick={() => goToStep(index)}><span>{index + 1}</span><strong>{step.title}</strong><small>{step.output.rows.length} tuples</small></button>)}</div></> : <div className="timeline-placeholder">The execution timeline appears here after a successful query.</div>}
      </section>

      <DataEditor database={database} onCreateRow={saveNewRow} onDeleteRow={removeDatabaseRow} onReload={reloadDatabase} onUpdateRow={saveUpdatedRow} source={dataSource} />

      <SchemaManager database={database} onAddColumn={createDatabaseColumn} onCreateTable={createDatabaseTable} onDeleteColumn={removeDatabaseColumn} onDeleteTable={removeDatabaseTable} />

      {dataSource === 'mysql' && <SqlWorkspace onRun={runSqlStatement} />}

      <section className="history-section" aria-labelledby="history-heading"><div className="section-heading"><div><span className="eyebrow">{dataSource === 'mysql' ? 'MySQL' : 'Browser storage'}</span><h2 id="history-heading">Query history</h2><p>{dataSource === 'mysql' ? 'Saved permanently in MySQL. The newest 25 runs are shown.' : 'Saved in this browser on this device. The newest 25 runs are shown.'}</p></div>{history.length > 0 && <button type="button" className="text-button" onClick={async () => { try { if (dataSource === 'mysql') await clearHistory(); else saveHistory([]); setHistory([]); } catch (error) { setNotice({ type: 'error', text: error.message }); } }}>Clear history</button>}</div>
        {history.length ? <div className="history-list">{history.map((item) => <article className="history-item" key={item.id}><div className={`status-dot ${item.status}`} aria-label={item.status} /><div className="history-main"><code>{item.query}</code><p>{formatTimestamp(item.timestamp)} · {item.status === 'success' ? `${item.result.tuples} tuples · ${Number(item.executionTime).toFixed(2)} ms` : item.error}</p></div><div className="history-actions"><button type="button" onClick={() => loadHistoryItem(item)}>Load</button><button type="button" onClick={() => runExpression(item.query, item.mode || 'ra')}>Re-run</button><button type="button" className="danger" aria-label="Delete history item" onClick={async () => { try { if (dataSource === 'mysql') await deleteHistoryEntry(item.id); setHistory((items) => { const next = items.filter((entry) => entry.id !== item.id); if (dataSource === 'browser') saveHistory(next); return next; }); } catch (error) { setNotice({ type: 'error', text: error.message }); } }}>×</button></div></article>)}</div> : <div className="empty-state">Your executed queries will appear here.</div>}
      </section>

      <LearnSection onTryExpression={tryExpression} />
      <HelpSection />
      <TeamSection />
      <footer>Built with React + Vite. The relational algebra parser, validator, executor, visualizations, and report generator run in the browser; browser edits persist locally, with optional MySQL persistence and SQL workspace support when a local API is available.</footer>
    </main>
  );
}
