import { describe, expect, it } from 'vitest';
import { cloneDatabase } from '../src/data/sampleDatabase';
import { executeAst } from '../src/engine/executor';
import { normaliseExpression, parseRelationalAlgebra, RAError } from '../src/engine/parser';
import { sqlToRelationalAlgebra } from '../src/engine/sql';
import { createMarkdownReport, relationToCsv, relationToJson } from '../src/engine/exporters';
import { createDocxReport, createPdfReport, createReportData, createTextReport } from '../src/engine/reports';

function run(query) {
  return executeAst(parseRelationalAlgebra(query), cloneDatabase());
}

describe('relational algebra parser and executor', () => {
  it('parses and runs selection', () => {
    const execution = run('σ Age > 20 (STUDENT)');
    expect(execution.relation.rows.map((row) => row.Name)).toEqual(['Beena', 'Deepak', 'Farah']);
    expect(execution.steps).toHaveLength(2);
  });

  it('executes nested projection and selection in bottom-up steps', () => {
    const execution = run("π Name (σ Department = 'CSE' (STUDENT))");
    expect(execution.relation.columns).toEqual(['Name']);
    expect(execution.relation.rows).toEqual([{ Name: 'Arun' }, { Name: 'Beena' }]);
    expect(execution.steps.map((step) => step.node.type)).toEqual(['relation', 'selection', 'projection']);
  });

  it('executes all compatible set operations and removes duplicate tuples', () => {
    expect(run('CSE_STUDENTS ∪ ECE_STUDENTS').relation.rows).toHaveLength(4);
    expect(run('STUDENT − CSE_STUDENTS').relation.rows.map((row) => row.Name)).toEqual(['Chitra', 'Deepak', 'Farah']);
    expect(run('STUDENT ∩ CSE_STUDENTS').relation.rows.map((row) => row.Name)).toEqual(['Arun', 'Beena']);
  });

  it('executes product, theta/equi join, and natural join', () => {
    expect(run('FACULTY × COURSE').relation.rows).toHaveLength(12);
    const theta = run('STUDENT ⋈ STUDENT.CourseID = COURSE.CourseID COURSE').relation;
    expect(theta.rows).toHaveLength(5);
    expect(theta.columns).toContain('STUDENT.CourseID');
    const natural = run('STUDENT ⨝ COURSE').relation;
    expect(natural.rows).toHaveLength(5);
    expect(natural.columns).not.toContain('COURSE.CourseID');
  });

  it('executes rename and division', () => {
    expect(run('ρ LEARNER (STUDENT)').relation.name).toBe('LEARNER');
    const result = run('STUDENT_COURSES ÷ REQUIRED_COURSES').relation;
    expect(result.columns).toEqual(['StudentID']);
    expect(result.rows).toEqual([{ StudentID: 1 }, { StudentID: 2 }]);
  });

  it('reports educational validation errors for unknown attributes and incompatible unions', () => {
    expect(() => run('π Branch (STUDENT)')).toThrow(RAError);
    expect(() => run('STUDENT ∪ COURSE')).toThrow('requires union-compatible relations');
  });

  it('reports parser errors for invalid syntax', () => {
    expect(() => parseRelationalAlgebra('σ Age > 20 STUDENT')).toThrow('Selection needs a condition');
    expect(() => parseRelationalAlgebra('π (STUDENT)')).toThrow('Projection needs attributes');
  });

  it('accepts ASCII operator words and nested parentheses', () => {
    const result = run("PI Name (SIGMA Department = 'CSE' (STUDENT))").relation;
    expect(result.rows).toEqual([{ Name: 'Arun' }, { Name: 'Beena' }]);
  });

  it('keeps quoted literal text intact while normalising operator aliases', () => {
    expect(normaliseExpression("SIGMA Department = 'UNION PI' (STUDENT)")).toBe("σ Department = 'UNION PI' (STUDENT)");
    expect(() => run("σ Department = 'UNION' (STUDENT)")).not.toThrow();
  });

  it('evaluates AND/OR conditions, empty results, and standard theta-join notation', () => {
    expect(run("σ Department = 'CSE' AND Age >= 22 (STUDENT)").relation.rows.map((row) => row.Name)).toEqual(['Beena']);
    expect(run("σ Department = 'CSE' OR Department = 'ME' (STUDENT)").relation.rows).toHaveLength(3);
    expect(run('σ Age > 100 (STUDENT)').relation.rows).toEqual([]);
    expect(run('STUDENT ⋈_{STUDENT.CourseID = COURSE.CourseID} COURSE').relation.rows).toHaveLength(5);
  });
});

