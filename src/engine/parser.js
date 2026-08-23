export class RAError extends Error {
  constructor(message, hint = '') {
    super(message);
    this.name = 'RAError';
    this.hint = hint;
  }
}

const OPERATOR_WORDS = {
  UNION: '∪',
  INTERSECT: '∩',
  INTERSECTION: '∩',
  DIFFERENCE: '−',
  MINUS: '−',
  PRODUCT: '×',
  DIVIDE: '÷',
  'NATURAL JOIN': '⨝'
};

export function normaliseExpression(input) {
  let value = String(input ?? '').trim();
  for (const [word, symbol] of Object.entries(OPERATOR_WORDS)) {
    value = value.replace(new RegExp(`\\b${word}\\b`, 'gi'), symbol);
  }
  return value
    .replace(/\bSIGMA\b/gi, 'σ')
    .replace(/\bPI\b/gi, 'π')
    .replace(/\bRHO\b/gi, 'ρ')
    .replace(/\bTHETA\s*JOIN\b/gi, '⋈')
    .replace(/\bEQUI\s*JOIN\b/gi, '⋈')
    .replace(/\bNATURAL\s*JOIN\b/gi, '⨝')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIdentifierStart(char) {
  return /[A-Za-z_]/.test(char ?? '');
}

function isIdentifierCharacter(char) {
  return /[A-Za-z0-9_.$]/.test(char ?? '');
}

export class RelationalAlgebraParser {
  constructor(input) {
    this.input = normaliseExpression(input);
    this.position = 0;
    this.nodeId = 0;
  }

  parse() {
    if (!this.input) throw new RAError('Enter a relational algebra expression to run.');
    const ast = this.parseExpression();
    this.skipWhitespace();
    if (!this.isDone()) {
      throw new RAError(`Unexpected text near "${this.input.slice(this.position)}".`, 'Check operator spelling and parentheses.');
    }
    return ast;
  }

  makeNode(type, values = {}) {
    this.nodeId += 1;
    return { id: `node-${this.nodeId}`, type, ...values };
  }

  parseExpression() {
    let left = this.parsePrimary();
    this.skipWhitespace();

    while (!this.isDone()) {
      const operator = this.readBinaryOperator();
      if (!operator) break;
      this.skipWhitespace();

      if (operator === '⋈') {
        const { condition, right } = this.parseThetaJoinRight();
        left = this.makeNode('thetaJoin', { condition, left, right });
      } else if (operator === '⨝') {
        const right = this.parsePrimary();
        left = this.makeNode('naturalJoin', { left, right });
      } else {
        const right = this.parsePrimary();
        const type = { '∪': 'union', '−': 'difference', '×': 'product', '∩': 'intersection', '÷': 'division' }[operator];
        left = this.makeNode(type, { left, right });
      }
      this.skipWhitespace();
    }
    return left;
  }

  parsePrimary() {
    this.skipWhitespace();
    if (this.peek() === '(') {
      this.position += 1;
      const nested = this.parseExpression();
      this.skipWhitespace();
      this.expect(')', 'A closing parenthesis is missing.');
      return nested;
    }
    if (this.peek() === 'σ') return this.parseSelection();
    if (this.peek() === 'π') return this.parseProjection();
    if (this.peek() === 'ρ') return this.parseRename();

    const name = this.readIdentifier();
    if (!name) {
      throw new RAError(`Expected a relation or operator near "${this.input.slice(this.position)}".`, 'Relations use names such as STUDENT or COURSE.');
    }
    return this.makeNode('relation', { name });
  }

  parseSelection() {
    this.position += 1;
    const condition = this.readUntilOpeningParen('Selection needs a condition and an input relation, for example σ Age > 20 (STUDENT).');
    const child = this.parseParenthesizedExpression();
    return this.makeNode('selection', { condition, child });
  }

  parseProjection() {
    this.position += 1;
    const attributesText = this.readUntilOpeningParen('Projection needs attributes and an input relation, for example π Name, Department (STUDENT).');
    const attributes = attributesText.split(',').map((item) => item.trim()).filter(Boolean);
    if (!attributes.length) throw new RAError('Projection requires at least one attribute.');
    if (attributes.some((attribute) => !/^[A-Za-z_][A-Za-z0-9_.$]*$/.test(attribute))) {
      throw new RAError('The projection list contains an invalid attribute name.', 'Separate attributes with commas, such as Name, Department.');
    }
    const child = this.parseParenthesizedExpression();
    return this.makeNode('projection', { attributes, child });
  }

  parseRename() {
    this.position += 1;
    this.skipWhitespace();
    const newName = this.readIdentifier();
    if (!newName) throw new RAError('Rename requires a new relation name, for example ρ LEARNER (STUDENT).');
    this.skipWhitespace();
    const child = this.parseParenthesizedExpression();
    return this.makeNode('rename', { newName, child });
  }

  parseParenthesizedExpression() {
    this.skipWhitespace();
    this.expect('(', 'An opening parenthesis is missing.');
    const child = this.parseExpression();
    this.skipWhitespace();
    this.expect(')', 'A closing parenthesis is missing.');
    return child;
  }

  parseThetaJoinRight() {
    this.skipWhitespace();
    // Standard notation: R ⋈_{R.id = S.id} S
    if (this.peek() === '_') {
      this.position += 1;
      this.skipWhitespace();
      this.expect('{', 'Use braces after the join subscript, e.g. ⋈_{R.id = S.id}.');
      const start = this.position;
      while (!this.isDone() && this.peek() !== '}') this.position += 1;
      if (this.isDone()) throw new RAError('The join condition is missing a closing brace.');
      const condition = this.input.slice(start, this.position).trim();
      this.position += 1;
      if (!condition) throw new RAError('Theta join requires a condition.');
      const right = this.parsePrimary();
      return { condition, right };
    }

    // Friendly notation used by the project examples:
    // STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE
    const remaining = this.input.slice(this.position);
    const matcher = /^([A-Za-z_][\w.$]*\s*(?:=|!=|<>|>=|<=|>|<)\s*(?:[A-Za-z_][\w.$]*|'[^']*'|"[^"]*"|[-+]?\d+(?:\.\d+)?))\s+([A-Za-z_][\w$]*)/;
    const match = remaining.match(matcher);
    if (!match) {
      throw new RAError('Theta join needs a condition and a right relation.', 'Try STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE.');
    }
    this.position += match[0].length;
    return { condition: match[1].trim(), right: this.makeNode('relation', { name: match[2] }) };
  }

  readBinaryOperator() {
    this.skipWhitespace();
    const char = this.peek();
    if (['∪', '−', '-', '×', '*', '∩', '÷', '⋈', '⨝'].includes(char)) {
      this.position += 1;
      return ({ '-': '−', '*': '×' })[char] ?? char;
    }
    return null;
  }

  readUntilOpeningParen(message) {
    this.skipWhitespace();
    const start = this.position;
    let quote = null;
    while (!this.isDone()) {
      const char = this.peek();
      if ((char === "'" || char === '"') && this.input[this.position - 1] !== '\\') quote = quote === char ? null : (quote || char);
      if (char === '(' && !quote) break;
      this.position += 1;
    }
    if (this.isDone()) throw new RAError(message);
    const value = this.input.slice(start, this.position).trim();
    if (!value) throw new RAError(message);
    return value;
  }

  readIdentifier() {
    this.skipWhitespace();
    if (!isIdentifierStart(this.peek())) return null;
    const start = this.position;
    while (isIdentifierCharacter(this.peek())) this.position += 1;
    return this.input.slice(start, this.position);
  }

  skipWhitespace() {
    while (/\s/.test(this.peek() ?? '')) this.position += 1;
  }

  expect(char, message) {
    if (this.peek() !== char) throw new RAError(message);
    this.position += 1;
  }

  peek() { return this.input[this.position]; }
  isDone() { return this.position >= this.input.length; }
}

export function parseRelationalAlgebra(input) {
  return new RelationalAlgebraParser(input).parse();
}

export const OPERATION_LABELS = {
  relation: 'Relation', selection: 'Selection (σ)', projection: 'Projection (π)', rename: 'Rename (ρ)',
  union: 'Union (∪)', difference: 'Difference (−)', product: 'Cartesian Product (×)',
  intersection: 'Intersection (∩)', thetaJoin: 'Theta / Equi Join (⋈)', naturalJoin: 'Natural Join (⨝)', division: 'Division (÷)'
};

export function nodeLabel(node) {
  if (node.type === 'relation') return node.name;
  if (node.type === 'selection') return `σ ${node.condition}`;
  if (node.type === 'projection') return `π ${node.attributes.join(', ')}`;
  if (node.type === 'rename') return `ρ ${node.newName}`;
  return ({ union: '∪', difference: '−', product: '×', intersection: '∩', thetaJoin: `⋈ ${node.condition}`, naturalJoin: '⨝', division: '÷' })[node.type];
}
