# Local Development Guide

This document covers setting up and running the Little Bitta Granola site locally with SvelteKit and progressive enhancement.

> **See also:** [Cloud Architecture](cloud-arch.md) for production deployment, [Customer-Facing Site](customer-facing.md) for frontend implementation, and [Admin Panel](admin-ui.md) for backend management.

## Overview

**Local development stack:**

- **SvelteKit** - SSR framework with progressive enhancement
- **Vite** - Fast development server with HMR
- **Netlify CLI** - Simulates Netlify deployment locally
- **SQLite** - Local database (instead of Turso)
- **Stripe Test Mode** - Test payments without real money
- **TypeScript** - Type-safe development

**Design Philosophy:**

- Develop with progressive enhancement from the start
- Test without JavaScript to ensure resilience
- Server-render all pages for immediate content visibility

## Project Structure

```
little-bitta-site/
├── src/
│   ├── routes/                # SvelteKit routes (file-based routing)
│   │   ├── +layout.svelte           # Root layout
│   │   ├── +page.svelte             # Homepage
│   │   ├── +page.server.ts          # Homepage server logic
│   │   ├── products/
│   │   │   └── [slug]/
│   │   │       ├── +page.svelte     # Product detail
│   │   │       └── +page.server.ts  # Load product data
│   │   ├── cart/
│   │   │   ├── +page.svelte         # Cart page
│   │   │   └── +page.server.ts      # Cart actions (add/remove)
│   │   ├── checkout/
│   │   │   ├── +page.svelte         # Checkout form
│   │   │   └── +page.server.ts      # Payment processing
│   │   └── admin/
│   │       ├── +page.svelte         # Admin dashboard
│   │       └── +page.server.ts      # Admin actions
│   ├── lib/
│   │   ├── server/              # Server-only code
│   │   │   ├── db.ts           # Database client
│   │   │   └── stripe.ts       # Stripe client
│   │   └── components/         # Reusable Svelte components
│   └── app.html                # HTML template
│
├── static/                    # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.png
│
├── local/                     # Local development only
│   ├── seed.sql              # Sample product data
│   └── local.db              # SQLite database (gitignored)
│
├── .env.example              # Environment variable template
├── .env                      # Actual secrets (gitignored)
├── svelte.config.js          # SvelteKit configuration
├── vite.config.js            # Vite configuration
├── netlify.toml              # Netlify configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript configuration
```

## Initial Setup

### 1. Install Dependencies

```bash
# Install Netlify CLI globally (optional, for deployment)
bun install -g netlify-cli

# Install project dependencies
bun install

# Key dependencies:
# - @sveltejs/kit: SvelteKit framework
# - @sveltejs/adapter-netlify: Netlify deployment adapter
# - @libsql/client: Turso database client (SQLite-compatible)
# - stripe: Stripe payment processing
# - vite: Development server
```

### 2. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./"
  },
  "include": ["functions/**/*", "src/**/*"],
  "exclude": ["node_modules", "dist", "local"]
}
```

### 3. Configure SvelteKit

```js
// svelte.config.js
import adapter from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      edge: false,
      split: false,
    }),
  },
};

export default config;
```

```toml
# netlify.toml
[build]
  command = "bun run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "20"

[dev]
  command = "bun run dev"
  targetPort = 5173
  port = 8888
  autoLaunch = false

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/render"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 4. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "db:seed": "sqlite3 local/local.db < local/seed.sql",
    "db:reset": "rm -f local/local.db && bun run db:seed",
    "netlify:dev": "netlify dev",
    "deploy": "netlify deploy --prod"
  }
}
```

### 5. TLS Certificate Setup (for HTTPS)

The production-like local environment uses Caddy with HTTPS. To avoid browser security warnings, generate locally-trusted certificates using `mkcert`.

**Install mkcert:**

```bash
# macOS
brew install mkcert

# Linux (requires certutil)
sudo apt install libnss3-tools
brew install mkcert  # or download from https://github.com/FiloSottile/mkcert/releases
```

**One-time setup (install local CA):**

```bash
# This installs the local CA in your system trust store
# You only need to run this once per machine
mkcert -install
```

**Generate certificates:**

```bash
# Generate certs for localhost
just cert

# This creates:
# - certs/localhost.pem (certificate)
# - certs/localhost-key.pem (private key)
```

After this setup, `https://localhost` will work without browser warnings in both:
- Local development (`just prod`)
- Docker environment (`just up`)

## Environment Variables

### Create .env File

```bash
# .env
NODE_ENV=development

# Database (local SQLite)
DB_PATH=./local/local.db

# Admin (simple token for development)
ADMIN_SECRET=dev-secret-change-in-production

# Stripe Test Mode (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_KEY=pk_test_...
```

