#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/AsaTyr2018/VirtualBank"
INSTALL_DIR="/opt/VirtualBank"
COMPOSE_FILE="middleware-compose.yml"
STOCKMARKET_COMPOSE="stockmarket-compose.yml"
DATASTORE_COMPOSE="apps/datastore/datastore-compose.yml"
POSTGRES_PRIMARY_CONTAINER="vb-postgres-primary"
POSTGRES_DATABASE="virtualbank"
POSTGRES_USER="vb_app"
POSTGRES_PASSWORD="vb_app_password"
CONNECTION_ENV_FILE="connection.env"
CONNECTIVITY_SCRIPT="scripts/connectivity.sh"

PARSED_API_KEY_ID=""
PARSED_API_KEY_SECRET=""
PARSED_API_KEY_HEADER=""
PARSED_SESSION_HEADER=""

middleware_public_url() {
  if [[ -n "${VIRTUALBANK_MIDDLEWARE_URL:-}" ]]; then
    printf '%s' "${VIRTUALBANK_MIDDLEWARE_URL}"
  else
    printf 'http://localhost:%s' "${VIRTUALBANK_MIDDLEWARE_PORT:-8080}"
  fi
}

frontend_public_url() {
  if [[ -n "${VIRTUALBANK_FRONTEND_URL:-}" ]]; then
    printf '%s' "${VIRTUALBANK_FRONTEND_URL}"
  else
    local port
    port="${VIRTUALBANK_FRONTEND_PORT:-${MIDDLEWARE_FRONTEND_WEB_PORT:-5174}}"
    printf 'http://localhost:%s' "$port"
  fi
}

stockmarket_public_url() {
  if [[ -n "${VIRTUALBANK_STOCKMARKET_URL:-}" ]]; then
    printf '%s' "${VIRTUALBANK_STOCKMARKET_URL}"
  else
    printf 'http://localhost:%s' "${VIRTUALBANK_STOCKMARKET_PORT:-8100}"
  fi
}

reset_parsed_credentials() {
  PARSED_API_KEY_ID=""
  PARSED_API_KEY_SECRET=""
  PARSED_API_KEY_HEADER=""
  PARSED_SESSION_HEADER=""
}

parse_existing_credentials() {
  local file="$1"
  reset_parsed_credentials
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  local auth_line
  auth_line=$(grep '^AUTH_API_KEYS=' "$file" | head -n1 || true)
  if [[ -z "$auth_line" ]]; then
    return 1
  fi
  auth_line="${auth_line#AUTH_API_KEYS=}"
  auth_line="${auth_line%$'\r'}"
  auth_line="${auth_line//\"/}"
  IFS=':' read -r PARSED_API_KEY_ID PARSED_API_KEY_SECRET _ <<<"$auth_line"
  if [[ -z "$PARSED_API_KEY_ID" || -z "$PARSED_API_KEY_SECRET" ]]; then
    reset_parsed_credentials
    return 1
  fi
  local header_line session_line
  header_line=$(grep '^AUTH_API_KEY_HEADER=' "$file" | head -n1 || true)
  if [[ -n "$header_line" ]]; then
    PARSED_API_KEY_HEADER="${header_line#AUTH_API_KEY_HEADER=}"
    PARSED_API_KEY_HEADER="${PARSED_API_KEY_HEADER%$'\r'}"
    PARSED_API_KEY_HEADER="${PARSED_API_KEY_HEADER//\"/}"
  fi
  session_line=$(grep '^AUTH_SESSION_HEADER=' "$file" | head -n1 || true)
  if [[ -n "$session_line" ]]; then
    PARSED_SESSION_HEADER="${session_line#AUTH_SESSION_HEADER=}"
    PARSED_SESSION_HEADER="${PARSED_SESSION_HEADER%$'\r'}"
    PARSED_SESSION_HEADER="${PARSED_SESSION_HEADER//\"/}"
  fi
  return 0
}

