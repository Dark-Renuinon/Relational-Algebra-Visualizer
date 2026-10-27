import { formatCell, relationSummary } from './executor';
import { nodeLabel } from './parser';

const encoder = new TextEncoder();

function cloneRelation(relation) {
  return { name: relation.name, columns: [...relation.columns], rows: relation.rows.map((row) => ({ ...row })) };
}

function reportDate(value = new Date()) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
}

function tableLines(relation) {
  if (!relation.columns.length) return ['(This relation has no attributes.)'];
  const values = [relation.columns, ...relation.rows.map((row) => relation.columns.map((column) => formatCell(row[column])))];
  const widths = relation.columns.map((_, index) => Math.max(...values.map((row) => String(row[index] ?? '').length)));
  const separator = `+-${widths.map((width) => '-'.repeat(width)).join('-+-')}-+`;
  const row = (cells) => `| ${cells.map((cell, index) => String(cell ?? '').padEnd(widths[index])).join(' | ')} |`;
  return [separator, row(relation.columns), separator, ...(relation.rows.length ? relation.rows.map((item) => row(relation.columns.map((column) => formatCell(item[column])))) : [row(relation.columns.map(() => 'No tuples'))]), separator];
}

function relationBlock(label, relation) {
  return [`${label}: ${relation.name}`, `Schema: ${relation.columns.join(', ') || '(no attributes)'}`, `Summary: ${relationSummary(relation)}`, ...tableLines(relation), ''];
}

function expressionTreeLines(node, prefix = '', isLast = true, isRoot = true) {
  if (!node) return [];
  const label = nodeLabel(node);
  const line = `${prefix}${isRoot ? '' : isLast ? '└─ ' : '├─ '}${label}`;
  const children = node.child ? [node.child] : node.left ? [node.left, node.right] : [];
  const nextPrefix = isRoot ? '' : `${prefix}${isLast ? '   ' : '│  '}`;
  return [line, ...children.flatMap((child, index) => expressionTreeLines(child, nextPrefix, index === children.length - 1, false))];
}

export function createReportData(execution) {
  if (!execution?.result?.relation) throw new Error('Run a valid query before downloading a report.');
  const relationSteps = execution.result.steps.filter((step) => step.node.type === 'relation');
  return {
    query: execution.query,
    algebra: execution.algebra,
    mode: execution.mode || 'ra',
    executionTime: execution.executionTime,
    generatedAt: new Date().toISOString(),
    inputRelations: relationSteps.map((step) => cloneRelation(step.output)),
    expressionTree: expressionTreeLines(execution.ast),
    steps: execution.result.steps.map((step) => ({ ...step, inputs: step.inputs.map(cloneRelation), output: cloneRelation(step.output) })),
    finalRelation: cloneRelation(execution.result.relation)
  };
}

export function createTextReport(data) {
  const lines = [
    'RELATIONAL ALGEBRA VISUALIZER — EXECUTION REPORT',
    '=================================================',
    `Generated: ${reportDate(data.generatedAt)}`,
    `Input mode: ${data.mode === 'sql' ? 'Basic SQL (translated before execution)' : 'Relational algebra'}`,
    '',
    'USER INPUT',
    '----------',
    'Entered query:',
    data.query,
    '',
    'Relational algebra evaluated:',
    data.algebra,
    '',
    'INPUT RELATIONS',
    '---------------'
  ];
  if (data.inputRelations.length) data.inputRelations.forEach((relation, index) => lines.push(...relationBlock(`Input ${index + 1}`, relation)));
  else lines.push('No input relation snapshot was recorded.', '');

  lines.push('SELECTED OPERATIONS / EXPRESSION TREE', '-------------------------------------', ...(data.expressionTree?.length ? data.expressionTree : ['No expression tree snapshot was recorded.']), '');
  lines.push('ACTUAL PROCESSING STEPS', '-----------------------');
  data.steps.forEach((step) => {
    lines.push(`${step.index}. ${step.operation}`, `Expression node: ${step.title}`, `Processing: ${step.explanation}`);
    if (step.condition) lines.push(`Condition / attributes: ${step.condition}`);
    lines.push(`Input tuples: ${step.rowsBefore} | Output tuples: ${step.rowsAfter}`, `Complexity: ${step.complexity}`, `Output relation: ${step.output.name}`);
    if (step.node.type !== 'relation') lines.push(...tableLines(step.output));
    lines.push('');
  });

  lines.push('FINAL OUTPUT', '------------', ...relationBlock('Final result', data.finalRelation), `Execution time: ${Number(data.executionTime || 0).toFixed(2)} ms`, '', 'This report was generated from the execution currently shown in the visualizer.');
  return lines.join('\n');
}

