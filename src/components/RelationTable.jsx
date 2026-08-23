import { formatCell, relationSummary } from '../engine/executor';

export default function RelationTable({ relation, compact = false, caption = true }) {
  if (!relation) return <div className="empty-state">Run a query to inspect its relation.</div>;
  return (
    <div className={`relation-table-wrap ${compact ? 'compact' : ''}`}>
      {caption && <div className="table-caption"><span>{relation.name}</span><small>{relationSummary(relation)}</small></div>}
      <div className="table-scroll">
        <table>
          <thead><tr>{relation.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {relation.rows.length ? relation.rows.map((row, index) => (
              <tr key={`${relation.name}-${index}`}>{relation.columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}</tr>
            )) : <tr><td className="empty-cell" colSpan={Math.max(relation.columns.length, 1)}>No tuples in this result.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
