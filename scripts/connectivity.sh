#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./scripts/connectivity.sh [options]

Generate shared API credentials for the VirtualBank services, write local
configuration files, and verify that the primary HTTP endpoints are reachable.

Options:
  --middleware-url <url>   Middleware base URL (default: http://localhost:8080)
  --frontend-url <url>     Frontend base URL (default: http://localhost:5173)
  --stockmarket-url <url>  Stockmarket base URL (default: http://localhost:8100)
  --api-key-id <id>        API key identifier (default: automation-service)
  --api-key <secret>       API key secret (random when omitted)
  --api-key-header <name>  API key header name (default: x-api-key)
  --session-header <name>  Session header name (default: x-session-id)
  --skip-checks            Generate files without performing HTTP checks
  --force                  Overwrite existing connection files
  --deep-check             Attempt authenticated middleware endpoints (may fail
                           if datastores are offline)
  -h, --help               Show this help message
USAGE
}

log() { printf '[%(%Y-%m-%dT%H:%M:%S%z)T] %s\n' -1 "$*"; }
warn() { log "WARN: $*"; }
error() { log "ERROR: $*" >&2; }

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Required command '$1' not found. $2"
    exit 1
  fi
}

strip_trailing_slash() {
  local value="$1"
  while [[ "$value" == */ && "$value" != "http://" && "$value" != "https://" ]]; do
    value="${value%/}"
  done
  printf '%s' "$value"
}

generate_secret() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
    return
  fi
  if command -v python >/dev/null 2>&1; then
    python - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
    return
  fi
  dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n'
}

generate_uuid() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
    return
  fi
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen
    return
  fi
  printf 'session-%s' "$(date +%s%N)"
}

check_endpoint() {
  local name="$1"
  local url="$2"
  local required="$3"
  shift 3
  local tmp
  tmp="$(mktemp)"
  local http_code
  if ! http_code="$(curl -sS -o "$tmp" -w '%{http_code}' "$@" "$url" 2>"${tmp}.err")"; then
    http_code="000"
  fi
  local status=$((10#${http_code:-0}))
  local body="$(<"$tmp")"
  local err="$(<"${tmp}.err" 2>/dev/null || true)"
  rm -f "$tmp" "${tmp}.err"

  if (( status >= 200 && status < 300 )); then
    log "✔ ${name} responded with HTTP ${status}"
    return 0
  fi

  if [[ "$required" == "optional" && status -ne 0 ]]; then
    warn "${name} returned HTTP ${status}. Response: ${body}"
    return 0
  fi

  error "${name} check failed (HTTP ${status}). Response: ${body}${err:+ | ${err}}"
  exit 1
}

check_protected_endpoint() {
  local url="$1"
  local api_header="$2"
  local api_secret="$3"
  local session_header="$4"
  local session_id="$5"
  local description="$6"
  local tmp
  tmp="$(mktemp)"
  local http_code
  if ! http_code="$(curl -sS -o "$tmp" -w '%{http_code}' -H "${api_header}: ${api_secret}" -H "${session_header}: ${session_id}" "$url" 2>"${tmp}.err")"; then
    http_code="000"
  fi
  local status=$((10#${http_code:-0}))
  local body="$(<"$tmp")"
  local err="$(<"${tmp}.err" 2>/dev/null || true)"
  rm -f "$tmp" "${tmp}.err"

  case $status in
    200|202|204|400|404|409)
      log "✔ ${description} responded with HTTP ${status}"
      ;;
    401|403)
      error "${description} rejected the generated credentials (HTTP ${status}). Response: ${body}"
      exit 1
      ;;
    0)
      error "${description} request failed: ${body}${err:+ | ${err}}"
      exit 1
      ;;
    *)
      warn "${description} returned HTTP ${status}. Response: ${body}"
      ;;
  esac
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIDDLEWARE_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:5173"
STOCKMARKET_URL="http://localhost:8100"
API_KEY_ID="automation-service"
API_KEY_SECRET=""
API_KEY_HEADER="x-api-key"
SESSION_HEADER="x-session-id"
FORCE=0
DEEP_CHECK=0
SKIP_CHECKS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --middleware-url)
      MIDDLEWARE_URL="$2"
      shift 2
      ;;
    --frontend-url)
      FRONTEND_URL="$2"
      shift 2
      ;;
    --stockmarket-url)
      STOCKMARKET_URL="$2"
      shift 2
      ;;
    --api-key-id)
      API_KEY_ID="$2"
      shift 2
      ;;
    --api-key)
      API_KEY_SECRET="$2"
      shift 2
      ;;
    --api-key-header)
      API_KEY_HEADER="$2"
      shift 2
      ;;
    --session-header)
      SESSION_HEADER="$2"
      shift 2
      ;;
    --skip-checks)
      SKIP_CHECKS=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --deep-check)
      DEEP_CHECK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_command curl "Install curl to probe service endpoints."

if [[ -z "$API_KEY_SECRET" ]]; then
  API_KEY_SECRET="$(generate_secret)"
  log "Generated API secret for '${API_KEY_ID}'."
fi

MIDDLEWARE_URL="$(strip_trailing_slash "$MIDDLEWARE_URL")"
FRONTEND_URL="$(strip_trailing_slash "$FRONTEND_URL")"
STOCKMARKET_URL="$(strip_trailing_slash "$STOCKMARKET_URL")"