### Create .env.example Template

```bash
# .env.example
NODE_ENV=development
DB_PATH=./local/local.db
ADMIN_SECRET=your-admin-secret-here
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_KEY=pk_test_...
```

## Local Database Setup

### 1. Create Database Schema

```sql
-- local/seed.sql
-- Create tables
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price REAL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed sample products
INSERT INTO products (name, description, price, image_url, stock, active) VALUES
  ('Peanut Butter Nutella', 'Rich and creamy blend of peanut butter and chocolate hazelnut spread', 10.00, '/images/pb-nutella.jpg', 50, 1),
  ('Pistachio', 'Crunchy pistachios with a hint of honey', 10.00, '/images/pistachio.jpg', 50, 1),
  ('Peanut Butter Chocolate Chip', 'Classic peanut butter with dark chocolate chips', 10.00, '/images/pb-chocolate.jpg', 50, 1),
  ('Honey Bear', 'Sweet honey with almonds and oats', 10.00, '/images/honey-bear.jpg', 50, 1);

-- Create admin user (password: admin123)
-- Hash generated with: echo -n "admin123" | openssl dgst -sha256
INSERT INTO admin_users (username, password_hash) VALUES
  ('admin', '$2a$10$rU8E8qQs5qV5kZ9fX8LlO.YvJqKj7XqZqZqZqZqZqZqZqZqZqZqZq');
```

### 2. Initialize Database

```bash
# Create local directory if it doesn't exist
mkdir -p local

# Create and seed database
bun run db:seed

# Verify it worked
sqlite3 local/local.db "SELECT * FROM products;"
```

### 3. Database Helper Module

```ts
// src/lib/server/db.ts
import { createClient } from "@libsql/client";
import { dev } from "$app/environment";

export const getDb = () => {
  if (dev) {
    // Development: Use local SQLite
    return createClient({
      url: `file:${process.env.DB_PATH || "./local/local.db"}`,
    });
  } else {
    // Production: Use Turso
    return createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_TOKEN!,
    });
  }
};
```

**Note:** Place database helpers in `src/lib/server/` to ensure they only run on the server (SvelteKit convention).

## Stripe Test Mode Setup

### 1. Create Stripe Account

1. Go to https://dashboard.stripe.com
2. Sign up for an account (free)
3. Toggle to **Test mode** (top right toggle)

### 2. Get Credentials

**In Test mode:**

- **Secret Key:** Developers → API Keys → Secret key (sk_test_...)
- **Publishable Key:** Developers → API Keys → Publishable key (pk_test_...)

Add these to your `.env` file.

### 3. Test Credit Cards

Use these test cards in Test mode:

| Card Number         | Type       | Result  |
| ------------------- | ---------- | ------- |
| 4242 4242 4242 4242 | Visa       | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| 3782 822463 10005   | Amex       | Success |
| 4000 0000 0000 9995 | Visa       | Decline |

**CVV:** Any 3 digits
**Expiry:** Any future date
**Postal Code:** Any valid code

### 4. Stripe Client Helper

```ts
// src/lib/server/stripe.ts
import Stripe from "stripe";

export const getStripeClient = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });
};
```

## Running Locally

### Start Development Server

```bash
# Start Vite development server
bun run dev

# Server starts at: http://localhost:5173
```

**What happens:**

- SvelteKit starts with HMR (Hot Module Replacement)
- Pages are server-rendered on each request
- Changes reflect instantly (no page refresh needed)
- All routes available immediately

**Available routes:**

- `http://localhost:5173/` - Homepage (SSR)
- `http://localhost:5173/cart` - Cart page (SSR)
- `http://localhost:5173/checkout` - Checkout (SSR)
- `http://localhost:5173/admin` - Admin panel (SSR)

### Development Workflow

1. **Edit Svelte files** - Hot Module Replacement updates instantly
2. **Edit server code** - Pages re-render on next request
3. **View server logs** - Server actions log to terminal
4. **Test without JS** - Disable JavaScript in browser to test resilience
5. **Test forms** - Forms work via POST even without JavaScript

### Testing Progressive Enhancement

**Verify your site works without JavaScript:**

1. Open browser DevTools
2. Disable JavaScript (Chrome: DevTools > Settings > Debugger > Disable JavaScript)
3. Reload page
4. Test core functionality:
   - View products ✓
   - Add to cart (form POST) ✓
   - View cart ✓
   - Navigate pages ✓

**With JavaScript enabled:**

- Smooth page transitions
- Optimistic UI updates
- No full page reloads
- Enhanced animations

## Testing the Site

### 1. View Homepage

```bash
open http://localhost:8888
```

Should see the storefront with products from seed data.

