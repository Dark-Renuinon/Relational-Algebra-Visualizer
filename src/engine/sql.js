import { RAError } from './parser';

/**
 * Translate a deliberately small, teachable SQL subset into relational algebra.
 * Supported form: SELECT columns FROM relation [WHERE condition];
 */
export function sqlToRelationalAlgebra(sql) {
  const source = String(sql ?? '').trim().replace(/;\s*$/, '');
  const match = source.match(/^SELECT\s+(.+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_$]*)(?:\s+WHERE\s+(.+))?$/i);
  if (!match) {
    throw new RAError(
      'Only basic SELECT ... FROM ... WHERE ... SQL is supported.',
      "Example: SELECT Name FROM STUDENT WHERE Department = 'CSE';"
    );
  }
  const [, selected, relation, where] = match;
  const attributes = selected.trim();
  if (attributes !== '*' && !attributes.split(',').every((attribute) => /^[A-Za-z_][A-Za-z0-9_.$]*$/.test(attribute.trim()))) {
    throw new RAError('The SELECT list contains an invalid attribute.', 'Use a comma-separated list such as Name, Department.');
  }
  const base = where ? `σ ${where.trim()} (${relation})` : relation;
  return attributes === '*' ? base : `π ${attributes.split(',').map((attribute) => attribute.trim()).join(', ')} (${base})`;
}