generate_connection_bundle() {
  local skip_checks="${1:-0}"
  local script_path="${INSTALL_DIR}/${CONNECTIVITY_SCRIPT}"
  local connection_file="${INSTALL_DIR}/${CONNECTION_ENV_FILE}"
  if [[ ! -f "$script_path" ]]; then
    error "Connectivity automation script not found at ${script_path}."
    exit 1
  fi

  local middleware_url frontend_url stockmarket_url
  middleware_url="$(middleware_public_url)"
  frontend_url="$(frontend_public_url)"
  stockmarket_url="$(stockmarket_public_url)"

  local args=(--middleware-url "$middleware_url" --frontend-url "$frontend_url" --stockmarket-url "$stockmarket_url")
  if (( skip_checks )); then
    args+=(--skip-checks)
  fi

  local api_key_id api_key_secret api_key_header session_header
  api_key_id="${VIRTUALBANK_API_KEY_ID:-}"
  api_key_secret="${VIRTUALBANK_API_KEY_SECRET:-}"
  api_key_header="${VIRTUALBANK_API_KEY_HEADER:-}"
  session_header="${VIRTUALBANK_SESSION_HEADER:-}"

  if [[ -z "$api_key_id" || -z "$api_key_secret" || -z "$api_key_header" || -z "$session_header" ]]; then
    if parse_existing_credentials "$connection_file"; then
      if [[ -z "$api_key_id" ]]; then
        api_key_id="$PARSED_API_KEY_ID"
      fi
      if [[ -z "$api_key_secret" ]]; then
        api_key_secret="$PARSED_API_KEY_SECRET"
      fi
      if [[ -z "$api_key_header" && -n "$PARSED_API_KEY_HEADER" ]]; then
        api_key_header="$PARSED_API_KEY_HEADER"
      fi
      if [[ -z "$session_header" && -n "$PARSED_SESSION_HEADER" ]]; then
        session_header="$PARSED_SESSION_HEADER"
      fi
    fi
  fi

  if [[ -n "$api_key_id" ]]; then
    args+=(--api-key-id "$api_key_id")
  fi
  if [[ -n "$api_key_secret" ]]; then
    args+=(--api-key "$api_key_secret")
  fi
  if [[ -n "$api_key_header" ]]; then
    args+=(--api-key-header "$api_key_header")
  fi
  if [[ -n "$session_header" ]]; then
    args+=(--session-header "$session_header")
  fi

  if [[ -f "$connection_file" ]]; then
    args+=(--force)
    log "Refreshing connectivity bundle with existing API credentials."
  else
    log "Generating new connectivity bundle with shared API credentials."
  fi

  (cd "$INSTALL_DIR" && bash "$script_path" "${args[@]}")
}

wait_for_container_ready() {
  local container="$1"
  local timeout="${2:-180}"
  local start
  start=$(date +%s)
  while (( $(date +%s) - start < timeout )); do
    if ! docker inspect "$container" >/dev/null 2>&1; then
      sleep 3
      continue
    fi
    local state health
    state=$(docker inspect --format '{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
    health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}healthy{{end}}' "$container" 2>/dev/null || echo "unknown")
    if [[ "$state" == "running" && ( "$health" == "healthy" || "$health" == "none" || -z "$health" ) ]]; then
      log "Container ${container} is running (health: ${health})."
      return 0
    fi
    sleep 3
  done
  error "Container ${container} failed to become ready within ${timeout} seconds."
  return 1
}

wait_for_http_endpoint() {
  local url="$1"
  local description="$2"
  local timeout="${3:-180}"
  local interval="${4:-5}"
  local start
  start=$(date +%s)
  while (( $(date +%s) - start < timeout )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "${description} is reachable at ${url}."
      return 0
    fi
    sleep "$interval"
  done
  error "${description} did not become reachable at ${url} within ${timeout} seconds."
  return 1
}

log() { printf "[%(%Y-%m-%dT%H:%M:%S%z)T] %s\n" -1 "$*"; }
error() { log "ERROR: $*" >&2; }
warn() { log "WARN: $*"; }

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    error "This script must be run as root."
    exit 1
  fi
}

has_command() { command -v "$1" >/dev/null 2>&1; }

PACKAGE_MANAGER=""

detect_package_manager() {
  if [[ -n "${PACKAGE_MANAGER}" ]]; then
    return
  fi
  local managers=(apt-get dnf yum zypper pacman)
  for manager in "${managers[@]}"; do
    if has_command "$manager"; then
      PACKAGE_MANAGER="$manager"
      return
    fi
  done
  PACKAGE_MANAGER=""
}

