# AI Development Log

## Tool used

OpenAI Codex (GPT-5) was used as an implementation assistant in the local project workspace.

## Primary prompt

> Build a complete, functional relational algebra visualizer as a React/Vite application that is hosted through GitHub Pages. It must have no core backend, parse and execute relational algebra in the browser, provide AST visualization, validation, SQL translation, localStorage history, exports, tests, and beginner deployment documentation.

## Purpose

Create a college DBMS learning project that can be uploaded to a GitHub repository and deployed by GitHub Actions to GitHub Pages.

## Generated implementation

- React/Vite application structure.
- GitHub Pages Actions workflow and dynamic Vite repository base path.
- JavaScript recursive-descent relational algebra parser and AST.
- Validation/execution engine for selection, projection, all requested set operations, products, joins, rename, and division.
- D3 hierarchy expression-tree component.
- Browser-only SQL translation, localStorage, exports, sample data, responsive CSS, and theme.
- Vitest automated tests and project documentation.

## Changes made during development

1. Added qualified-column resolution so `STUDENT.CourseID` and `COURSE.CourseID` remain distinct after a join.
2. Added a dedicated `STUDENT_COURSES` relation so the division example produces a clear non-empty result while preserving the required ENROLLMENT relation with Grade.
3. Used GitHub Actions environment data to set Vite’s deployment base path dynamically, avoiding a hard-coded repository name.
4. Kept all core behavior client-side; no secret, API key, server, or external database was added.

## Testing performed

- `npm run test` — Vitest operation, parser, SQL, export, and localStorage tests.
- `npm run build` — production Vite build used by the Pages workflow.

## Review responsibility

The project author should read, understand, and adapt the generated code before submitting it, and should follow their institution’s policy regarding AI-assisted coursework.
