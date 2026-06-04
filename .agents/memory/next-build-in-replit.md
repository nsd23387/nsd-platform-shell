---
name: Running next build in this Replit env
description: How to run `npm run build` (Next.js) reliably here without it dying silently or corrupting the dev server.
---

# Running `next build` in this environment

Verifying `npm run build` is clean is a recurring acceptance gate. Two non-obvious
traps make a naive `nohup npm run build &` from the bash tool fail with NO error
output (build log stops at "Creating an optimized production build...", only
`routes-manifest.json` + `package.json` end up in `.next`, and a trailing
`echo BUILD_EXIT=$?` never prints — i.e. the process was SIGKILLed, not a normal exit):

1. **The dev server shares `.next`.** The `Next.js Dev Server` workflow and a
   concurrent `next build` both read/write the same `.next/`. `next build` wipes
   `.next` at start, which makes the running dev server throw
   `ENOENT .next/server/middleware-manifest.json` and `Cannot find module './NNNN.js'`,
   and the dev server rewriting `.next` mid-build stalls the build at the banner.
2. **nohup/background processes from the bash tool get killed by the tool lifecycle.**
   A build started with `nohup ... &` is SIGKILLed when the bash call ends or
   times out — even with plenty of free memory and `oom_kill 0`. It is NOT OOM.
3. (Secondary) dev + build together can exceed the 8GB cgroup and OOM. Killing the
   TypeScript language servers (`tsserver.js`, `typescript-language-server`) frees
   ~1GB if you ever do need them running side by side. Note: `pkill -f tsserver`
   will also kill your own bash shell (exit 143) — scope the pattern carefully.

**Why:** the bash tool does not give a persistent process host; only workflows persist.

**How to apply — run the build as a temporary managed workflow:**
- `configureWorkflow({ name: "Build", command: "rm -rf .next && npm run build", outputType: "console", autoStart: true })`
- Poll `getWorkflowStatus({ name: "Build" })` until `state` is `finished` (exit 0) or `failed`.
- Then `removeWorkflow({ name: "Build" })` and recreate the dev workflow:
  `configureWorkflow({ name: "Next.js Dev Server", command: "npm run dev -- -p 5000 -H 0.0.0.0", waitForPort: 5000, outputType: "webview" })`.
- A full build here takes several minutes and sits a long time on the optimize phase — that is normal, not a hang.