install_packages() {
  local packages=()
  for pkg in "$@"; do
    packages+=("$pkg")
  done
  detect_package_manager
  if [[ -z "${PACKAGE_MANAGER}" ]]; then
    error "No supported package manager found to install packages: ${packages[*]}"
    exit 1
  fi
  case "$PACKAGE_MANAGER" in
    apt-get)
      log "Installing missing packages: ${packages[*]}"
      apt-get update -y
      DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
      ;;
    dnf|yum)
      log "Installing missing packages: ${packages[*]}"
      "$PACKAGE_MANAGER" install -y "${packages[@]}"
      ;;
    zypper)
      log "Installing missing packages: ${packages[*]}"
      zypper install -y "${packages[@]}"
      ;;
    pacman)
      log "Installing missing packages: ${packages[*]}"
      pacman -Sy --noconfirm "${packages[@]}"
      ;;
    *)
      error "Unsupported package manager: $PACKAGE_MANAGER"
      exit 1
      ;;
  esac
}

ensure_dependency() {
  local cmd="$1"
  local pkg="$2"
  if has_command "$cmd"; then
    return
  fi
  log "Dependency '$cmd' missing. Attempting to install package '$pkg'."
  install_packages "$pkg"
  if ! has_command "$cmd"; then
    error "Unable to install required dependency '$cmd'."
    exit 1
  fi
}

ensure_docker_compose() {
  if has_command "docker" && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  if has_command "docker-compose"; then
    echo "docker-compose"
    return
  fi
  log "Docker Compose not found. Attempting to install docker-compose plugin."
  install_packages "docker-compose-plugin"
  if has_command "docker" && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return
  fi
  install_packages "docker-compose"
  if has_command "docker-compose"; then
    echo "docker-compose"
    return
  fi
  error "Unable to install Docker Compose."
  exit 1
}

ensure_docker_running() {
  if systemctl is-active --quiet docker 2>/dev/null; then
    return
  fi
  log "Docker daemon not running. Attempting to start."
  if systemctl start docker 2>/dev/null; then
    return
  fi
  if service docker start 2>/dev/null; then
    return
  fi
  error "Docker daemon is not running and could not be started automatically."
  exit 1
}

ensure_network_exists() {
  local network_name="$1"
  if docker network inspect "$network_name" >/dev/null 2>&1; then
    log "Docker network ${network_name} already exists."
    return
  fi
  log "Creating Docker network ${network_name}."
  docker network create "$network_name" >/dev/null
}

clone_or_update_repo() {
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    log "Existing repository detected. Fetching updates."
    git -C "$INSTALL_DIR" fetch --all --prune
    git -C "$INSTALL_DIR" reset --hard origin/main
  else
    log "Cloning repository into ${INSTALL_DIR}."
    rm -rf "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
}

pull_updates() {
  if [[ ! -d "${INSTALL_DIR}/.git" ]]; then
    error "Installation directory does not contain a Git repository."
    exit 1
  fi
  log "Fetching latest updates from origin."
  git -C "$INSTALL_DIR" fetch --all --prune
}

