# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

### Product overview

**Fotuu** is an Expo SDK 56 app (Expo Router, React Native 0.85) with email/password auth via Supabase. In `__DEV__`, `src/lib/supabase.ts` always uses `EXPO_PUBLIC_SUPABASE_LOCAL_*` from `.env` (see `.env.example`).

### Services

| Service | Required for dev | Start |
| --- | --- | --- |
| **Docker** (`dockerd` + `fuse-overlayfs`) | Yes (for local Supabase) | Start `dockerd` if the socket is unavailable; Cloud VMs often need `storage-driver: fuse-overlayfs` and `iptables-legacy`. |
| **Local Supabase** | Yes for auth in dev | `npx supabase start` (first run: `npx supabase init` if `supabase/` is missing). Studio: http://127.0.0.1:54323 |
| **Expo Metro** | Yes | `npm start` or `npx expo start` (use tmux for long-running dev servers) |
| **iOS/Android simulator or dev build** | For native UI / Maestro E2E | `npm run ios` / `npm run android` (requires `expo-dev-client`; not Expo Go) |

### Environment

1. `cp .env.example .env`
2. After `supabase start`, run `npx supabase status` and set `EXPO_PUBLIC_SUPABASE_LOCAL_URL` and `EXPO_PUBLIC_SUPABASE_LOCAL_PUBLISHABLE_KEY` in `.env` (local keys are **not** the long-lived JWT in `.env.example`; they look like `sb_publishable_…`).
3. E2E Maestro flows sign in with seed user `alice@example.com` / `fotuu-local-dev` from `fotuu-supabase-backend` (defined in each flow’s `env` block; run `supabase db reset` in the backend repo if auth tests fail after a reset).

### Lint / typecheck / tests

- **Typecheck:** `npx tsc --noEmit`
- **DB types:** `npm run gen:types` (requires local Supabase in sibling `../fotuu-supabase-backend` with migrations applied)
- **Lint:** `npm run lint` (`expo lint`). This repo has `eslint.config.js` but ESLint may not be in `package.json` until you run `npx expo install eslint eslint-config-expo -- --save-dev` (README). Pre-existing lint issues: `react/no-unescaped-entities` in sign-in / home screens.
- **E2E:** `npm run test:e2e` (Maestro; needs a release dev build and simulator/device).

### Cloud agent completion checklist

When a cloud agent changes code or CI:

1. Create or update the PR for the working branch before handing off.
2. Run the local checks that match the change, at minimum `npx tsc --noEmit` for app code and `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml` for workflow changes.
3. Push the branch and follow the GitHub Actions checks with `gh run list --branch <branch>` and `gh run view <run-id> --json status,conclusion,jobs,url`.
4. If the macOS build or iOS E2E workflow fails, inspect the failed job logs with `gh run view <run-id> --log-failed`, fix the failure, commit, push, and repeat until the relevant checks pass or the remaining failure is clearly outside the repo.
5. For iOS E2E, expect the workflow to reset the hosted Supabase test project from the backend migrations/seed, compile or reuse the `ios-e2e-app` artifact as needed, boot a simulator, install the app, and run Maestro. Do not stop after only adding YAML; verify the run behavior.

### Web platform caveat

`app.json` sets `"web": { "output": "static" }` and the app imports `expo-sqlite/localStorage/install` for Supabase session storage. **Expo web SSR often fails** with Metro unable to resolve `expo-sqlite/web/wa-sqlite/wa-sqlite.wasm` (HTTP 500 on http://localhost:8081). Prefer **native dev builds** or simulators for UI work; verify auth with Supabase Studio or the Auth API. Metro on port 8081 still serves native bundles for development builds.

### Typical dev commands

See [README.md](README.md): `npm install`, `npm start`, `npm run web`, `npm run ios`, `npm run android`.
