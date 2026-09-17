import { useState } from 'react';

export default function SqlWorkspace({ onRun }) {
  const [sql, setSql] = useState('SELECT * FROM `STUDENT`;');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  async function run() {
    if (/^\s*(DROP|DELETE)\b/i.test(sql) && !window.confirm('This command can permanently delete data. Continue?')) return;
    try { setError(''); setResult(await onRun(sql)); } catch (nextError) { setResult(null); setError(nextError.message); }
  }
  return <section className="panel sql-workspace" aria-labelledby="sql-workspace-heading">
    <div className="panel-heading"><div><span className="eyebrow">MySQL</span><h2 id="sql-workspace-heading">SQL workspace</h2></div></div>
    <p className="muted">Run one SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, or DROP statement. Use this only on your local development database.</p>
    <textarea value={sql} onChange={(event) => setSql(event.target.value)} spellCheck="false" aria-label="SQL statement" />
    <button type="button" className="run-button" onClick={run}>Run SQL</button>
    {error && <p className="sql-error">{error}</p>}
    {result?.type === 'change' && <p className="muted">{result.message} Affected rows: {result.affectedRows}.</p>}
    {result?.type === 'rows' && <div className="editable-table-scroll"><table className="editable-table"><thead><tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table>{result.rows.length === 0 && <p className="muted">No rows returned.</p>}</div>}
  </section>;
}
