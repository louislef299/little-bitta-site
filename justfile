bun := require("bun")

# https://cheatography.com/linux-china/cheat-sheets/justfile/
[doc('List out available recipes')]
default: 
    @just --list
    @echo "\nAvailable bun scripts:"
    @jq '.scripts' package.json

alias dev := run
alias serve := run
# Run the vite dev server using bun runtime
run:
    docker compose up -d db
    {{bun}} -b run dev

# Build the Svelte project using vite
build:
    {{bun}} check && {{bun}} prepare
    {{bun}} b

# Generate local TLS certificates using mkcert
cert:
    @mkdir -p certs
    mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
    @echo "Certificates generated in certs/"
    @echo "Run 'mkcert -install' if you haven't already to trust the local CA"

# Uses stripe cli to emulate webhook locally and assumes stripe login
webhook:
    @echo "This step assumes you have already run 'stripe login'. You will have \
    to copy the webhook signing secret to your .env file."
    stripe listen --forward-to localhost:5173/api/stripe/webhook

# Run the production version of the application
prod: build
    docker compose up -d --wait db
    TGT=localhost TGT_PORT=3000 caddy start --pidfile caddy.pid > caddy.log 2>&1
    {{bun}} serve > bun.log 2>&1 & echo $! > bun.pid
    @echo "\n * bun server started (logs: bun.log)"
    @echo " * caddy server started (logs: caddy.log)"
    @echo " * application is available at https://localhost\n"

# Builds the production compose environment
up:
    docker compose up -d --build
    docker compose ps -a
    @echo "application is available at https://localhost:443"

# Clean local development dependencies
clean:
    {{bun}} clean
    docker compose down -v
    -caddy stop
    @echo "stopping bun process..."
    -test -f bun.pid && kill $(cat bun.pid) 2>/dev/null || true
    -rm -f bun.log caddy.log bun.pid

# Run unit tests only (no Docker required)
test:
    {{bun}} test src

# Run integration tests against Postgres (requires Docker)
test-integration:
    docker compose up -d --wait db
    {{bun}} test ./tests/integration

# Run all tests (unit + integration)
test-all:
    docker compose up -d --wait db
    {{bun}} test ./src ./tests/integration
