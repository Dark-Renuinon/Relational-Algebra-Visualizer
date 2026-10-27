import { useEffect, useState } from 'react';

const TYPES = ['INT', 'VARCHAR', 'DECIMAL', 'DATE', 'DATETIME', 'BOOLEAN'];
const blankColumn = () => ({ name: '', type: 'VARCHAR', length: 100, nullable: false, primaryKey: false });

export default function SchemaManager({ database, onAddColumn, onCreateTable, onDeleteColumn, onDeleteTable }) {
  const relations = Object.values(database);
  const [name, setName] = useState('');
  const [columns, setColumns] = useState([{ ...blankColumn(), primaryKey: true }, blankColumn()]);
  const [selected, setSelected] = useState('');
  const [newColumn, setNewColumn] = useState(blankColumn());

  useEffect(() => { if ((!selected || !database[selected]) && Object.keys(database)[0]) setSelected(Object.keys(database)[0]); }, [database, selected]);
  const relation = database[selected];

  function changeColumn(index, field, value) {
    setColumns((items) => items.map((column, itemIndex) => itemIndex === index ? { ...column, [field]: value } : column));
  }
  async function create(event) {
    event.preventDefault();
    try {
      await onCreateTable(name, columns);
      setName('');
      setColumns([{ ...blankColumn(), primaryKey: true }, blankColumn()]);
    } catch { /* The parent displays the database error. */ }
  }
  async function add(event) {
    event.preventDefault();
    try { await onAddColumn(selected, newColumn); setNewColumn(blankColumn()); } catch { /* The parent displays the database error. */ }
  }
  async function dropTable() {
    if (window.confirm(`Delete table ${selected} and all of its records permanently?`)) { try { await onDeleteTable(selected); } catch { /* The parent displays the database error. */ } }
  }
  async function dropColumn(column) {
    if (window.confirm(`Delete column ${column} from ${selected} permanently?`)) { try { await onDeleteColumn(selected, column); } catch { /* The parent displays the database error. */ } }
  }

  return <section className="panel schema-manager" aria-labelledby="schema-manager-heading">
    <div className="panel-heading"><div><span className="eyebrow">Database design</span><h2 id="schema-manager-heading">Table manager</h2></div></div>
    <p className="muted">Create tables with a primary key, add or remove columns, and delete tables. Deletions require confirmation.</p>
    <form onSubmit={create} className="schema-form">
      <h3>Create a table</h3>
      <label>Table name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="DEPARTMENT" required pattern="[A-Za-z][A-Za-z0-9_]*" /></label>
      {columns.map((column, index) => <div className="column-form" key={index}>
        <input value={column.name} onChange={(event) => changeColumn(index, 'name', event.target.value)} placeholder="Column name" required pattern="[A-Za-z][A-Za-z0-9_]*" />
        <select value={column.type} onChange={(event) => changeColumn(index, 'type', event.target.value)}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>
        {column.type === 'VARCHAR' && <input type="number" min="1" max="255" value={column.length} onChange={(event) => changeColumn(index, 'length', Number(event.target.value))} aria-label="VARCHAR length" />}
        <label><input type="checkbox" checked={column.primaryKey} onChange={(event) => changeColumn(index, 'primaryKey', event.target.checked)} /> Primary key</label>
        <label><input type="checkbox" checked={column.nullable} disabled={column.primaryKey} onChange={(event) => changeColumn(index, 'nullable', event.target.checked)} /> Nullable</label>
        {columns.length > 1 && <button type="button" className="danger" onClick={() => setColumns((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}
      </div>)}
      <button type="button" onClick={() => setColumns((items) => [...items, blankColumn()])}>+ Column</button>
      <button className="secondary-button" type="submit">Create table</button>
    </form>
    <div className="schema-form">
      <h3>Modify a table</h3>
      <label>Table<select value={selected} onChange={(event) => setSelected(event.target.value)}>{Object.keys(database).map((table) => <option key={table}>{table}</option>)}</select></label>
      {relation && <><p className="muted">Primary key: {relation.key?.length ? relation.key.join(', ') : 'none'}</p>
        <div className="column-list">{relation.columns.map((column) => <span key={column}>{column}<button type="button" className="danger" onClick={() => dropColumn(column)} aria-label={`Delete ${column}`}>×</button></span>)}</div>
        <form onSubmit={add} className="column-form"><input value={newColumn.name} onChange={(event) => setNewColumn({ ...newColumn, name: event.target.value })} placeholder="New column" required pattern="[A-Za-z][A-Za-z0-9_]*" /><select value={newColumn.type} onChange={(event) => setNewColumn({ ...newColumn, type: event.target.value })}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select>{newColumn.type === 'VARCHAR' && <input type="number" min="1" max="255" value={newColumn.length} onChange={(event) => setNewColumn({ ...newColumn, length: Number(event.target.value) })} aria-label="New VARCHAR length" />}<label><input type="checkbox" checked={newColumn.nullable} onChange={(event) => setNewColumn({ ...newColumn, nullable: event.target.checked })} /> Nullable</label><button type="submit">Add column</button></form>
        <button type="button" className="danger" onClick={dropTable}>Delete table</button>
      </>}
    </div>
  </section>;
}
