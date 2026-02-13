# Local Development Guide

This document covers setting up and running the Little Bitta Granola site locally with SvelteKit and Bun.

> **See also:** [Cloud Architecture](cloud-arch.md) for production deployment, [Customer-Facing Site](customer-facing.md) for frontend implementation, and [Admin Panel](admin-ui.md) for backend management.

## Overview

**Local development stack:**

- **SvelteKit** - SSR framework with progressive enhancement
- **Vite** - Fast development server with HMR
- **Bun** - JavaScript runtime and package manager
- **PostgreSQL 18** - Database (via Docker Compose)
- **Stripe Test Mode** - Test payments without real money
- **TypeScript** - Type-safe development
- **Caddy** - Reverse proxy with automatic HTTPS (for production-like local testing)

**Design Philosophy:**

- Develop with progressive enhancement from the start
- Test without JavaScript to ensure resilience
- Server-render all pages for immediate content visibility
- Use the same database (Postgres) in dev and production to avoid schema drift

## Project Structure

```
little-bitta-site/
├── src/
│   ├── routes/                # SvelteKit routes (file-based routing)
│   │   ├── +layout.svelte           # Root layout
│   │   ├── +page.svelte             # Homepage
│   │   ├── +page.server.ts          # Homepage server logic
│   │   ├── product/[slug]/          # Product detail pages
│   │   ├── shop/                    # Shop page
│   │   ├── order-success/           # Post-checkout confirmation
│   │   ├── admin/                   # Admin panel
│   │   │   └── drops/               # Drop management
│   │   └── api/stripe/              # Stripe webhook + checkout API
│   ├── lib/
│   │   ├── db/                # Database layer (Postgres via Bun SQL)
│   │   │   ├── db.ts         # Database connection (uses DATABASE_URL)
│   │   │   ├── product.ts    # Product queries
│   │   │   ├── drop.ts       # Drop queries
│   │   │   ├── order.ts      # Order queries
│   │   │   └── drop-product.ts # Per-product capacity tracking
│   │   ├── payments/          # Stripe integration
│   │   │   ├── stripe.ts     # Stripe client
│   │   │   └── verify-payment.ts # Payment verification logic
│   │   ├── components/        # Reusable Svelte components
│   │   ├── cart/              # Cart state management
│   │   └── config/            # App configuration
│   ├── hooks.server.ts        # Server hooks (dev request logging)
│   └── app.html               # HTML template
│
├── config/
│   └── init-db/
│       ├── 01-schema.sql      # PostgreSQL schema (tables, enums, triggers)
│       └── 02-seed.sql        # Seed data for development
│
├── tests/
│   └── integration/
│       └── db/                # Integration tests (require Postgres)
│           ├── test-utils.ts  # Test helpers (connection, schema, seeds)
│           ├── drop.test.ts
│           ├── product.test.ts
│           ├── order.test.ts
│           └── drop-product.test.ts
│
├── static/                    # Static assets (images, fonts, favicon)
├── docs/                      # Documentation
├── compose.yml                # Docker Compose (Postgres, Caddy, Bun)
├── Dockerfile                 # Production container image
├── Caddyfile                  # Caddy reverse proxy config
├── justfile                   # Task runner recipes
├── bunfig.toml                # Bun configuration
├── svelte.config.js           # SvelteKit configuration
├── vite.config.ts             # Vite configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

## Initial Setup

### 1. Prerequisites

- **[Bun](https://bun.sh)** (v1.3+) - JavaScript runtime
- **[Docker](https://docs.docker.com/get-docker/)** - For PostgreSQL
- **[just](https://github.com/casey/just)** - Task runner (recommended)
- **[Stripe CLI](https://docs.stripe.com/stripe-cli)** - For local webhook testing
- **[mkcert](https://github.com/FiloSottile/mkcert)** - For local TLS certificates (optional, for production-like testing)

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# .env
PUBLIC_STRIPE_KEY=pk_test_...
SECRET_STRIPE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

DATABASE_URL=postgres://postgres:password@localhost:5432/little_bitta
```

Get Stripe test credentials from https://dashboard.stripe.com/test/apikeys.

The `DATABASE_URL` should match the Postgres credentials in `compose.yml`.

### 4. Start the Database

```bash
# Start PostgreSQL via Docker Compose
docker compose up -d --wait db
```

This starts a Postgres 18 container on port 5432, automatically initializes the schema from `config/init-db/01-schema.sql`, and seeds development data from `config/init-db/02-seed.sql`.

### 5. TLS Certificate Setup (optional)

For production-like local HTTPS via Caddy:

```bash
# Install mkcert (macOS)
brew install mkcert

# Install the local CA (one-time)
mkcert -install

# Generate certificates
just cert
```

After this, `https://localhost` will work without browser warnings when using `just prod` or `just up`.

## Running Locally

### Start Development Server

```bash
# Start Vite dev server + Stripe webhook listener
just dev

# Or without just:
bun run dev
```

The dev server starts at `http://localhost:5173` with HMR (Hot Module Replacement).

**What happens:**

- SvelteKit starts with HMR
- Pages are server-rendered on each request
- Changes reflect instantly (no page refresh needed)
- Request timing is logged to the terminal (via `hooks.server.ts`)

### Run in Production Mode (locally)

```bash
# Build and serve with Caddy + Postgres
just prod

# Or run the full Docker Compose stack
just up
```

