# Relational Algebra Visualizer — Project Documentation

## 1. Problem definition

Students often learn relational algebra as symbols on paper, without seeing how an expression changes a relation at each stage. This project provides a visual, executable learning environment that accepts relational algebra or basic SQL, constructs an Abstract Syntax Tree (AST), validates it, evaluates it in the browser, and displays all intermediate relations.

## 2. Background theory

Relational algebra is a formal, procedural query language. A **relation** is a set-like table, a **tuple** is a row, and an **attribute** is a named column. Operators transform one or two input relations into a new relation.

Implemented operations are:

| Operator | Meaning | Typical complexity |
| --- | --- | --- |
| σ | Selection: filter rows matching a predicate | O(n) |
| π | Projection: retain requested attributes and remove duplicate tuples | O(n) |
| ∪ | Union of compatible relations | O(n + m) |
| − | Difference of compatible relations | O(n + m) |
| × | Cartesian product | O(n × m) |
| ρ | Rename a relation | O(1) |
| ∩ | Intersection of compatible relations | O(n + m) |
| ⋈ | Theta/equi join | O(n × m) |
| ⨝ | Natural join on all identically named attributes | O(n × m) |
| ÷ | Division: “associated with every divisor tuple” | O(n × m) |

`n` and `m` are the tuple counts of the input relations. The app deliberately uses understandable nested-loop and JavaScript set algorithms instead of indexes, hashing join plans, or a DBMS query optimizer.

## 3. Learning outcomes

After using the application, students should be able to:

- Read and write basic relational algebra expressions.
- Explain the difference between filtering rows and selecting columns.
- Predict operation output and tuple counts.
- Relate an expression tree to bottom-up query processing.
- Translate simple SELECT–FROM–WHERE SQL into projection and selection.
- Recognize union compatibility and ambiguous/missing attributes.

## 4. Functional requirements

1. Accept relational algebra and basic SQL input.
2. Parse algebra into an AST instead of matching a hard-coded query list.
3. Validate relations, attributes, parentheses, conditions, joins, set compatibility, and division inputs.
4. Execute all listed operations using JavaScript relations.
5. Produce source, intermediate, and final relations.
6. Draw a clickable D3 expression tree.
7. Supply First, Previous, Next, Last, Run All, and Reset execution controls.
8. Explain the selected operation, its input/output sizes, purpose, and complexity.
9. Provide editable sample data and persistent localStorage history.
10. Export final results to CSV, JSON, Markdown, and browser print.

## 5. Non-functional requirements

- Static GitHub Pages deployment; no backend or server-side database.
- Responsive interface for desktop and mobile.
- Accessible keyboard-focusable buttons and interactive tree nodes.
- Dark/light theme.
- Client-side execution with no credentials or API keys.
- Beginner-maintainable JavaScript module structure.

## 6. Input specifications

Relations have a fixed array of `columns` and an array of row objects. Bundled relations include STUDENT, COURSE, FACULTY, ENROLLMENT, STUDENT_COURSES, CSE_STUDENTS, ECE_STUDENTS, and REQUIRED_COURSES.

Algebra supports symbols and friendly words such as `SIGMA`, `PI`, `UNION`, `INTERSECT`, `PRODUCT`, `DIVIDE`, and `NATURAL JOIN`. Selection conditions use comparison operators `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, optionally joined by AND/OR. String literals should be quoted.

SQL support intentionally covers:

```sql
SELECT Name, Department
FROM STUDENT
WHERE Department = 'CSE';
```

## 7. Output specifications and UI design

The dashboard has three primary areas:

- **Input:** language toggle, editor, examples, schema list, and operator reference.
- **Visualization:** D3 AST, selected output relation, and exports.
- **Explanation:** operation description, condition, tuple metrics, complexity, and operation input.

Below the dashboard are an execution timeline, data editor, persistent query history, and theory cards. Selecting a tree node synchronizes the active timeline step and output table.

## 8. Architecture

```text
GitHub repository → GitHub Pages → static Vite bundle
                                      ├─ React dashboard
                                      ├─ D3 tree layout
                                      ├─ Parser → AST
                                      ├─ Validation / JavaScript execution engine
                                      ├─ SQL-to-RA translator
                                      ├─ Client-side exporters
                                      └─ localStorage (database, history, theme)
```

The AST evaluator is post-order: child relations are evaluated first, then the parent operation is evaluated and recorded as a timeline step. This gives the learner the required intermediate results naturally.

## 9. Algorithms

- **Parser:** a recursive-descent parser recognizes parenthesized primary expressions, unary σ/π/ρ operators, and binary set/join operators. It creates stable AST node IDs for UI selection.
- **Validation:** attribute lookup handles qualified names after joins. Missing and ambiguous names raise descriptive messages listing valid alternatives.
- **Set operations:** tuple keys are serialized from ordered columns, enabling duplicate-safe union/difference/intersection.
- **Product/join:** product creates pairs of rows. Theta join filters those pairs using the shared condition evaluator. Natural join checks all shared attributes and retains one copy.
- **Division:** for each distinct tuple in dividend attributes not present in the divisor, the algorithm verifies that a matching dividend tuple exists for every divisor tuple.

## 10. Testing

Vitest tests verify:

- Every relational operation, including natural/equi joins and division.
- Valid selection and nested projection/selection execution order.
- Missing attributes, incompatible unions, and invalid syntax.
- SQL translation and unsupported SQL errors.
- CSV, JSON, and Markdown content generation.
- Browser localStorage persistence helpers.

Run `npm run test` and `npm run build` before submission.

## 11. Limitations

- SQL parsing is intentionally basic; it does not support aggregation, GROUP BY, ORDER BY, subqueries, INSERT, or multiple SQL joins.
- Relation schemas cannot be edited through the UI; only tuples are editable.
- Browser localStorage is local to one browser and not a shared database.
- Algorithms are for clarity, not performance on large relations.
- The natural join definition uses every identically named attribute, as required by relational algebra.

## 12. Future extensions

- More SQL clauses and a graphical expression builder.
- Column/schema editor with safer data migration.
- Cost comparison of hash joins and nested-loop joins.
- Animation playback with adjustable speed.
- Import CSV/JSON and local backup/restore.
- Optional AI tutor through a secure external service, never with an API key embedded in the frontend.

## 13. References

1. Elmasri, R. & Navathe, S. *Fundamentals of Database Systems*.
2. Silberschatz, A., Korth, H. & Sudarshan, S. *Database System Concepts*.
3. [Vite documentation](https://vite.dev/guide/)
4. [GitHub Pages documentation](https://docs.github.com/pages)
5. [D3 hierarchy documentation](https://d3js.org/d3-hierarchy)
