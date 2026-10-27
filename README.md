# Relational Algebra Visualizer

An interactive React/Vite teaching tool for relational algebra. It parses algebra or a small SQL `SELECT` subset into an AST, executes it in the browser, visualizes intermediate relations, and persists the teaching relations and query history in Supabase PostgreSQL.

## Features

- Selection, projection, union, difference, product, rename, intersection, theta/equi join, natural join, and division.
- Browser-side parser, executor, expression tree, execution timeline, reports, and raw-result exports.
- Supabase-backed relation loading, row create/update/delete, refresh, and persistent query history.
- Fixed, reviewed database schema with seeded teaching data. Schema editing and arbitrary SQL execution are intentionally not exposed in the browser.

## Setup

1. Create `.env` from `.env.example`.
2. Add the Supabase project URL and publishable key using the `VITE_` variables shown there.
3. Apply `supabase/migrations/20260917000000_initial_schema.sql` in the Supabase SQL Editor, or deploy it with the Supabase CLI.
4. Run `npm install` and `npm run dev`.

The `.env` file is ignored by Git. Do not place service-role credentials in it or in frontend code.

## Commands

```bash
npm run dev
npm run test
npm run build
```

## Architecture

```text
React/Vite → Supabase JavaScript client → Supabase → PostgreSQL
```

The centralized client is in `src/services/supabase.js`; relation and history operations are in `src/services/api.js`.

## Security

The initial migration enables RLS for every table and provides anonymous demo CRUD policies so a class can use the app without authentication. That is appropriate only for non-sensitive shared demo data. For a deployed multi-user app, add authentication and replace these policies with owner-scoped policies before collecting user data.
