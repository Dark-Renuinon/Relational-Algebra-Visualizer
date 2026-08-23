import { describe, expect, it } from 'vitest';
import { cloneDatabase } from '../src/data/sampleDatabase';
import { executeAst } from '../src/engine/executor';
import { parseRelationalAlgebra, RAError } from '../src/engine/parser';
import { sqlToRelationalAlgebra } from '../src/engine/sql';
import { createMarkdownReport, relationToCsv, relationToJson } from '../src/engine/exporters';

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
});
