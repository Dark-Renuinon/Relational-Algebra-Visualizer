# RA•VISION — Relational Algebra Visualizer

A responsive, browser-only teaching application for understanding relational algebra through executable expressions, relational tables, and step-by-step visual explanations.

## Run

Open `index.html` in a current Chrome, Edge, Firefox, or Safari browser. No installation or server is needed.

## Features

- Parses and executes `σ` selection, `π` projection, `⋈` natural join, `∪` union, `∩` intersection, `−` difference, and `×` Cartesian product.
- Validates relation names, attributes, conditions, join compatibility, and set-operation schemas.
- Shows an execution pipeline, result relation, narrated steps, tutorial theory, five sample queries, saved local history, dark mode, and downloadable text/CSV-style report.
- Includes a seeded university database: `Students`, `Courses`, and `Enrollments`.

## Example expressions

| Goal | Expression | Expected output |
|---|---|---|
| CS sophomores | `π name, major (σ major = CS AND year = 2 (Students))` | Aarav and Kabir |
| Course roster | `π name, title (Students ⋈ Enrollments ⋈ Courses)` | 5 student-course tuples |
| CS courses | `σ dept = CS (Courses)` | Databases; Algorithms |
| First-year or Physics | `σ year = 1 (Students) ∪ σ major = Physics (Students)` | Meera (once) |
| Enrolled matches | `Students ⋈ Enrollments` | Student data plus course / semester |

## Algorithm notes

Selections scan each tuple, `O(n)`. Projection scans tuples and uses a set to de-duplicate, average `O(n)`. This educational implementation uses a nested-loop natural join, `O(nm)`, for transparency. Production DBMS engines commonly use hash joins (`O(n+m)` average) or sort-merge joins where appropriate.

## Project files

- `index.html` — accessible semantic interface.
- `styles.css` — responsive visual system and dark mode.
- `app.js` — parser, evaluator, renderer, validation, history and exporting.
- `docs/USER_MANUAL.md`, `docs/AI_USAGE_LOG.md`, `docs/TEST_CASES.md` — supporting deliverables.
- `docs/DEMO_RECORDING.md` — repeatable screenshot/video capture sequence.

## References

- Elmasri & Navathe, *Fundamentals of Database Systems*, relational model chapters.
- Silberschatz, Korth & Sudarshan, *Database System Concepts*, query processing chapters.
- [PostgreSQL documentation: SELECT](https://www.postgresql.org/docs/current/sql-select.html).
