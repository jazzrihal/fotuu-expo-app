#!/usr/bin/env bash
# Start Fotuu local development on macOS: Docker, Supabase, and a tmux workspace.
set -euo pipefail

SESSION="fotuu-dev"
DOCKER_WAIT_SECONDS=120
SUPABASE_START_ATTEMPTS=10
SUPABASE_START_RETRY_SECONDS=5

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$(cd "$REPO_ROOT/.." && pwd)/fotuu-supabase-backend"

require_command() {
  local cmd="$1"
  local hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: required command not found: $cmd" >&2
    echo "       $hint" >&2
    exit 1
  fi
}

require_command tmux "Install with: brew install tmux"
require_command lazygit "Install with: brew install lazygit"
require_command nvim "Install with: brew install neovim"
require_command agent "Install Cursor Agent CLI from Cursor settings"
require_command npm "Install Node.js from https://nodejs.org/"
require_command docker "Install Docker Desktop from https://www.docker.com/products/docker-desktop/"

if [[ -d "$BACKEND_DIR" ]]; then
  require_command supabase "Install with: brew install supabase/tap/supabase"
else
  echo "note: $BACKEND_DIR not found; skipping supabase start"
fi

if [[ ! -f "$REPO_ROOT/.env" && ! -f "$REPO_ROOT/.env.local" ]]; then
  echo "warning: no .env or .env.local found; copy .env.example and set Supabase keys" >&2
fi

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
  echo "warning: node_modules missing; run npm install before npm run ios" >&2
fi

docker_daemon_ready() {
  docker info >/dev/null 2>&1 \
    && docker ps >/dev/null 2>&1 \
    && docker info 2>/dev/null | grep -q 'Server Version'
}

supabase_containers_settled() {
  local statuses
  statuses="$(docker ps -a --filter "name=fotuu-supabase-backend" --format '{{.Status}}' 2>/dev/null || true)"
  if [[ -z "$statuses" ]]; then
    return 0
  fi

  local starting_count
  starting_count="$(printf '%s\n' "$statuses" | grep -cE '(starting|Starting|health: starting)' || true)"
  [[ "$starting_count" -eq 0 ]]
}

wait_for_docker_daemon() {
  local elapsed=0
  local interval=1

  echo "Waiting for Docker daemon..."
  while (( elapsed < DOCKER_WAIT_SECONDS )); do
    if docker_daemon_ready; then
      echo "Docker daemon is ready."
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
    if (( interval < 3 )); then
      interval=$((interval + 1))
    fi
    echo "Waiting for Docker daemon... (${elapsed}s)"
  done

  echo "error: Docker daemon did not become ready within ${DOCKER_WAIT_SECONDS}s" >&2
  return 1
}

verify_docker_can_run_containers() {
  if docker run --rm --pull=never alpine echo ok >/dev/null 2>&1 \
    || docker run --rm alpine echo ok >/dev/null 2>&1; then
    return 0
  fi

  echo "warning: container smoke test failed; continuing anyway" >&2
  return 0
}

ensure_docker() {
  if docker_daemon_ready; then
    return 0
  fi

  if [[ ! -d "/Applications/Docker.app" ]]; then
    echo "error: Docker is not running and Docker Desktop is not installed" >&2
    exit 1
  fi

  echo "Starting Docker Desktop..."
  open -a Docker
  wait_for_docker_daemon
  verify_docker_can_run_containers
}

wait_for_supabase_containers() {
  if supabase_containers_settled; then
    return 0
  fi

  local elapsed=0
  local max_wait=120
  local interval=1

  echo "Waiting for Supabase containers to finish starting..."
  while (( elapsed < max_wait )); do
    if supabase_containers_settled; then
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
    if (( interval < 3 )); then
      interval=$((interval + 1))
    fi
  done

  echo "warning: timed out waiting for Supabase containers to settle" >&2
  return 0
}

start_supabase() {
  if [[ ! -d "$BACKEND_DIR" ]]; then
    return 0
  fi

  echo "Starting local Supabase in $BACKEND_DIR..."
  wait_for_supabase_containers

  local attempt=1
  while (( attempt <= SUPABASE_START_ATTEMPTS )); do
    if (
      cd "$BACKEND_DIR"
      supabase start
    ); then
      return 0
    fi

    if (( attempt == SUPABASE_START_ATTEMPTS )); then
      echo "error: supabase start failed after ${SUPABASE_START_ATTEMPTS} attempts" >&2
      exit 1
    fi

    echo "supabase start not ready (attempt ${attempt}/${SUPABASE_START_ATTEMPTS}); retrying in ${SUPABASE_START_RETRY_SECONDS}s..."
    wait_for_supabase_containers
    sleep "$SUPABASE_START_RETRY_SECONDS"
    attempt=$((attempt + 1))
  done
}

create_tmux_session() {
  tmux new-session -d -s "$SESSION" -n shell -c "$REPO_ROOT"
  tmux new-window -t "$SESSION" -n lazygit -c "$REPO_ROOT" lazygit
  tmux new-window -t "$SESSION" -n nvim -c "$REPO_ROOT" nvim .
  tmux new-window -t "$SESSION" -n agent -c "$REPO_ROOT" agent
  tmux new-window -t "$SESSION" -n ios -c "$REPO_ROOT" bash -lc 'npm run ios'
  tmux select-window -t "$SESSION:shell"
}

ensure_docker
start_supabase

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Attaching to existing tmux session: $SESSION"
  exec tmux attach -t "$SESSION"
fi

echo "Creating tmux session: $SESSION"
create_tmux_session
exec tmux attach -t "$SESSION"