function escapeXml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function paragraph(text = '', { heading = false, bold = false, code = false } = {}) {
  const size = heading ? '28' : code ? '18' : '21';
  return `<w:p><w:pPr>${heading ? '<w:spacing w:before="220" w:after="100"/>' : '<w:spacing w:after="80"/>'}</w:pPr><w:r><w:rPr>${(heading || bold) ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : ''}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function cell(text, { header = false } = {}) {
  return `<w:tc><w:tcPr>${header ? '<w:shd w:fill="DDEFE6"/>' : ''}<w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r><w:rPr>${header ? '<w:b/>' : ''}<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
}

function docxTable(relation) {
  if (!relation.columns.length) return paragraph('(This relation has no attributes.)');
  const header = `<w:tr>${relation.columns.map((column) => cell(column, { header: true })).join('')}</w:tr>`;
  const rows = relation.rows.length
    ? relation.rows.map((row) => `<w:tr>${relation.columns.map((column) => cell(formatCell(row[column]))).join('')}</w:tr>`).join('')
    : `<w:tr>${relation.columns.map((_, index) => cell(index === 0 ? 'No tuples in this result.' : '')).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="AAB8B5"/><w:left w:val="single" w:sz="4" w:color="AAB8B5"/><w:bottom w:val="single" w:sz="4" w:color="AAB8B5"/><w:right w:val="single" w:sz="4" w:color="AAB8B5"/><w:insideH w:val="single" w:sz="2" w:color="D5DFDB"/><w:insideV w:val="single" w:sz="2" w:color="D5DFDB"/></w:tblBorders></w:tblPr>${header}${rows}</w:tbl>`;
}

function relationDocument(label, relation) {
  return [paragraph(`${label}: ${relation.name}`, { bold: true }), paragraph(`Schema: ${relation.columns.join(', ') || '(no attributes)'}`), paragraph(`Summary: ${relationSummary(relation)}`), docxTable(relation), paragraph('')].join('');
}

