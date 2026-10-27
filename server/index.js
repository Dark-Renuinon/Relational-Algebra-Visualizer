import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import pool from './db.js';
import { assertIdentifier, getRelation, listRelations, quote, readKey, readRow } from './relations.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const supportedTypes = new Set(['INT', 'VARCHAR', 'DECIMAL', 'DATE', 'DATETIME', 'BOOLEAN']);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

async function relationOr404(req, res) {
  const relation = await getRelation(pool, req.params.relation);
  if (!relation) { res.status(404).json({ error: 'Unknown relation.' }); return null; }
  return relation;
}
function typeDefinition(column) {
  const type = String(column?.type || '').toUpperCase();
  if (!supportedTypes.has(type)) throw new Error(`Unsupported type: ${column?.type}`);
  if (type === 'VARCHAR') {
    const length = Number(column.length || 100);
    if (!Number.isInteger(length) || length < 1 || length > 255) throw new Error('VARCHAR length must be an integer from 1 to 255.');
    return `VARCHAR(${length})`;
  }
  if (type === 'DECIMAL') return 'DECIMAL(10,2)';
  if (type === 'BOOLEAN') return 'TINYINT(1)';
  return type;
}
function columnDefinition(column) {
  const name = quote(assertIdentifier(column?.name, 'Column name'));
  const nullable = Boolean(column?.nullable) && !column?.primaryKey;
  return `${name} ${typeDefinition(column)} ${nullable ? 'NULL' : 'NOT NULL'}`;
}
async function databaseSnapshot() {
  const database = {};
  for (const relation of await listRelations(pool)) {
    const [rows] = await pool.query(`SELECT ${relation.columns.map(quote).join(', ')} FROM ${quote(relation.name)}`);
    database[relation.name] = { columns: relation.columns, key: relation.key, rows };
  }
  return database;
}
function singleStatement(sql) {
  if (typeof sql !== 'string' || !sql.trim()) throw new Error('Enter a SQL statement.');
  const trimmed = sql.trim().replace(/;$/, '').trim();
  if (!trimmed || /;|--|\/\*/.test(trimmed)) throw new Error('Run one SQL statement at a time. Comments and multiple statements are not allowed.');
  const command = trimmed.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase();
  if (!['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'].includes(command)) throw new Error('Only SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, and DROP statements are allowed.');
  if (/\b(DATABASE|USER|GRANT|REVOKE|PROCEDURE|FUNCTION|TRIGGER|EVENT|INTO\s+OUTFILE|LOAD\s+DATA)\b/i.test(trimmed)) throw new Error('That SQL operation is not available from the website.');
  return { command, sql: trimmed };
}

