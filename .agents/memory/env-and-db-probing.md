---
name: Project env & DB probing
description: How to run ad-hoc queries against the Supabase analytics DB in this repl during development
---

# Ad-hoc Supabase queries

- The `code_execution` JS sandbox has **no** `process.env` — secrets like
  `SUPABASE_DATABASE_URL` are undefined there. Do NOT probe the DB from the sandbox.
- `bash` shell **does** have the secret env vars. Run a small node script via bash.
- `pg` (node-postgres) only resolves from the **project root** node_modules, not
  from `/tmp`. Write the throwaway script into the project root (e.g.
  `./_probe.cjs`), run `node ./_probe.cjs`, then delete it.
- Connection: `new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })`.
- Server proxy routes (`app/api/proxy/seo/*`) follow the same inline-Pool pattern
  with `runtime='nodejs'`, `dynamic='force-dynamic'`, parameterized queries, and a
  `{ data }` response envelope.