rebuild_stack() {
  local compose_cmd connection_file env_args=()
  compose_cmd="$(ensure_docker_compose)"
  ensure_docker_running
  ensure_network_exists "virtualbank-backplane"
  ensure_network_exists "virtualbank-datastore"

  connection_file="${INSTALL_DIR}/${CONNECTION_ENV_FILE}"
  if [[ -f "$connection_file" ]]; then
    env_args=(--env-file "$connection_file")
  fi

  if [[ -f "${INSTALL_DIR}/${DATASTORE_COMPOSE}" ]]; then
    log "Ensuring datastore stack is prepared using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" pull)
    if ! (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" up -d --build --wait); then
      warn "Compose '--wait' unsupported for datastore stack; retrying without it."
      (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" up -d --build)
    fi
    if ! wait_for_container_ready "$POSTGRES_PRIMARY_CONTAINER" 240; then
      warn "PostgreSQL primary did not report healthy before timeout."
    fi
    if ! wait_for_container_ready "vb-postgres-replica" 240; then
      warn "PostgreSQL replica did not report healthy before timeout."
    fi
    if ! wait_for_container_ready "vb-redis" 180; then
      warn "Redis cache did not report healthy before timeout."
    fi
    if ! wait_for_container_ready "vb-kafka" 240; then
      warn "Kafka broker did not report healthy before timeout."
    fi
    if ! wait_for_container_ready "vb-clickhouse" 240; then
      warn "ClickHouse service did not report healthy before timeout."
    fi
    if ! wait_for_container_ready "vb-minio" 180; then
      warn "MinIO service did not report healthy before timeout."
    fi
    seed_fake_companies
  else
    log "Datastore compose file not found; skipping datastore deployment."
  fi

  if [[ -f "${INSTALL_DIR}/${STOCKMARKET_COMPOSE}" ]]; then
    log "Ensuring stockmarket stack is prepared using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$STOCKMARKET_COMPOSE" pull)
    if ! (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$STOCKMARKET_COMPOSE" up -d --build --wait); then
      warn "Compose '--wait' unsupported for stockmarket stack; retrying without it."
      (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$STOCKMARKET_COMPOSE" up -d --build)
    fi
    if ! wait_for_container_ready "vb-stockmarket" 180; then
      warn "Stockmarket simulator did not report ready before timeout."
    fi
  else
    log "Stockmarket compose file not found; skipping stockmarket deployment."
  fi

  if [[ -f "${INSTALL_DIR}/${COMPOSE_FILE}" ]]; then
    log "Updating middleware stack using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$COMPOSE_FILE" pull)
    if ! (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$COMPOSE_FILE" up -d --build --wait); then
      warn "Compose '--wait' unsupported for middleware stack; retrying without it."
      (cd "$INSTALL_DIR" && $compose_cmd "${env_args[@]}" -f "$COMPOSE_FILE" up -d --build)
    fi
    local middleware_health_url frontend_url
    middleware_health_url="$(middleware_public_url)/health/live"
    if ! wait_for_http_endpoint "$middleware_health_url" "Middleware live probe" 240 5; then
      warn "Middleware live probe not reachable yet at ${middleware_health_url}."
    fi
    frontend_url="$(frontend_public_url)"
    if ! wait_for_http_endpoint "$frontend_url" "Frontend availability" 240 10; then
      warn "Frontend preview not reachable yet at ${frontend_url}."
    fi
  else
    log "Middleware compose file not found; skipping middleware deployment."
  fi
}

wait_for_postgres_primary() {
  local retries=0
  local max_retries=30
  while (( retries < max_retries )); do
    if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_PRIMARY_CONTAINER" \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" >/dev/null 2>&1; then
      return 0
    fi
    retries=$((retries + 1))
    sleep 2
  done
  return 1
}

seed_fake_companies() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_PRIMARY_CONTAINER}$"; then
    log "PostgreSQL primary container not running; skipping fake company seed."
    return
  fi

  local dataset_path="${INSTALL_DIR}/docs/dataset/fake_companies.json"
  local seed_sql_path="${INSTALL_DIR}/scripts/sql/seed_fake_companies.sql"

  if [[ ! -f "$dataset_path" ]]; then
    log "Dataset file $dataset_path not found; skipping fake company seed."
    return
  fi

  if [[ ! -f "$seed_sql_path" ]]; then
    log "Seed SQL $seed_sql_path not found; skipping fake company seed."
    return
  fi

  log "Waiting for PostgreSQL primary to accept connections before seeding."
  if ! wait_for_postgres_primary; then
    error "PostgreSQL primary did not become ready in time; skipping fake company seed."
    return
  fi

  log "Copying dataset and seed script into ${POSTGRES_PRIMARY_CONTAINER}."
  docker cp "$dataset_path" "${POSTGRES_PRIMARY_CONTAINER}:/tmp/fake_companies.json"
  docker cp "$seed_sql_path" "${POSTGRES_PRIMARY_CONTAINER}:/tmp/seed_fake_companies.sql"

  log "Seeding fake companies into PostgreSQL."
  if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$POSTGRES_PRIMARY_CONTAINER" \
    bash -c "psql -U '$POSTGRES_USER' -d '$POSTGRES_DATABASE' -f /tmp/seed_fake_companies.sql"; then
    log "Fake company dataset applied successfully."
  else
    error "Failed to seed fake company dataset."
  fi

  docker exec "$POSTGRES_PRIMARY_CONTAINER" rm -f /tmp/fake_companies.json /tmp/seed_fake_companies.sql >/dev/null 2>&1 || true
}

