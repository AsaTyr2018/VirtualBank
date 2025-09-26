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

log() { printf "[%(%Y-%m-%dT%H:%M:%S%z)T] %s\n" -1 "$*"; }
error() { log "ERROR: $*" >&2; }

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
  local compose_cmd
  compose_cmd="$(ensure_docker_compose)"
  ensure_docker_running
  ensure_network_exists "virtualbank-backplane"
  ensure_network_exists "virtualbank-datastore"

  if [[ -f "${INSTALL_DIR}/${DATASTORE_COMPOSE}" ]]; then
    log "Ensuring datastore stack is prepared using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" pull)
    (cd "$INSTALL_DIR" && $compose_cmd -f "$DATASTORE_COMPOSE" up -d --build)
    seed_fake_companies
  else
    log "Datastore compose file not found; skipping datastore deployment."
  fi

  if [[ -f "${INSTALL_DIR}/${STOCKMARKET_COMPOSE}" ]]; then
    log "Ensuring stockmarket stack is prepared using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd -f "$STOCKMARKET_COMPOSE" pull)
    (cd "$INSTALL_DIR" && $compose_cmd -f "$STOCKMARKET_COMPOSE" up -d --build)
  else
    log "Stockmarket compose file not found; skipping stockmarket deployment."
  fi

  if [[ -f "${INSTALL_DIR}/${COMPOSE_FILE}" ]]; then
    log "Updating middleware stack using ${compose_cmd}."
    (cd "$INSTALL_DIR" && $compose_cmd -f "$COMPOSE_FILE" pull)
    (cd "$INSTALL_DIR" && $compose_cmd -f "$COMPOSE_FILE" up -d --build)
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
  local compose_cmd
  compose_cmd="$(ensure_docker_compose)"
  clone_or_update_repo
  ensure_docker_running
  log "Verifying docker command availability."
  docker version >/dev/null
  log "Bringing infrastructure online."
  rebuild_stack
  log "Installation completed successfully."
}

update_virtualbank() {
  require_root
  ensure_dependency git git
  ensure_dependency docker docker.io
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
  rebuild_stack
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
