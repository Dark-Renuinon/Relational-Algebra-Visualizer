# Relational Algebra Visualizer — Project Documentation

## Architecture

```text
React/Vite client → Supabase JavaScript client → Supabase PostgreSQL
```

The parser, AST generation, relational-algebra executor, SQL-to-algebra translator, D3 expression tree, timeline, and report exporters run in the browser. Relations and query history are loaded and saved through the centralized Supabase client.

## Supported learning features

The visualizer supports selection, projection, union, difference, Cartesian product, rename, intersection, theta/equi join, natural join, and division. It validates expressions, evaluates operations bottom-up, records intermediate relations, and displays each step in the tree and timeline. The SQL input translates only the documented `SELECT` subset to relational algebra.

## Data model

The migration creates seeded fixed relations: `students`, `courses`, `faculty`, `enrollments`, `student_courses`, `cse_students`, `ece_students`, and `required_courses`. It also creates `query_history` for the latest executed expressions and outcomes. The application maps these tables to the uppercase relation names used by the parser.

Schema editing and arbitrary SQL execution are deliberately unavailable in the browser. This prevents a publishable client from performing unreviewed DDL or arbitrary database commands. Schema changes belong in reviewed Supabase migrations.

## Security

Every table has RLS enabled. The initial migration includes anonymous full-access policies for a non-sensitive shared classroom demo, because this project has no authentication model. Before using real or user-specific data, enable authentication and replace those policies with owner-scoped policies.

## Development

Set the Vite Supabase environment variables in `.env`, apply the migration, then run `npm install`, `npm run test`, and `npm run build`. The `.env` file is ignored and must contain no privileged credentials.