install_virtualbank() {
  require_root
  ensure_dependency git git
  ensure_dependency docker docker.io
  ensure_dependency curl curl
  local compose_cmd
  compose_cmd="$(ensure_docker_compose)"
  clone_or_update_repo
  ensure_docker_running
  log "Verifying docker command availability."
  docker version >/dev/null
  log "Provisioning connectivity bundle for the initial deployment."
  generate_connection_bundle 1
  log "Bringing infrastructure online."
  rebuild_stack
  log "Validating service connectivity with generated credentials."
  generate_connection_bundle 0
  log "Installation completed successfully."
}

update_virtualbank() {
  require_root
  ensure_dependency git git
  ensure_dependency docker docker.io
  ensure_dependency curl curl
  pull_updates
  log "Comparing commits."
  local status
  status=$(git -C "$INSTALL_DIR" rev-list HEAD..origin/main --count)
  if [[ "$status" -eq 0 ]]; then
    log "No updates available."
    return
  fi
  log "Applying updates (origin/main)."
  git -C "$INSTALL_DIR" reset --hard origin/main
  log "Refreshing connectivity bundle ahead of the rollout."
  generate_connection_bundle 1
  rebuild_stack
  log "Re-running connectivity verification after the rollout."
  generate_connection_bundle 0
  log "Update completed successfully."
}

check_updates() {
  ensure_dependency git git
  if [[ ! -d "${INSTALL_DIR}/.git" ]]; then
    log "VirtualBank is not installed at ${INSTALL_DIR}."
    exit 0
  fi
  pull_updates
  local ahead behind
  ahead=$(git -C "$INSTALL_DIR" rev-list origin/main..HEAD --count)
  behind=$(git -C "$INSTALL_DIR" rev-list HEAD..origin/main --count)
  if [[ "$behind" -gt 0 ]]; then
    log "Updates are available. Local installation is ${behind} commit(s) behind origin/main."
  elif [[ "$ahead" -gt 0 ]]; then
    log "Local installation has ${ahead} commit(s) not on origin/main."
  else
    log "VirtualBank is up-to-date."
  fi
}

uninstall_virtualbank() {
  require_root
  if [[ -d "${INSTALL_DIR}" ]]; then
    local compose_cmd
    if has_command docker; then
      compose_cmd=$(ensure_docker_compose)
      if [[ -f "${INSTALL_DIR}/${COMPOSE_FILE}" ]]; then
        log "Stopping middleware stack."
        (cd "$INSTALL_DIR" && $compose_cmd -f "$COMPOSE_FILE" down --remove-orphans)
      fi
      if [[ -f "${INSTALL_DIR}/${STOCKMARKET_COMPOSE}" ]]; then
        log "Stopping stockmarket stack."
        (cd "$INSTALL_DIR" && $compose_cmd -f "$STOCKMARKET_COMPOSE" down --remove-orphans)
      fi
      if [[ -f "${INSTALL_DIR}/${DATASTORE_COMPOSE}" ]]; then
        log "Stopping datastore stack."
        (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" down --remove-orphans -v)
      fi
    fi
    log "Removing installation directory ${INSTALL_DIR}."
    rm -rf "$INSTALL_DIR"
  else
    log "Installation directory ${INSTALL_DIR} does not exist. Nothing to remove."
  fi
  log "Uninstallation completed."
}

usage() {
  cat <<USAGE
VirtualBank maintenance script

Usage: $0 <command>

Commands:
  install        Install VirtualBank under ${INSTALL_DIR}
  update         Update the existing VirtualBank deployment
  uninstall      Remove VirtualBank and associated Docker stacks
  check-updates  Check whether updates are available from GitHub
  help           Display this help message
USAGE
}

main() {
  local command=${1:-help}
  case "$command" in
    install)
      install_virtualbank
      ;;
    update)
      update_virtualbank
      ;;
    uninstall)
      uninstall_virtualbank
      ;;
    check-updates)
      check_updates
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      error "Unknown command: $command"
      usage
      exit 1
      ;;
  esac
}

main "$@"
