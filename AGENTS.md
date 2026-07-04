# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud — how agents should work

**Linux Cloud VMs are not full mobile dev environments.** Do not spend setup time installing Docker, cloning `fotuu-supabase-backend`, starting local Supabase, or running Expo Metro/iOS/Android to “prove the app works.” Those steps belong on a developer Mac (or in GitHub Actions), not in the cloud agent VM bootstrap.

### Operating model (feature agents)

1. **Implement** the requested change on a branch (`cursor/<descriptive-name>-dacb`).
2. **Add or update Maestro flows** under `.maestro/` when behavior is user-visible (reuse `auth/sign-in.yaml` subflows where possible). CI runs the full suite via `npm run test:e2e` on **macOS** only.
3. **Open or update a PR** to `main` and push commits before handoff.
4. **Verify on CI** — treat a green **iOS E2E** workflow as the definition of “build and flow work.” Use `gh` to watch runs until compile + Maestro succeed, or fix failures from logs.

```bash
gh run list --branch <branch>
gh run watch <run-id>   # optional: block until complete
gh run view <run-id> --json status,conclusion,jobs,url
gh run view <run-id> --log-failed
gh pr checks <pr-number>
```

Do not mark work complete based only on local `tsc`/lint if the change affects UI or native builds — **confirm macOS jobs on the PR.**

### What this VM is for

| Do on the VM | Do not use the VM for |
| --- | --- |
| `npm ci`, `npx tsc --noEmit`, `npm run lint` (fast pre-push checks) | iOS Simulator, `expo run:ios`, Maestro, release E2E builds |
| Edit app code, `.maestro/**`, workflows | Local Supabase / Docker (unless the user explicitly asks) |
| `gh` PR + Actions monitoring | “Hello world” via Metro or signing into the app in a simulator |

**Maestro test user (CI):** `alice@example.com` / `fotuu-local-dev` (seed in `fotuu-supabase-backend`; workflow `env` may override via `E2E_EMAIL` / `E2E_PASSWORD`).

### Environment setup agent (bootstrap only)

On VM startup, run the repo **update script** (`npm ci` only). That installs Node dependencies for editing and static checks. **Do not** treat environment setup as “run the application” on this platform.

Optional, only when debugging workflow YAML:

```bash
go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml
```

Human/local dev (Mac) still uses `.env`, Supabase, Metro, and dev clients — see [README.md](README.md). Cloud agents rely on **hosted Supabase + macOS CI** for integration proof.

---

## Product overview

**Fotuu** is an Expo SDK 56 app (Expo Router, React Native 0.85) with email/password auth via Supabase. In `__DEV__` and E2E release builds (`EXPO_PUBLIC_SUPABASE_ENV=local`), `src/lib/supabase.ts` uses `EXPO_PUBLIC_SUPABASE_LOCAL_*` from `.env` (see `.env.example`).

## GitHub Actions (iOS E2E)

Workflows under `.github/workflows/`:

| Workflow | Runner | Role |
| --- | --- | --- |
| **`e2e-ios.yml`** | `ubuntu-latest` + `macos-26` | PRs to `main`: resolve/reuse `ios-e2e-app` artifact, optionally compile, reset hosted Supabase, run Maestro |
| **`e2e-ios-compile.yml`** | `macos-26` (reusable) | `npm ci` → `npm run build:e2e:ios -- --device generic --output ./build/ios-e2e` → upload artifact |

**Required GitHub secrets** (repo settings; used by CI, not the Linux agent VM):

- `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` — baked into the E2E iOS build
- `SUPABASE_ACCESS_TOKEN`, `E2E_SUPABASE_DB_PASSWORD`, `E2E_SUPABASE_PROJECT_REF`, `E2E_SUPABASE_BACKEND_TOKEN` — reset hosted DB from `jazzrihal/fotuu-supabase-backend` (or `vars.E2E_SUPABASE_BACKEND_REPOSITORY`)

**Artifact reuse:** `.github/scripts/resolve-ios-e2e-artifact.py` skips recompile when the PR only touches test-only paths (e.g. `.maestro/**`) and build inputs are unchanged since the last `ios-e2e-app` artifact.

**E2E triggers** (path filters): app source, `package-lock.json`, `.maestro/**`, workflow files — see `e2e-ios.yml`.

## Local development (humans / Mac)

| Piece | Notes |
| --- | --- |
| **Supabase** | Backend repo `fotuu-supabase-backend`; `npm run gen:types` uses `--workdir ../fotuu-supabase-backend` |
| **Metro** | `npm start` / dev client (`expo-dev-client`, not Expo Go) |
| **E2E locally** | `npm run build:e2e:ios` + `npm run test:e2e` on macOS with simulator |

### Web platform caveat

`app.json` uses `"web": { "output": "static" }` and `expo-sqlite/localStorage/install`. Expo web SSR often fails resolving `wa-sqlite.wasm`. CI does not gate on web.

---

## Local native modules (`modules/`)

Modules created with `npx create-expo-module@latest --local` live under `modules/<name>/`. Expo autolinking discovers them automatically — `expo-modules-autolinking search` and `resolve` will find them. However:

**`expo run:ios` can silently skip pod install** when it detects the `ios/` directory and `Podfile.lock` already exist, even when a new native module has been added. The new pod will be missing from `Podfile.lock` and `ios/Pods/`, and `requireOptionalNativeModule('<Name>')` will return `null` at runtime with no error.

**Diagnosis checklist** when a native module returns `null`:

```bash
# 1. Confirm autolinking finds the module
npx expo-modules-autolinking resolve --platform apple --json | python3 -c "
import sys,json; mods=json.loads(sys.stdin.read())['modules']
print([m['packageName'] for m in mods if 'location' in m['packageName']])"

# 2. Confirm the pod is in Podfile.lock
grep '<PodName>' ios/Podfile.lock

# 3. Confirm the pod is installed
ls ios/Pods/<PodName>
```

**Fix:** run pod install directly — `expo run:ios` will NOT do this automatically when Podfile.lock already exists:

```bash
npx pod-install          # or: cd ios && pod install
npx expo run:ios         # rebuild with the newly installed pod
```

Do this every time a module is added to `modules/` or `expo-module.config.json` is changed.
