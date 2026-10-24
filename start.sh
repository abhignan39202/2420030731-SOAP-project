#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
ENV_TEMPLATE="$PROJECT_DIR/.env.example"
build_args=()

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

case "${1:-}" in
  "") ;;
  --build) build_args=(--build) ;;
  *) fail "Usage: $0 [--build]" ;;
esac
[[ $# -le 1 ]] || fail "Usage: $0 [--build]"

has_env_value() {
  local name="$1"
  awk -F= -v key="$name" '
    $1 == key {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (value != "") found = 1
    }
    END { exit !found }
  ' "$ENV_FILE"
}

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is required. Install Docker Desktop or Docker Engine, then rerun this script."
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose is required (the 'docker compose' command was not found)."
fi

if ! docker info >/dev/null 2>&1; then
  fail "Docker is not running. Start Docker, then rerun this script."
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "Node.js and npm are required to run the frontend."
fi

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required to check backend readiness."
fi

if [[ ! -f "$ENV_FILE" ]]; then
  [[ -f "$ENV_TEMPLATE" ]] || fail "Could not find .env.example to initialize the environment."
  command -v openssl >/dev/null 2>&1 || fail "OpenSSL is required to generate initial environment secrets."

  old_umask="$(umask)"
  umask 077
  cp "$ENV_TEMPLATE" "$ENV_FILE"
  umask "$old_umask"

  sed -i \
    -e "s/^MYSQL_ROOT_PASSWORD=.*/MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)/" \
    -e "s/^MYSQL_APP_PASSWORD=.*/MYSQL_APP_PASSWORD=$(openssl rand -hex 32)/" \
    -e "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 48)/" \
    -e "s/^ADMIN_REGISTRATION_CODE=.*/ADMIN_REGISTRATION_CODE=$(openssl rand -hex 24)/" \
    "$ENV_FILE"

  printf 'Created .env with fresh local secrets. Keep this file safe; it is git-ignored.\n'
fi

for variable in MYSQL_ROOT_PASSWORD MYSQL_APP_PASSWORD JWT_SECRET; do
  has_env_value "$variable" || fail "$variable is empty in .env. Set it before starting the project."
done

if ! has_env_value ADMIN_REGISTRATION_CODE; then
  command -v openssl >/dev/null 2>&1 || fail "OpenSSL is required to generate an admin registration code."
  admin_code="$(openssl rand -hex 24)"
  if awk -F= '$1 == "ADMIN_REGISTRATION_CODE" {found = 1} END {exit !found}' "$ENV_FILE"; then
    sed -i "s/^ADMIN_REGISTRATION_CODE=.*/ADMIN_REGISTRATION_CODE=$admin_code/" "$ENV_FILE"
  else
    printf '\nADMIN_REGISTRATION_CODE=%s\n' "$admin_code" >> "$ENV_FILE"
  fi
  printf 'Generated an admin registration code in .env. Keep it private.\n'
fi

if [[ ! -x "$PROJECT_DIR/frontend/node_modules/.bin/next" || ! -x "$PROJECT_DIR/frontend/node_modules/.bin/eslint" ]]; then
  printf 'Installing frontend dependencies...\n'
  npm --prefix "$PROJECT_DIR/frontend" ci
fi

cd "$PROJECT_DIR"
cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  printf '\nStopping backend services and keeping containers for the next run...\n'
  docker compose stop
  exit "$exit_code"
}
trap cleanup EXIT

printf 'Starting backend services...\n'
docker compose up -d "${build_args[@]}"

# Compose reports a container as running before its Java app has started or
# Eureka has discovered it. Check each service through the gateway so the
# frontend opens only after its API routes are usable.
services=(
  auth-service user-service doctor-service appointment-service
  consultation-service prescription-service medicine-service pharmacy-service
  ambulance-service notification-service
)
startup_timeout="${STARTUP_TIMEOUT_SECONDS:-600}"
[[ "$startup_timeout" =~ ^[1-9][0-9]*$ ]] || fail "STARTUP_TIMEOUT_SECONDS must be a positive integer."
deadline=$((SECONDS + startup_timeout))

while true; do
  pending=()
  for service in "${services[@]}"; do
    if ! curl --silent --fail --max-time 3 --output /dev/null \
      "http://localhost:8080/$service/actuator/health"; then
      pending+=("$service")
    fi
  done

  if ((${#pending[@]} == 0)); then
    break
  fi
  if ((SECONDS >= deadline)); then
    fail "Backend readiness timed out. Check logs with: docker compose logs --tail=100 ${pending[*]}"
  fi
  printf 'Waiting for backend services: %s\n' "${pending[*]}"
  sleep 5
done

printf 'Backend services are ready.\n'
printf 'Starting frontend at http://localhost:3000\n'
cd "$PROJECT_DIR/frontend"
npm run dev
