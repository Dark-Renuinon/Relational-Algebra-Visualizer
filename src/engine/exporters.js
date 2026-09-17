import { formatCell } from './executor';

function escapeCsv(value) {
  const text = formatCell(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function relationToCsv(relation) {
  return [
    relation.columns.map(escapeCsv).join(','),
    ...relation.rows.map((row) => relation.columns.map((column) => escapeCsv(row[column])).join(','))
  ].join('\n');
}

export function relationToJson(relation) {
  return JSON.stringify({ relation: relation.name, columns: relation.columns, tuples: relation.rows }, null, 2);
}

export function createMarkdownReport({ query, algebra, relation, steps, executionTime }) {
  const rows = relation.rows.length
    ? relation.rows.map((row) => `| ${relation.columns.map((column) => formatCell(row[column]).replaceAll('|', '\\|')).join(' | ')} |`).join('\n')
    : `| ${relation.columns.map(() => '—').join(' | ')} |`;
  return `# Relational Algebra Execution Report

## Query

\`\`\`
${query}
\`\`\`

## Relational algebra

\`\`\`
${algebra}
\`\`\`

## Final result: ${relation.name}

${relation.columns.length ? `| ${relation.columns.join(' | ')} |\n| ${relation.columns.map(() => '---').join(' | ')} |\n${rows}` : '_The result has no attributes._'}

Tuples: **${relation.rows.length}**  
Execution time: **${executionTime.toFixed(2)} ms**

## Execution steps

${steps.map((step) => `### ${step.index}. ${step.operation}\n${step.explanation}\n\n- Output: ${step.output.rows.length} tuples × ${step.output.columns.length} attributes\n- Complexity: ${step.complexity}`).join('\n\n')}
`;
}

export function downloadText(filename, contents, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
