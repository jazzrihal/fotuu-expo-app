# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

### Product overview

**Fotuu** is an Expo SDK 56 app (Expo Router, React Native 0.85) with email/password auth via Supabase. In `__DEV__` and E2E release builds (`EXPO_PUBLIC_SUPABASE_ENV=local`), `src/lib/supabase.ts` uses `EXPO_PUBLIC_SUPABASE_LOCAL_*` from `.env` (see `.env.example`).

### GitHub Actions (iOS E2E)

Workflows live under `.github/workflows/`:

| Workflow | Runner | Role |
| --- | --- | --- |
| **`e2e-ios.yml`** | `ubuntu-latest` + `macos-26` | PRs to `main`: resolve/reuse `ios-e2e-app` artifact, optionally compile, reset hosted Supabase, run Maestro |
| **`e2e-ios-compile.yml`** | `macos-26` (reusable) | `npm ci` → `npm run build:e2e:ios -- --device generic --output ./build/ios-e2e` → upload `ios-e2e-app` tarball |

**This Linux Cloud VM cannot run those macOS jobs.** Native compile and simulator E2E only run on GitHub `macos-26`. Use `gh` to watch PR checks:

```bash
gh run list --branch <branch>
gh run view <run-id> --json status,conclusion,jobs,url
gh run view <run-id> --log-failed
```

**Required GitHub secrets** (repo settings; not available in the agent VM by default):

- `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` — baked into the E2E iOS build
- `SUPABASE_ACCESS_TOKEN`, `E2E_SUPABASE_DB_PASSWORD`, `E2E_SUPABASE_PROJECT_REF`, `E2E_SUPABASE_BACKEND_TOKEN` — reset hosted DB from `jazzrihal/fotuu-supabase-backend` (or `vars.E2E_SUPABASE_BACKEND_REPOSITORY`)

**Maestro credentials in CI** (workflow `env`; flows default to the same): `alice@example.com` / `fotuu-local-dev` (seed in `fotuu-supabase-backend`).

**Artifact reuse:** `.github/scripts/resolve-ios-e2e-artifact.py` skips recompile when the latest PR commit only touches test-only paths (e.g. `.maestro/**`) and build inputs are unchanged since the last `ios-e2e-app` artifact.

### Services (local agent VM)

| Service | Required for dev | Start |
| --- | --- | --- |
| **Docker** (`dockerd` + `fuse-overlayfs`) | Yes (optional local Supabase) | Start `dockerd` if needed; Cloud VMs often need `storage-driver: fuse-overlayfs` and `iptables-legacy`. |
| **Local Supabase** | Optional (hosted project used in CI) | `npx supabase@2.104.0 start` in app or `../fotuu-supabase-backend` |
| **Expo Metro** | Yes | `npm start` (tmux for long-running servers) |
| **iOS/Android** | UI / local Maestro | Not on Linux VM; use GitHub macOS workflows or a Mac |

### Environment

1. `cp .env.example .env`
2. Local keys: `npx supabase status` → set `EXPO_PUBLIC_SUPABASE_LOCAL_*` (often `sb_publishable_…`, not the demo JWT in `.env.example`).
3. **Backend repo:** clone `fotuu-supabase-backend` next to this app (`../fotuu-supabase-backend`) for `npm run gen:types` and seed-aligned Maestro (`alice@example.com` / `fotuu-local-dev`). Run `supabase db reset` there after pulling migrations.
4. Match CI Node when debugging version issues: **Node 22.13.x** (see `e2e-ios-compile.yml`).

### Lint / typecheck / tests (run on this VM)

- **Install deps (same as CI):** `npm ci`
- **Typecheck:** `npx tsc --noEmit`
- **Workflow lint:** `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml`
- **DB types:** `npm run gen:types` (needs local Supabase + sibling backend repo)
- **Lint:** `npm run lint` — install ESLint first if missing: `npx expo install eslint eslint-config-expo -- --save-dev`
- **Maestro / iOS E2E:** not runnable on Linux; verify via `gh run` on a PR

### Cloud agent completion checklist

When changing app code or CI:

1. Open or update a PR before handoff.
2. Run `npm ci`, `npx tsc --noEmit`, and actionlint for workflow edits.
3. Push and monitor `gh run list --branch <branch>` until macOS compile + E2E pass or failures are explained.
4. Do not assume YAML alone is done — confirm the macOS jobs on the PR.

### Web platform caveat

`app.json` uses `"web": { "output": "static" }` and `expo-sqlite/localStorage/install`. Expo web SSR often fails resolving `wa-sqlite.wasm` (HTTP 500). Prefer native dev builds; CI does not gate on web.

### Typical dev commands

See [README.md](README.md): `npm ci`, `npm start`, `npm run ios` / `android` (Mac only), `npm run build:e2e:ios` (Mac only; CI adds `--device generic --output ./build/ios-e2e`).
