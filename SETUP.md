# Supabase setup

Copy `.env.example` to `.env`, then set `VITE_SUPABASE_URL` and the project's Supabase anon key. Keep `.env` private; it is ignored by Git. The example URL is prefilled with this project's reference.

The AI quiz and tutor call the `gemini-tutor` Edge Function. Keep `GEMINI_API_KEY` as a Supabase Edge Function secret; never add it to `.env` or frontend code. The function source now validates requests and generated question sets and requires JWT verification. Redeploy it after pulling these changes:

```bash
supabase functions deploy gemini-tutor --project-ref rvhdznuwyhliydgkmpor
```

The `GEMINI_API_KEY` secret must already be configured for that Supabase project.

On a primary HTTP 503, the function switches to `gemini-3.6-flash` using the same API key and Gemini API endpoint. If that fallback also returns HTTP 503, it waits briefly with jitter and retries the fallback once. This stable production model is the default fallback. To choose another supported model, set the server-side `GEMINI_FALLBACK_MODEL` Function secret; do not put it in the Vite environment. For example:

```bash
supabase secrets set GEMINI_FALLBACK_MODEL=gemini-3.6-flash --project-ref rvhdznuwyhliydgkmpor
```

All attempts share one overall timeout budget, so fallback and its single retry do not add another timeout window. HTTP errors other than 503 do not trigger fallback or retry.

The Edge Function uses a 110-second Gemini request timeout by default. To tune it, set the server-side Edge Function environment variable `GEMINI_TIMEOUT_MS` (milliseconds); values below 5,000 use the default and values above 120,000 are capped at 120,000. The cap leaves room before Supabase's 150-second request idle timeout. This setting belongs in Supabase Function secrets/configuration, not in the Vite frontend environment.

In the Supabase dashboard, open **SQL Editor** and run `supabase/migrations/20260917000000_initial_schema.sql`. It creates and seeds all teaching relations, creates `query_history`, enables RLS, and adds the demo policies required by the publishable client.

Install and run the app:

```bash
npm install
npm run dev
```

Use **Reload relations** after applying the migration. The data editor persists row changes directly to Supabase. Database schema changes are migration-only, and the UI deliberately has no arbitrary SQL execution feature.