function documentXml(data) {
  let body = [
    paragraph('Relational Algebra Visualizer', { heading: true }),
    paragraph('Execution Report', { bold: true }),
    paragraph(`Generated: ${reportDate(data.generatedAt)}`),
    paragraph('User input', { heading: true }),
    paragraph(`Input mode: ${data.mode === 'sql' ? 'Basic SQL (translated before execution)' : 'Relational algebra'}`),
    paragraph('Entered query:', { bold: true }), paragraph(data.query, { code: true }),
    paragraph('Relational algebra evaluated:', { bold: true }), paragraph(data.algebra, { code: true }),
    paragraph('Input relations', { heading: true })
  ];
  if (data.inputRelations.length) body.push(...data.inputRelations.map((relation, index) => relationDocument(`Input ${index + 1}`, relation)));
  else body.push(paragraph('No input relation snapshot was recorded.'));
  body.push(paragraph('Selected operations / expression tree', { heading: true }));
  (data.expressionTree?.length ? data.expressionTree : ['No expression tree snapshot was recorded.']).forEach((line) => body.push(paragraph(line, { code: true })));
  body.push(paragraph('Actual processing steps', { heading: true }));
  data.steps.forEach((step) => {
    body.push(paragraph(`${step.index}. ${step.operation}`, { bold: true }), paragraph(`Expression node: ${step.title}`, { code: true }), paragraph(step.explanation));
    if (step.condition) body.push(paragraph(`Condition / attributes: ${step.condition}`));
    body.push(paragraph(`Input tuples: ${step.rowsBefore} | Output tuples: ${step.rowsAfter}`), paragraph(`Complexity: ${step.complexity}`), relationDocument('Step output', step.output));
  });
  body.push(paragraph('Final output', { heading: true }), relationDocument('Final result', data.finalRelation), paragraph(`Execution time: ${Number(data.executionTime || 0).toFixed(2)} ms`));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>`;
}

function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function joinBytes(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => { result.set(chunk, offset); offset += chunk.length; });
  return result;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(([name, contents]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(contents);
    const crc = crc32(data);
    const local = joinBytes([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data]);
    localParts.push(local);
    centralParts.push(joinBytes([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]));
    offset += local.length;
  });
  const central = joinBytes(centralParts);
  return joinBytes([...localParts, central, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]);
}

export function createDocxReport(data) {
  const now = new Date(data.generatedAt).toISOString();
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Relational Algebra Execution Report</dc:title><dc:creator>Relational Algebra Visualizer</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`],
    ['docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Relational Algebra Visualizer</Application></Properties>'],
    ['word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'],
    ['word/document.xml', documentXml(data)]
  ];
  return new Blob([zip(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function wrapLine(line, maxCharacters = 87) {
  if (!line) return [''];
  const chunks = [];
  let remaining = line;
  while (remaining.length > maxCharacters) {
    const index = Math.max(remaining.lastIndexOf(' ', maxCharacters), remaining.lastIndexOf('|', maxCharacters), remaining.lastIndexOf('-', maxCharacters));
    const cut = index > 12 ? index + 1 : maxCharacters;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  chunks.push(remaining);
  return chunks;
}

function reportCanvases(data) {
  const width = 1190;
  const height = 1684;
  const margin = 82;
  const lineHeight = 25;
  const lines = createTextReport(data).split('\n').flatMap((line) => wrapLine(line));
  const pages = [];
  let canvas;
  let context;
  let y;
  function nextPage() {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#13211d';
    y = margin;
    pages.push(canvas);
  }
  nextPage();
  lines.forEach((line, index) => {
    if (y > height - margin) nextPage();
    const heading = /^([A-Z][A-Z ]{3,}|\d+\. )/.test(line) || line.startsWith('===') || line.startsWith('---');
    context.font = `${heading ? '700' : '400'} ${line.startsWith('|') || line.startsWith('+-') ? '16px' : '19px'} ${line.startsWith('|') || line.startsWith('+-') ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif'}`;
    context.fillStyle = line.startsWith('|') || line.startsWith('+-') ? '#213b33' : heading ? '#0d6b45' : '#1e293b';
    context.fillText(line, margin, y);
    y += lineHeight + (index === 0 ? 8 : 0);
  });
  return pages;
}

function dataUrlBytes(dataUrl) {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function createPdfReport(data) {
  if (typeof document === 'undefined') throw new Error('PDF generation is available in a browser.');
  const images = reportCanvases(data).map((canvas) => dataUrlBytes(canvas.toDataURL('image/jpeg', 0.95)));
  const chunks = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0];
  const currentLength = () => chunks.reduce((total, chunk) => total + chunk.length, 0);
  const addObject = (number, content) => {
    offsets[number] = currentLength();
    chunks.push(encoder.encode(`${number} 0 obj\n`), content instanceof Uint8Array ? content : encoder.encode(content), encoder.encode('\nendobj\n'));
  };
  const pageObject = (index) => 3 + index * 3;
  const contentObject = (index) => 4 + index * 3;
  const imageObject = (index) => 5 + index * 3;
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, `<< /Type /Pages /Kids [${images.map((_, index) => `${pageObject(index)} 0 R`).join(' ')}] /Count ${images.length} >>`);
  images.forEach((image, index) => {
    addObject(pageObject(index), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${index} ${imageObject(index)} 0 R >> >> /Contents ${contentObject(index)} 0 R >>`);
    const content = encoder.encode(`q\n595 0 0 842 0 0 cm\n/Im${index} Do\nQ\n`);
    addObject(contentObject(index), joinBytes([encoder.encode(`<< /Length ${content.length} >>\nstream\n`), content, encoder.encode('endstream')]));
    const imageHeader = encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);
    const imageBody = joinBytes([imageHeader, image, encoder.encode('\nendstream')]);
    addObject(imageObject(index), imageBody);
  });
  const xrefOffset = currentLength();
  const objectCount = images.length * 3 + 2;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objectCount; index += 1) xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  chunks.push(encoder.encode(`${xref}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([joinBytes(chunks)], { type: 'application/pdf' });
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
