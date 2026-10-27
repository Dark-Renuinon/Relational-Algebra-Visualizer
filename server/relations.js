const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export const HIDDEN_TABLES = new Set(['query_history']);

export function assertIdentifier(value, label = 'Identifier') {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) throw new Error(`${label} must start with a letter and contain only letters, numbers, or underscores.`);
  return value;
}
export function quote(identifier) { return `\`${assertIdentifier(identifier)}\``; }

export async function getRelation(pool, tableName) {
  assertIdentifier(tableName, 'Table name');
  const [columns] = await pool.execute(
    `SELECT c.TABLE_NAME, c.COLUMN_NAME FROM information_schema.COLUMNS c JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = ? AND t.TABLE_TYPE = 'BASE TABLE' ORDER BY c.ORDINAL_POSITION`,
    [tableName]
  );
  if (!columns.length || HIDDEN_TABLES.has(columns[0].TABLE_NAME)) return null;
  const actualName = columns[0].TABLE_NAME;
  const [keyColumns] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY ORDINAL_POSITION`,
    [actualName]
  );
  return { name: actualName, columns: columns.map((column) => column.COLUMN_NAME), key: keyColumns.map((column) => column.COLUMN_NAME) };
}

export async function listRelations(pool) {
  const [tables] = await pool.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
  const relations = await Promise.all(tables.filter(({ TABLE_NAME }) => !HIDDEN_TABLES.has(TABLE_NAME)).map(({ TABLE_NAME }) => getRelation(pool, TABLE_NAME)));
  return relations.filter(Boolean);
}

export function readRow(relation, row) {
  if (!row || typeof row !== 'object') throw new Error('A row object is required.');
  const values = {};
  for (const column of relation.columns) {
    if (!(column in row)) throw new Error(`Missing required column: ${column}`);
    values[column] = row[column];
  }
  return values;
}
export function readKey(relation, key) {
  if (!relation.key.length) throw new Error('This table has no primary key, so rows cannot be updated or deleted through the editor.');
  if (!key || typeof key !== 'object') throw new Error('The original row key is required.');
  const values = {};
  for (const column of relation.key) {
    if (!(column in key)) throw new Error(`Missing key column: ${column}`);
    values[column] = key[column];
  }
  return values;
}
