import { RAError, OPERATION_LABELS, nodeLabel } from './parser';

function cloneRelation(relation, name = relation.name) {
  return { name, columns: [...relation.columns], rows: relation.rows.map((row) => ({ ...row })) };
}

function valueKey(value) {
  return JSON.stringify(value);
}

function tupleKey(row, columns) {
  return JSON.stringify(columns.map((column) => row[column]));
}

function deduplicate(relation) {
  const seen = new Set();
  return {
    ...relation,
    rows: relation.rows.filter((row) => {
      const key = tupleKey(row, relation.columns);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
  };
}

function comparison(operator, left, right) {
  if (operator === '=') return left === right;
  if (operator === '!=' || operator === '<>') return left !== right;
  if (operator === '>') return left > right;
  if (operator === '>=') return left >= right;
  if (operator === '<') return left < right;
  if (operator === '<=') return left <= right;
  throw new RAError(`Unsupported comparison operator "${operator}".`);
}

function attributeCandidates(relation, reference) {
  const normalized = reference.toLowerCase();
  const plain = normalized.split('.').at(-1);
  // A qualified match must win before considering an unqualified suffix.
  // Otherwise STUDENT.CourseID would also match COURSE.CourseID after a join.
  const exact = relation.columns.filter((column) => column.toLowerCase() === normalized);
  if (exact.length) return exact;
  return relation.columns.filter((column) => {
    const name = column.toLowerCase();
    return name.split('.').at(-1) === plain;
  });
}

export function resolveAttribute(relation, reference) {
  const candidates = attributeCandidates(relation, reference);
  if (!candidates.length) {
    throw new RAError(
      `Attribute "${reference}" was not found in relation ${relation.name}.`,
      `Available attributes: ${relation.columns.join(', ')}`
    );
  }
  if (candidates.length > 1) {
    throw new RAError(`Attribute "${reference}" is ambiguous in ${relation.name}.`, `Choose one of: ${candidates.join(', ')}`);
  }
  return candidates[0];
}

function splitLogical(condition, keyword) {
  const parts = [];
  let quote = null;
  let start = 0;
  for (let i = 0; i < condition.length; i += 1) {
    const char = condition[i];
    if ((char === "'" || char === '"') && condition[i - 1] !== '\\') quote = quote === char ? null : (quote || char);
    if (!quote && condition.slice(i).toUpperCase().startsWith(` ${keyword} `)) {
      parts.push(condition.slice(start, i).trim());
      i += keyword.length + 1;
      start = i + 1;
    }
  }
  parts.push(condition.slice(start).trim());
  return parts;
}

function parseLiteral(token) {
  const trimmed = token.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return { kind: 'literal', value: trimmed.slice(1, -1) };
  }
  if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return { kind: 'literal', value: Number(trimmed) };
  if (/^(true|false)$/i.test(trimmed)) return { kind: 'literal', value: trimmed.toLowerCase() === 'true' };
  if (/^null$/i.test(trimmed)) return { kind: 'literal', value: null };
  return { kind: 'reference', value: trimmed };
}

export function validateCondition(condition, relation) {
  const terms = splitLogical(condition, 'OR').flatMap((part) => splitLogical(part, 'AND'));
  if (!terms.length || terms.some((term) => !term)) throw new RAError('The condition is incomplete.');
  for (const term of terms) {
    const match = term.match(/^(.+?)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/);
    if (!match) throw new RAError(`Invalid condition "${term}".`, "Use a comparison such as Age > 20 or Department = 'CSE'.");
    const [, left, , right] = match;
    const leftToken = parseLiteral(left);
    if (leftToken.kind !== 'reference') throw new RAError(`The left side of "${term}" must be an attribute.`);
    resolveAttribute(relation, leftToken.value);
    const rightToken = parseLiteral(right);
    if (rightToken.kind === 'reference') resolveAttribute(relation, rightToken.value);
  }
}

export function matchesCondition(row, relation, condition) {
  const evaluateTerm = (term) => {
    const match = term.match(/^(.+?)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/);
    if (!match) throw new RAError(`Invalid condition "${term}".`, "Use a comparison such as Age > 20 or Department = 'CSE'.");
    const [, left, operator, right] = match;
    const leftRef = parseLiteral(left);
    if (leftRef.kind !== 'reference') throw new RAError(`The left side of "${term}" must be an attribute.`);
    const leftValue = row[resolveAttribute(relation, leftRef.value)];
    const rightValue = parseLiteral(right);
    const resolvedRight = rightValue.kind === 'reference' ? row[resolveAttribute(relation, rightValue.value)] : rightValue.value;
    return comparison(operator, leftValue, resolvedRight);
  };
  return splitLogical(condition, 'OR').some((orPart) => splitLogical(orPart, 'AND').every(evaluateTerm));
}

function relationFromDatabase(database, name) {
  const foundName = Object.keys(database).find((key) => key.toLowerCase() === name.toLowerCase());
  if (!foundName) throw new RAError(`Relation "${name}" does not exist.`, `Available relations: ${Object.keys(database).join(', ')}`);
  const source = database[foundName];
  if (!Array.isArray(source.columns) || !Array.isArray(source.rows)) throw new RAError(`Relation "${foundName}" has invalid data.`);
  return { name: foundName, columns: [...source.columns], rows: source.rows.map((row) => ({ ...row })) };
}

function assertCompatible(left, right, operation) {
  const matching = left.columns.length === right.columns.length && left.columns.every((column, index) => column.toLowerCase() === right.columns[index].toLowerCase());
  if (!matching) {
    throw new RAError(
      `${OPERATION_LABELS[operation]} requires union-compatible relations.`,
      `${left.name} has (${left.columns.join(', ')}) while ${right.name} has (${right.columns.join(', ')}).`
    );
  }
}

function mergedRelation(left, right, name = `${left.name} × ${right.name}`) {
  const leftCollisions = new Set(left.columns.filter((column) => right.columns.some((other) => other.toLowerCase() === column.toLowerCase())));
  const rightCollisions = new Set(right.columns.filter((column) => left.columns.some((other) => other.toLowerCase() === column.toLowerCase())));
  const leftMap = Object.fromEntries(left.columns.map((column) => [column, leftCollisions.has(column) ? `${left.name}.${column}` : column]));
  const rightMap = Object.fromEntries(right.columns.map((column) => [column, rightCollisions.has(column) ? `${right.name}.${column}` : column]));
  const columns = [...left.columns.map((column) => leftMap[column]), ...right.columns.map((column) => rightMap[column])];
  const rows = [];
  for (const leftRow of left.rows) {
    for (const rightRow of right.rows) {
      const row = {};
      left.columns.forEach((column) => { row[leftMap[column]] = leftRow[column]; });
      right.columns.forEach((column) => { row[rightMap[column]] = rightRow[column]; });
      rows.push(row);
    }
  }
  return { name, columns, rows };
}

function naturalJoin(left, right) {
  const commonPairs = left.columns
    .map((leftColumn) => [leftColumn, right.columns.find((rightColumn) => rightColumn.toLowerCase() === leftColumn.toLowerCase())])
    .filter(([, rightColumn]) => rightColumn);
  if (!commonPairs.length) {
    throw new RAError(`Natural join needs at least one shared attribute between ${left.name} and ${right.name}.`, 'Use Cartesian Product (×) when no attributes are shared.');
  }
  const rightOnly = right.columns.filter((column) => !commonPairs.some(([, match]) => match === column));
  const columns = [...left.columns, ...rightOnly];
  const rows = [];
  for (const leftRow of left.rows) {
    for (const rightRow of right.rows) {
      if (commonPairs.every(([leftColumn, rightColumn]) => leftRow[leftColumn] === rightRow[rightColumn])) {
        const row = { ...leftRow };
        rightOnly.forEach((column) => { row[column] = rightRow[column]; });
        rows.push(row);
      }
    }
  }
  return deduplicate({ name: `${left.name} ⨝ ${right.name}`, columns, rows });
}

function divide(dividend, divisor) {
  const divisorColumns = divisor.columns.map((column) => resolveAttribute(dividend, column));
  if (!divisorColumns.length) throw new RAError('Division requires a divisor with at least one attribute.');
  const remainderColumns = dividend.columns.filter((column) => !divisorColumns.includes(column));
  const candidates = deduplicate({ name: dividend.name, columns: remainderColumns, rows: dividend.rows.map((row) => Object.fromEntries(remainderColumns.map((column) => [column, row[column]]))) });
  const rows = candidates.rows.filter((candidate) => divisor.rows.every((divisorRow) => dividend.rows.some((row) => {
    const candidateMatches = remainderColumns.every((column) => row[column] === candidate[column]);
    const divisorMatches = divisor.columns.every((column, index) => row[divisorColumns[index]] === divisorRow[column]);
    return candidateMatches && divisorMatches;
  })));
  return { name: `${dividend.name} ÷ ${divisor.name}`, columns: remainderColumns, rows };
}

export const COMPLEXITY = {
  relation: 'O(1) to load the relation', selection: 'O(n) — n is the number of input tuples.', projection: 'O(n) — scans n tuples; duplicate removal may add set lookups.',
  rename: 'O(1) — metadata changes only.', union: 'O(n + m) — n and m are tuples in the two inputs.', difference: 'O(n + m) — uses tuple lookups.',
  intersection: 'O(n + m) — uses tuple lookups.', product: 'O(n × m) — pairs every left tuple with every right tuple.',
  thetaJoin: 'O(n × m) — nested-loop comparison of both relations.', naturalJoin: 'O(n × m) — nested-loop comparison on shared attributes.',
  division: 'O(n × m) — checks each candidate against every divisor tuple.'
};

function explanation(type, details) {
  const text = {
    relation: `Load the base relation ${details.output.name}.`,
    selection: `Selection keeps only tuples where ${details.condition} is true.`,
    projection: `Projection keeps the requested attributes and removes duplicate tuples.`,
    rename: `Rename gives the relation the alias ${details.output.name}; its tuples do not change.`,
    union: 'Union combines compatible tuples from both input relations and removes duplicates.',
    difference: 'Difference keeps tuples present in the left relation but absent from the right relation.',
    intersection: 'Intersection keeps only tuples shared by both compatible input relations.',
    product: 'Cartesian product pairs every tuple on the left with every tuple on the right.',
    thetaJoin: `Theta join combines matching pairs using ${details.condition}. Equality makes this an equi join.`,
    naturalJoin: 'Natural join matches all attributes with the same name and retains one copy of each shared attribute.',
    division: 'Division finds tuples associated with every tuple in the divisor relation.'
  };
  return text[type];
}

/** Execute an AST recursively, recording each intermediate relation in postorder. */
export function executeAst(ast, database) {
  const steps = [];
  const resultsByNode = {};

  function record(node, output, inputs = [], condition = '') {
    const step = {
      index: steps.length + 1,
      nodeId: node.id,
      node,
      title: nodeLabel(node),
      operation: OPERATION_LABELS[node.type],
      condition,
      inputs: inputs.map((input) => cloneRelation(input)),
      output: cloneRelation(output),
      rowsBefore: inputs.reduce((total, input) => total + input.rows.length, 0),
      rowsAfter: output.rows.length,
      explanation: explanation(node.type, { output, condition }),
      complexity: COMPLEXITY[node.type]
    };
    steps.push(step);
    resultsByNode[node.id] = cloneRelation(output);
    return output;
  }

  function visit(node) {
    if (node.type === 'relation') return record(node, relationFromDatabase(database, node.name));
    if (node.type === 'selection') {
      const input = visit(node.child);
      validateCondition(node.condition, input);
      const output = { name: `σ ${node.condition} (${input.name})`, columns: [...input.columns], rows: input.rows.filter((row) => matchesCondition(row, input, node.condition)) };
      return record(node, output, [input], node.condition);
    }
    if (node.type === 'projection') {
      const input = visit(node.child);
      const resolved = node.attributes.map((attribute) => resolveAttribute(input, attribute));
      const output = deduplicate({ name: `π ${node.attributes.join(', ')} (${input.name})`, columns: resolved, rows: input.rows.map((row) => Object.fromEntries(resolved.map((column) => [column, row[column]]))) });
      return record(node, output, [input], node.attributes.join(', '));
    }
    if (node.type === 'rename') {
      const input = visit(node.child);
      return record(node, cloneRelation(input, node.newName), [input], node.newName);
    }

    const left = visit(node.left);
    const right = visit(node.right);
    if (node.type === 'union') {
      assertCompatible(left, right, node.type);
      return record(node, deduplicate({ name: `${left.name} ∪ ${right.name}`, columns: [...left.columns], rows: [...left.rows, ...right.rows] }), [left, right]);
    }
    if (node.type === 'difference' || node.type === 'intersection') {
      assertCompatible(left, right, node.type);
      const rightKeys = new Set(right.rows.map((row) => tupleKey(row, right.columns)));
      const rows = left.rows.filter((row) => rightKeys.has(tupleKey(row, left.columns)) === (node.type === 'intersection'));
      return record(node, deduplicate({ name: `${left.name} ${nodeLabel(node)} ${right.name}`, columns: [...left.columns], rows }), [left, right]);
    }
    if (node.type === 'product') return record(node, deduplicate(mergedRelation(left, right)), [left, right]);
    if (node.type === 'thetaJoin') {
      const combined = mergedRelation(left, right, `${left.name} ⋈ ${right.name}`);
      validateCondition(node.condition, combined);
      combined.rows = combined.rows.filter((row) => matchesCondition(row, combined, node.condition));
      return record(node, deduplicate(combined), [left, right], node.condition);
    }
    if (node.type === 'naturalJoin') return record(node, naturalJoin(left, right), [left, right]);
    if (node.type === 'division') return record(node, divide(left, right), [left, right]);
    throw new RAError(`Unsupported operation "${node.type}".`);
  }

  const relation = visit(ast);
  return { relation, steps, resultsByNode };
}

export function formatCell(value) {
  if (value === null) return 'NULL';
  if (value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function relationSummary(relation) {
  return `${relation.rows.length} tuple${relation.rows.length === 1 ? '' : 's'} × ${relation.columns.length} attribute${relation.columns.length === 1 ? '' : 's'}`;
}
