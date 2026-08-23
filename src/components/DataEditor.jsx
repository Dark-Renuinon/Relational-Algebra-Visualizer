import { useEffect, useMemo, useState } from 'react';

function coerce(value) {
  if (value === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export default function DataEditor({ database, onCreateRow, onDeleteRow, onReload, onUpdateRow }) {
  const relationNames = Object.keys(database);
  const [selected, setSelected] = useState(relationNames[0] || '');
  const [draftRows, setDraftRows] = useState([]);
  const [newRow, setNewRow] = useState(null);
  const relation = database[selected];
  const columns = useMemo(() => relation?.columns ?? [], [relation]);
  useEffect(() => { if (!selected && relationNames[0]) setSelected(relationNames[0]); }, [relationNames, selected]);
  useEffect(() => { setDraftRows(relation?.rows ? structuredClone(relation.rows) : []); setNewRow(null); }, [relation]);
  if (!relation) return null;

  function changeCell(rowIndex, column, value) {
    setDraftRows((rows) => rows.map((row, index) => index === rowIndex ? { ...row, [column]: coerce(value) } : row));
  }
  function changeNewCell(column, value) { setNewRow((row) => ({ ...row, [column]: coerce(value) })); }
  async function saveRow(rowIndex) { await onUpdateRow(selected, relation.rows[rowIndex], draftRows[rowIndex]); }
  async function removeRow(rowIndex) { await onDeleteRow(selected, relation.rows[rowIndex]); }
  async function saveNewRow() { await onCreateRow(selected, newRow); }
  function beginNewRow() { setNewRow(Object.fromEntries(columns.map((column) => [column, '']))); }

  function isDirty(rowIndex) {
    return JSON.stringify(relation.rows[rowIndex]) !== JSON.stringify(draftRows[rowIndex]);
  }

  return (
    <section className="panel data-editor" aria-labelledby="data-heading">
      <div className="panel-heading"><div><span className="eyebrow">MySQL database</span><h2 id="data-heading">Edit sample relations</h2></div><button className="text-button" type="button" onClick={onReload}>Reload database</button></div>
      <p className="muted">Use Save to permanently store a row in MySQL. Relation schemas stay fixed to keep the visualizer predictable.</p>
      <label className="select-label">Relation
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>{relationNames.map((name) => <option value={name} key={name}>{name}</option>)}</select>
      </label>
      <div className="editable-table-scroll">
        <table className="editable-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th><span className="sr-only">Row actions</span></th></tr></thead>
          <tbody>{relation.rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column}><input aria-label={`${selected} row ${rowIndex + 1} ${column}`} value={draftRows[rowIndex]?.[column] ?? ''} onChange={(event) => changeCell(rowIndex, column, event.target.value)} /></td>)}<td><button type="button" onClick={() => saveRow(rowIndex)} disabled={!isDirty(rowIndex)}>Save</button><button className="icon-button danger" type="button" onClick={() => removeRow(rowIndex)} aria-label={`Delete row ${rowIndex + 1}`}>×</button></td></tr>)}
          {newRow && <tr>{columns.map((column) => <td key={column}><input aria-label={`New ${selected} ${column}`} value={newRow[column] ?? ''} onChange={(event) => changeNewCell(column, event.target.value)} /></td>)}<td><button type="button" onClick={saveNewRow}>Save</button><button type="button" onClick={() => setNewRow(null)}>Cancel</button></td></tr>}</tbody>
        </table>
      </div>
      <button type="button" className="secondary-button" onClick={beginNewRow} disabled={Boolean(newRow)}>+ Add tuple</button>
    </section>
  );
}
