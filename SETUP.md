# Supabase setup

Copy `.env.example` to `.env`, then set the Vite Supabase URL and publishable key. Keep `.env` private; it is ignored by Git.

In the Supabase dashboard, open **SQL Editor** and run `supabase/migrations/20260917000000_initial_schema.sql`. It creates and seeds all teaching relations, creates `query_history`, enables RLS, and adds the demo policies required by the publishable client.

Install and run the app:

```bash
npm install
npm run dev
```

Use **Reload relations** after applying the migration. The data editor persists row changes directly to Supabase. Database schema changes are migration-only, and the UI deliberately has no arbitrary SQL execution feature.