### 2. Test Admin Panel

```bash
open http://localhost:8888/admin.html
```

**Login:**

- Username: `admin`
- Password: `admin123`

### 3. Test Checkout Flow

1. Add products to cart
2. Click checkout
3. Use test card: `4111 1111 1111 1111`
4. Check orders in admin panel

### 4. Test API Directly

```bash
# Get products
curl http://localhost:8888/.netlify/functions/products

# Admin login
curl -X POST http://localhost:8888/.netlify/functions/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get admin products (with token)
curl http://localhost:8888/.netlify/functions/admin-products \
  -H "Authorization: Bearer dev-secret-change-in-production"
```

## Troubleshooting

### Functions Not Loading

**Error:** `Function not found`

**Fix:**

```bash
# Check netlify.toml has correct functions path
cat netlify.toml | grep functions

# Ensure TypeScript is installed
bun install -D typescript

# Restart dev server
netlify dev
```

### Database Errors

**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Fix:**

```bash
# Ensure local/ directory exists
mkdir -p local

# Recreate database
bun run db:reset

# Check file exists
ls -la local/local.db
```

### Stripe Payment Fails

**Error:** `Payment failed`

**Fix:**

1. Verify you're using **Test mode** credentials in `.env`
2. Check credentials are from Test mode (not Live mode)
3. Use test card numbers listed above
4. Check Stripe Dashboard for errors (https://dashboard.stripe.com/test/logs)

### TypeScript Compilation Errors

**Error:** `Cannot find module...`

**Fix:**

```bash
# Install missing types
bun install -D @types/node @netlify/functions

# Verify tsconfig.json exists
cat tsconfig.json

# Clear cache and restart
rm -rf .netlify
netlify dev
```

### Port Already in Use

**Error:** `Port 8888 is already in use`

**Fix:**

```bash
# Find and kill process
lsof -ti:8888 | xargs kill -9

# Or use different port
netlify dev --port 9999
```

## Development Tips

### 1. Database Inspection

```bash
# Open SQLite shell
sqlite3 local/local.db

# View tables
.tables

# Query products
SELECT * FROM products;

# Check orders
SELECT * FROM orders;

# Exit
.quit
```

### 2. Reset Database

```bash
# Delete and recreate
bun run db:reset

# Or manually
rm local/local.db
sqlite3 local/local.db < local/seed.sql
```

### 3. Function Logs

All `console.log()` in functions appear in terminal:

```ts
// functions/products.ts
export default async (req: Request) => {
  console.log("Products requested"); // Shows in terminal
  // ...
};
```

### 4. Test with cURL

```bash
# Create product (admin)
curl -X POST http://localhost:8888/.netlify/functions/admin-products \
  -H "Authorization: Bearer dev-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Granola",
    "description": "Testing",
    "price": 12.50,
    "stock": 10,
    "image_url": "/images/test.jpg"
  }'
```

### 5. Environment Variables

Netlify CLI automatically loads `.env` file. No need for `dotenv` package.

```ts
// Access in functions
const apiKey = process.env.STRIPE_SECRET_KEY;
```

## Git Configuration

### .gitignore

```gitignore
# Dependencies
node_modules/

# Environment
.env

# Local database
local/local.db

# Netlify
.netlify/

# Build output
dist/
.cache/

# OS files
.DS_Store
Thumbs.db
```

## Next Steps

Once local development is working:

1. **Create functions** - Start with `products.ts` and `admin-login.ts`
2. **Build frontend** - Create `index.html` with Alpine.js
3. **Test end-to-end** - Full checkout flow locally
4. **Deploy to Netlify** - `netlify deploy --prod`
5. **Switch to Turso** - Replace local SQLite with production Turso
6. **Use Stripe Live Mode** - Switch from test mode to live payments

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Production deployment and infrastructure
- [Customer-Facing Site](customer-facing.md) - Frontend implementation details
- [Admin Panel](admin-ui.md) - Backend management interface

## Quick Reference

| Command                  | Purpose                          |
| ------------------------ | -------------------------------- |
| `mkcert -install`        | Install local CA (one-time)      |
| `just cert`              | Generate TLS certificates        |
| `just prod`              | Run production build locally     |
| `just up`                | Run in Docker                    |
| `just clean`             | Stop servers and clean up        |
| `bun run dev`            | Start local dev server           |
| `bun run db:seed`        | Initialize local database        |
| `bun run db:reset`       | Reset database to seed data      |
| `sqlite3 local/local.db` | Open database shell              |
| `netlify deploy`         | Deploy to preview                |
| `netlify deploy --prod`  | Deploy to production             |

---

**Ready to start building!** Begin with setting up the basic files, then create your first function and HTML page.
