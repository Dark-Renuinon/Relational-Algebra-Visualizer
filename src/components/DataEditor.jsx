import { useMemo, useState } from 'react';

function coerce(value) {
  if (value === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export default function DataEditor({ database, onChange, onReset }) {
  const relationNames = Object.keys(database);
  const [selected, setSelected] = useState(relationNames[0] || '');
  const relation = database[selected];
  const columns = useMemo(() => relation?.columns ?? [], [relation]);
  if (!relation) return null;

  function changeCell(rowIndex, column, value) {
    const next = structuredClone(database);
    next[selected].rows[rowIndex][column] = coerce(value);
    onChange(next);
  }
  function deleteRow(rowIndex) {
    const next = structuredClone(database);
    next[selected].rows.splice(rowIndex, 1);
    onChange(next);
  }
  function addRow() {
    const next = structuredClone(database);
    next[selected].rows.push(Object.fromEntries(columns.map((column) => [column, ''])));
    onChange(next);
  }

  return (
    <section className="panel data-editor" aria-labelledby="data-heading">
      <div className="panel-heading"><div><span className="eyebrow">Browser database</span><h2 id="data-heading">Edit sample relations</h2></div><button className="text-button" type="button" onClick={onReset}>Restore defaults</button></div>
      <p className="muted">Changes are saved on this device in localStorage. Relation schemas stay fixed to keep the visualizer predictable.</p>
      <label className="select-label">Relation
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>{relationNames.map((name) => <option value={name} key={name}>{name}</option>)}</select>
      </label>
      <div className="editable-table-scroll">
        <table className="editable-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th><span className="sr-only">Row actions</span></th></tr></thead>
          <tbody>{relation.rows.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column}><input aria-label={`${selected} row ${rowIndex + 1} ${column}`} value={row[column] ?? ''} onChange={(event) => changeCell(rowIndex, column, event.target.value)} /></td>)}<td><button className="icon-button danger" type="button" onClick={() => deleteRow(rowIndex)} aria-label={`Delete row ${rowIndex + 1}`}>×</button></td></tr>)}</tbody>
        </table>
      </div>
      <button type="button" className="secondary-button" onClick={addRow}>+ Add tuple</button>
    </section>
  );
}