ROLES="bank:transfers:read|bank:transfers:write|bank:credits:write|market:orders:write|sessions:stream:subscribe|system:metrics:read"
AUTH_API_KEYS_VALUE="${API_KEY_ID}:${API_KEY_SECRET}:${ROLES}"

stock_ws_scheme="${STOCKMARKET_URL%%://*}"
stock_ws_suffix="${STOCKMARKET_URL#*://}"
case "$stock_ws_scheme" in
  http)
    STOCKMARKET_WS_URL="ws://${stock_ws_suffix%/}/ws/ticks"
    ;;
  https)
    STOCKMARKET_WS_URL="wss://${stock_ws_suffix%/}/ws/ticks"
    ;;
  ws|wss)
    STOCKMARKET_WS_URL="${STOCKMARKET_URL%/}/ws/ticks"
    ;;
  *)
    STOCKMARKET_WS_URL="${STOCKMARKET_URL%/}/ws/ticks"
    ;;
esac

ROOT_ENV_FILE="${ROOT_DIR}/connection.env"
MW_ENV_FILE="${ROOT_DIR}/app/middleware/.env.connection"
FRONTEND_ENV_FILE="${ROOT_DIR}/app/frontend/.env.connection"
STOCKMARKET_ENV_FILE="${ROOT_DIR}/app/stockmarket/.env.connection"

maybe_overwrite() {
  local file="$1"
  if [[ -f "$file" && $FORCE -eq 0 ]]; then
    error "File '$file' already exists. Re-run with --force to overwrite."
    exit 1
  fi
}

maybe_overwrite "$ROOT_ENV_FILE"
maybe_overwrite "$MW_ENV_FILE"
maybe_overwrite "$FRONTEND_ENV_FILE"
maybe_overwrite "$STOCKMARKET_ENV_FILE"

cat >"$ROOT_ENV_FILE" <<EOF
# Autogenerated by scripts/connectivity.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
AUTH_API_KEYS="${AUTH_API_KEYS_VALUE}"
AUTH_API_KEY_HEADER="${API_KEY_HEADER}"
AUTH_SESSION_HEADER="${SESSION_HEADER}"
MIDDLEWARE_PUBLIC_BASE_URL="${MIDDLEWARE_URL}"
MIDDLEWARE_STOCKMARKET_BASE_URL="${STOCKMARKET_URL}"
VITE_MIDDLEWARE_BASE_URL="${MIDDLEWARE_URL}"
VITE_MIDDLEWARE_API_KEY="${API_KEY_SECRET}"
VITE_MIDDLEWARE_API_KEY_HEADER="${API_KEY_HEADER}"
VITE_MIDDLEWARE_SESSION_HEADER="${SESSION_HEADER}"
STOCKMARKET_MIDDLEWARE_BASE_URL="${MIDDLEWARE_URL}"
EOF

cat >"$MW_ENV_FILE" <<EOF
# Autogenerated by scripts/connectivity.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
AUTH_API_KEYS="${AUTH_API_KEYS_VALUE}"
AUTH_API_KEY_HEADER="${API_KEY_HEADER}"
AUTH_SESSION_HEADER="${SESSION_HEADER}"
PUBLIC_BASE_URL="${MIDDLEWARE_URL}"
STOCKMARKET_BASE_URL="${STOCKMARKET_URL}"
STOCKMARKET_WS_URL="${STOCKMARKET_WS_URL}"
EOF

cat >"$FRONTEND_ENV_FILE" <<EOF
# Autogenerated by scripts/connectivity.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
VITE_MIDDLEWARE_BASE_URL="${MIDDLEWARE_URL}"
VITE_MIDDLEWARE_API_KEY="${API_KEY_SECRET}"
VITE_MIDDLEWARE_API_KEY_HEADER="${API_KEY_HEADER}"
VITE_MIDDLEWARE_SESSION_HEADER="${SESSION_HEADER}"
EOF

cat >"$STOCKMARKET_ENV_FILE" <<EOF
# Autogenerated by scripts/connectivity.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
STOCKMARKET_MIDDLEWARE_BASE_URL="${MIDDLEWARE_URL}"
EOF

chmod 600 "$ROOT_ENV_FILE" "$MW_ENV_FILE" "$FRONTEND_ENV_FILE" "$STOCKMARKET_ENV_FILE" 2>/dev/null || true

log "Wrote connection environment files:"
log "  - ${ROOT_ENV_FILE}"
log "  - ${MW_ENV_FILE}"
log "  - ${FRONTEND_ENV_FILE}"
log "  - ${STOCKMARKET_ENV_FILE}"

if (( SKIP_CHECKS )); then
  log "Skipping connectivity checks (--skip-checks requested)."
else
  check_endpoint "Middleware live probe" "${MIDDLEWARE_URL}/health/live" required
  check_endpoint "Stockmarket live probe" "${STOCKMARKET_URL}/health/live" optional
  check_endpoint "Frontend availability" "${FRONTEND_URL}" optional -L

  SESSION_TOKEN="$(generate_uuid)"
  check_protected_endpoint "${MIDDLEWARE_URL}/api/v1/transfers/__connection-check" "${API_KEY_HEADER}" "${API_KEY_SECRET}" "${SESSION_HEADER}" "${SESSION_TOKEN}" "Protected middleware request"

  if (( DEEP_CHECK )); then
    check_endpoint "Middleware readiness" "${MIDDLEWARE_URL}/health/ready" required
  fi

  log "Connection checks completed. Use 'docker compose --env-file connection.env -f middleware-compose.yml up --build' to launch the stack with the generated credentials."
fi