describe('SQL translation and client-side exports', () => {
  it('translates basic SQL into executable relational algebra', () => {
    const algebra = sqlToRelationalAlgebra("SELECT Name FROM STUDENT WHERE Department = 'CSE';");
    expect(algebra).toBe("π Name (σ Department = 'CSE' (STUDENT))");
    expect(executeAst(parseRelationalAlgebra(algebra), cloneDatabase()).relation.rows).toHaveLength(2);
  });

  it('rejects unsupported SQL without needing a server', () => {
    expect(() => sqlToRelationalAlgebra('DELETE FROM STUDENT')).toThrow('Only basic SELECT');
  });

  it('creates CSV, JSON, and Markdown export content', () => {
    const execution = run('π Name (STUDENT)');
    const csv = relationToCsv(execution.relation);
    const json = relationToJson(execution.relation);
    const markdown = createMarkdownReport({ query: 'π Name (STUDENT)', algebra: 'π Name (STUDENT)', relation: execution.relation, steps: execution.steps, executionTime: 1.5 });
    expect(csv.split('\n')).toHaveLength(6);
    expect(JSON.parse(json).tuples).toHaveLength(5);
    expect(markdown).toContain('Execution Report');
  });

  it('builds TXT and DOCX reports from the actual execution snapshot', async () => {
    const result = run("π Name (σ Department = 'CSE' (STUDENT))");
    const query = "π Name (σ Department = 'CSE' (STUDENT))";
    const report = createReportData({ ast: parseRelationalAlgebra(query), result, query, algebra: query, mode: 'ra', executionTime: 2.4 });
    const text = createTextReport(report);
    const docx = createDocxReport(report);
    const bytes = new Uint8Array(await docx.arrayBuffer());
    expect(text).toContain('ACTUAL PROCESSING STEPS');
    expect(text).toContain('SELECTED OPERATIONS / EXPRESSION TREE');
    expect(text).toContain('π Name');
    expect(text).toContain('Arun');
    expect(text).toContain('FINAL OUTPUT');
    expect(docx.type).toContain('wordprocessingml.document');
    expect(Array.from(bytes.slice(0, 2))).toEqual([80, 75]);
    const docxContents = new TextDecoder().decode(bytes);
    expect(docxContents).toContain('word/document.xml');
    expect(docxContents).toContain('Arun');
  });

  it('keeps reports tied to the specific execution rather than a demo result', () => {
    const firstQuery = 'π Name (STUDENT)';
    const secondQuery = 'σ Age > 100 (STUDENT)';
    const first = createTextReport(createReportData({ ast: parseRelationalAlgebra(firstQuery), result: run(firstQuery), query: firstQuery, algebra: firstQuery, mode: 'ra', executionTime: 1 }));
    const second = createTextReport(createReportData({ ast: parseRelationalAlgebra(secondQuery), result: run(secondQuery), query: secondQuery, algebra: secondQuery, mode: 'ra', executionTime: 1 }));
    expect(first).toContain('Arun');
    expect(second).toContain('σ Age > 100 (STUDENT)');
    expect(second).toContain('No tuples');
    expect(second.split('FINAL OUTPUT')[1]).not.toContain('| 1         | Arun');
  });

  it('creates a PDF with a valid PDF envelope from the execution snapshot', async () => {
    const query = 'π Name (STUDENT)';
    const report = createReportData({ ast: parseRelationalAlgebra(query), result: run(query), query, algebra: query, mode: 'ra', executionTime: 1 });
    const originalDocument = globalThis.document;
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, fillText() {}, fillStyle: '', font: '' }),
        toDataURL: () => 'data:image/jpeg;base64,/9j/2Q=='
      })
    };
    try {
      const bytes = new Uint8Array(await (await createPdfReport(report)).arrayBuffer());
      const text = new TextDecoder().decode(bytes);
      expect(text.startsWith('%PDF-1.4')).toBe(true);
      expect(text).toContain('xref');
      expect(text.endsWith('%%EOF')).toBe(true);
    } finally {
      globalThis.document = originalDocument;
    }
  });
});