app.get('/api/health', async (_req, res, next) => { try { await pool.query('SELECT 1'); res.json({ ok: true }); } catch (error) { next(error); } });
app.get('/api/database', async (_req, res, next) => { try { res.json(await databaseSnapshot()); } catch (error) { next(error); } });
app.post('/api/tables', async (req, res, next) => {
  try {
    const name = assertIdentifier(req.body?.name, 'Table name');
    const columns = req.body?.columns;
    if (!Array.isArray(columns) || !columns.length) throw new Error('Add at least one column.');
    const usedNames = new Set();
    for (const column of columns) {
      const columnName = assertIdentifier(column?.name, 'Column name');
      if (usedNames.has(columnName.toLowerCase())) throw new Error(`Duplicate column: ${columnName}`);
      usedNames.add(columnName.toLowerCase());
    }
    const primaryKey = columns.filter((column) => column.primaryKey);
    if (!primaryKey.length) throw new Error('Select at least one primary-key column.');
    const definition = [...columns.map(columnDefinition), `PRIMARY KEY (${primaryKey.map((column) => quote(column.name)).join(', ')})`].join(', ');
    await pool.query(`CREATE TABLE ${quote(name)} (${definition})`);
    res.status(201).json({ ok: true });
  } catch (error) { next(error); }
});
app.delete('/api/tables/:table', async (req, res, next) => {
  try { const relation = await relationOr404(req, res); if (!relation) return; await pool.query(`DROP TABLE ${quote(relation.name)}`); res.json({ ok: true }); } catch (error) { next(error); }
});
app.post('/api/tables/:table/columns', async (req, res, next) => {
  try {
    const relation = await relationOr404(req, res); if (!relation) return;
    const column = req.body?.column;
    if (column?.primaryKey) throw new Error('Adding a primary-key column is not supported here. Create the table with its primary key, or use the SQL workspace.');
    if (relation.columns.some((name) => name.toLowerCase() === String(column?.name).toLowerCase())) throw new Error('A column with that name already exists.');
    await pool.query(`ALTER TABLE ${quote(relation.name)} ADD COLUMN ${columnDefinition(column)}`);
    res.status(201).json({ ok: true });
  } catch (error) { next(error); }
});
app.delete('/api/tables/:table/columns/:column', async (req, res, next) => {
  try { const relation = await relationOr404(req, res); if (!relation) return; const column = assertIdentifier(req.params.column, 'Column name'); if (!relation.columns.includes(column)) throw new Error('Unknown column.'); await pool.query(`ALTER TABLE ${quote(relation.name)} DROP COLUMN ${quote(column)}`); res.json({ ok: true }); } catch (error) { next(error); }
});
app.post('/api/relations/:relation', async (req, res, next) => {
  try { const relation = await relationOr404(req, res); if (!relation) return; const row = readRow(relation, req.body.row); await pool.execute(`INSERT INTO ${quote(relation.name)} (${relation.columns.map(quote).join(', ')}) VALUES (${relation.columns.map(() => '?').join(', ')})`, relation.columns.map((column) => row[column])); res.status(201).json({ ok: true }); } catch (error) { next(error); }
});
app.patch('/api/relations/:relation', async (req, res, next) => {
  try { const relation = await relationOr404(req, res); if (!relation) return; const row = readRow(relation, req.body.row); const originalKey = readKey(relation, req.body.originalKey); const [result] = await pool.execute(`UPDATE ${quote(relation.name)} SET ${relation.columns.map((column) => `${quote(column)} = ?`).join(', ')} WHERE ${relation.key.map((column) => `${quote(column)} = ?`).join(' AND ')}`, [...relation.columns.map((column) => row[column]), ...relation.key.map((column) => originalKey[column])]); if (!result.affectedRows) return res.status(404).json({ error: 'The row no longer exists.' }); res.json({ ok: true }); } catch (error) { next(error); }
});
app.delete('/api/relations/:relation', async (req, res, next) => {
  try { const relation = await relationOr404(req, res); if (!relation) return; const key = readKey(relation, req.body.key); const [result] = await pool.execute(`DELETE FROM ${quote(relation.name)} WHERE ${relation.key.map((column) => `${quote(column)} = ?`).join(' AND ')}`, relation.key.map((column) => key[column])); if (!result.affectedRows) return res.status(404).json({ error: 'The row no longer exists.' }); res.json({ ok: true }); } catch (error) { next(error); }
});
app.post('/api/sql', async (req, res, next) => {
  try { const { command, sql } = singleStatement(req.body?.sql); const [result] = await pool.query(sql); if (command === 'SELECT') return res.json({ type: 'rows', columns: result.length ? Object.keys(result[0]) : [], rows: result }); res.json({ type: 'change', command, affectedRows: result.affectedRows ?? 0, insertId: result.insertId ?? null, message: `${command} completed.` }); } catch (error) { next(error); }
});
app.get('/api/history', async (_req, res, next) => {
  try { const [rows] = await pool.query('SELECT `id`, `query`, `mode`, `algebra`, `timestamp`, `result`, `executionTime`, `status`, `error` FROM `query_history` ORDER BY `timestamp` DESC LIMIT 25'); res.json(rows.map((row) => ({ ...row, result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result }))); } catch (error) { next(error); }
});
app.post('/api/history', async (req, res, next) => {
  try { const entry = req.body; const fields = ['id', 'query', 'mode', 'algebra', 'timestamp', 'result', 'executionTime', 'status', 'error']; if (!entry?.id || !entry?.query || !entry?.mode || !entry?.timestamp || !entry?.status) throw new Error('Incomplete history entry.'); await pool.execute(`INSERT INTO \`query_history\` (${fields.map(quote).join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, fields.map((field) => field === 'result' && entry[field] != null ? JSON.stringify(entry[field]) : field === 'timestamp' ? new Date(entry[field]) : entry[field])); res.status(201).json({ ok: true }); } catch (error) { next(error); }
});
app.delete('/api/history', async (req, res, next) => { try { if (req.query.id) await pool.execute('DELETE FROM `query_history` WHERE `id` = ?', [req.query.id]); else await pool.execute('DELETE FROM `query_history`'); res.json({ ok: true }); } catch (error) { next(error); } });
app.use((error, _req, res, _next) => { console.error(error); const code = error.code === 'ER_DUP_ENTRY' ? 409 : error.code?.startsWith('ER_NO_REFERENCED_ROW') ? 400 : 400; res.status(code).json({ error: error.sqlMessage || error.message || 'Database request failed.' }); });
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