## Database

### Architecture

Both local development and production use PostgreSQL. There is no SQLite fallback -- this eliminates schema drift between environments.

- **Connection:** `src/lib/db/db.ts` connects via the `DATABASE_URL` environment variable
- **Schema:** `config/init-db/01-schema.sql` defines all tables, enums, and constraints
- **Seed data:** `config/init-db/02-seed.sql` populates development data
- **Docker:** `compose.yml` runs Postgres 18 with the init scripts mounted to `/docker-entrypoint-initdb.d`

### The `updated_at = DEFAULT` Pattern

All `UPDATE` queries use `updated_at = DEFAULT` instead of `updated_at = CURRENT_TIMESTAMP`. This is a PostgreSQL-specific pattern that relies on the column default:

```sql
-- In 01-schema.sql:
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
```

When an `UPDATE` sets `updated_at = DEFAULT`, Postgres re-evaluates the column default (`CURRENT_TIMESTAMP`), effectively auto-updating the timestamp. This avoids the need for triggers.

Reference: https://www.morling.dev/blog/last-updated-columns-with-postgres/

### Common Database Commands

```bash
# Start Postgres
docker compose up -d --wait db

# Connect to the database via psql
docker compose exec db psql -U postgres -d little_bitta

# Reset the database (destroy and recreate)
docker compose down -v && docker compose up -d --wait db

# View container status
docker compose ps
```

## Testing

The project uses [Bun's built-in test runner](https://bun.sh/docs/cli/test) with two tiers of tests:

### Unit Tests

Unit tests live in `src/` alongside the code they test. They do not require Docker or Postgres.

```bash
# Run unit tests only
just test

# Or directly:
bun test
```

`bunfig.toml` sets `root = "src"` so bare `bun test` only discovers test files under `src/`.

### Integration Tests

Integration tests live in `tests/integration/` and run against a real Postgres instance. They verify the full database layer including PostgreSQL-specific behavior.

```bash
# Run integration tests (auto-starts Postgres)
just test-integration

# Run all tests (unit + integration)
just test-all
```

### Test Architecture

Integration tests use Bun's `mock.module()` to inject a test database connection, then dynamically import the module under test:

```ts
const sql = await getTestSql(); // Connect to test DB
mock.module("../../../src/lib/db/db", () => ({ sql })); // Mock the db module
const { myFunction } = await import("../../../src/lib/db/my-module");
```

Each test file:

- Creates a `little_bitta_test` database (separate from `little_bitta`)
- Sets up the full schema in `beforeAll`
- Truncates all tables in `beforeEach` for isolation
- Closes the connection in `afterAll`

## Stripe Test Mode

### Setup

1. Create a [Stripe account](https://dashboard.stripe.com) (free)
2. Toggle to **Test mode**
3. Get API keys from Developers > API Keys
4. Add keys to `.env`

### Local Webhook Testing

```bash
# Login to Stripe CLI (one-time)
stripe login

# Start webhook forwarding (included in `just dev`)
just webhook
```

### Test Credit Cards

| Card Number         | Result  |
| ------------------- | ------- |
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Decline |

**CVV:** Any 3 digits | **Expiry:** Any future date | **Postal Code:** Any valid code

## Troubleshooting

### Database Connection Errors

**Error:** `PostgresError: Connection refused` or `Connection closed`

```bash
# Ensure Postgres is running
docker compose up -d --wait db

# Check container health
docker compose ps

# View Postgres logs
docker compose logs db
```

### Integration Tests Fail

**Error:** Tests fail with Postgres connection errors

```bash
# Ensure Docker is running and Postgres is healthy
docker compose up -d --wait db

# Run integration tests explicitly
just test-integration
```

Note: Bare `bun test` only runs unit tests (due to `bunfig.toml` root setting). Integration tests require `just test-integration` or `just test-all`.

### Stripe Payment Fails

1. Verify you're using **Test mode** credentials in `.env`
2. Ensure the Stripe CLI webhook listener is running (`just webhook` or included in `just dev`)
3. Use test card numbers listed above
4. Check Stripe Dashboard for errors: https://dashboard.stripe.com/test/logs

### Port Already in Use

```bash
# Find and kill process on port 5173 (Vite)
lsof -ti:5173 | xargs kill -9

# Find and kill process on port 5432 (Postgres)
lsof -ti:5432 | xargs kill -9
```

## Quick Reference

| Command                          | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `just dev`                       | Start dev server + Stripe webhook listener |
| `just prod`                      | Build and run production locally           |
| `just up`                        | Run full stack in Docker                   |
| `just clean`                     | Stop servers and clean up                  |
| `just test`                      | Run unit tests (no Docker needed)          |
| `just test-integration`          | Run integration tests (starts Postgres)    |
| `just test-all`                  | Run all tests (starts Postgres)            |
| `just cert`                      | Generate TLS certificates                  |
| `just webhook`                   | Start Stripe webhook forwarding            |
| `docker compose up -d --wait db` | Start Postgres                             |
| `docker compose down -v`         | Stop and reset Postgres                    |
| `docker compose logs db`         | View Postgres logs                         |

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Production deployment and infrastructure
- [Customer-Facing Site](customer-facing.md) - Frontend implementation details
- [Admin Panel](admin-ui.md) - Backend management interface
