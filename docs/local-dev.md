# Local Development Guide

This document covers setting up and running the Little Bitta Granola site locally using Netlify CLI.

> **See also:** [Cloud Architecture](cloud-arch.md) for production deployment, [Customer-Facing Site](customer-facing.md) for frontend implementation, and [Admin Panel](admin-ui.md) for backend management.

## Overview

**Local development stack:**
- **Netlify CLI** - Runs functions and serves static site locally
- **SQLite** - Local database (instead of Turso)
- **Square Sandbox** - Test payments without real money
- **TypeScript** - Type-safe function development
- **Svelte** - Frontend interactivity with reactive components

## Project Structure

```
little-bitta-site/
├── public/                    # Static site (HTML, CSS, images)
│   ├── index.html
│   ├── checkout.html
│   ├── admin.html
│   └── styles.css
│
├── functions/                 # Serverless functions (TypeScript)
│   ├── products.ts
│   ├── checkout.ts
│   ├── admin-login.ts
│   ├── admin-products.ts
│   └── admin-orders.ts
│
├── src/                       # Shared code/utilities
│   ├── types.ts              # TypeScript interfaces
│   ├── db.ts                 # Database connection helper
│   └── square.ts             # Square client helper
│
├── local/                     # Local development only
│   ├── seed.sql              # Sample product data
│   └── local.db              # SQLite database (gitignored)
│
├── .env.example               # Environment variable template
├── .env                       # Actual secrets (gitignored)
├── netlify.toml               # Netlify configuration
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript configuration
```

## Initial Setup

### 1. Install Dependencies

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Initialize project
npm init -y

# Install dependencies
npm install @libsql/client square

# Install dev dependencies
npm install -D typescript @types/node @netlify/functions
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

### 3. Configure Netlify

```toml
# netlify.toml
[build]
  publish = "public"
  functions = "functions"

[dev]
  command = "echo 'Development server running'"
  port = 8888
  targetPort = 8888
  autoLaunch = false
  framework = "#static"

[functions]
  directory = "functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

### 4. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "netlify dev",
    "build": "netlify build",
    "deploy": "netlify deploy --prod",
    "db:seed": "sqlite3 local/local.db < local/seed.sql",
    "db:reset": "rm -f local/local.db && npm run db:seed"
  }
}
```

## Environment Variables

### Create .env File

```bash
# .env
NODE_ENV=development

# Database (local SQLite)
DB_PATH=./local/local.db

# Admin (simple token for development)
ADMIN_SECRET=dev-secret-change-in-production

# Square Sandbox (get from https://developer.squareup.com)
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=your-sandbox-access-token-here
SQUARE_LOCATION_ID=your-sandbox-location-id-here
SQUARE_APP_ID=your-sandbox-app-id-here
```

### Create .env.example Template

```bash
# .env.example
NODE_ENV=development
DB_PATH=./local/local.db
ADMIN_SECRET=your-admin-secret-here
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=your-square-sandbox-token
SQUARE_LOCATION_ID=your-square-location-id
SQUARE_APP_ID=your-square-app-id
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
  square_payment_id TEXT,
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
npm run db:seed

# Verify it worked
sqlite3 local/local.db "SELECT * FROM products;"
```

### 3. Database Helper Module

```ts
// src/db.ts
import { createClient } from "@libsql/client";

export const getDb = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: Use Turso
    return createClient({
      url: process.env.TURSO_URL!,
      authToken: process.env.TURSO_TOKEN!
    });
  } else {
    // Development: Use local SQLite
    return createClient({
      url: `file:${process.env.DB_PATH || './local/local.db'}`
    });
  }
};
```

## Square Sandbox Setup

### 1. Create Square Developer Account

1. Go to https://developer.squareup.com
2. Sign up for a developer account (free)
3. Create a new application
4. Switch to **Sandbox** mode (top right toggle)

### 2. Get Credentials

**In Sandbox mode:**
- **Access Token:** Credentials → Sandbox Access Token
- **Location ID:** Locations → Copy the ID
- **Application ID:** Credentials → Sandbox Application ID

Add these to your `.env` file.

### 3. Test Credit Cards

Use these test cards in Sandbox:

| Card Number | Type | Result |
|-------------|------|--------|
| 4111 1111 1111 1111 | Visa | Success |
| 5105 1051 0510 5100 | Mastercard | Success |
| 3782 822463 10005 | Amex | Success |

**CVV:** Any 3 digits
**Expiry:** Any future date
**Postal Code:** Any valid code

### 4. Square Client Helper

```ts
// src/square.ts
import { Client, Environment } from "square";

export const getSquareClient = () => {
  const environment = process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox;

  return new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN!,
    environment
  });
};
```

## Running Locally

### Start Development Server

```bash
# Start Netlify dev server
netlify dev

# Or use npm script
npm run dev
```

**Server starts at:** `http://localhost:8888`

**Functions available at:**
- `http://localhost:8888/.netlify/functions/products`
- `http://localhost:8888/.netlify/functions/admin-login`
- etc.

### Development Workflow

1. **Edit files** - Changes to HTML/CSS reflect immediately
2. **Functions auto-reload** - TypeScript functions recompile on save
3. **View logs** - Function logs appear in terminal
4. **Test locally** - Use local SQLite + Square Sandbox

### Hot Reload

Netlify CLI automatically:
- Reloads static files (HTML, CSS) on change
- Recompiles TypeScript functions on save
- Injects updated code without full restart

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
npm install -D typescript

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
npm run db:reset

# Check file exists
ls -la local/local.db
```

### Square Payment Fails

**Error:** `Payment failed`

**Fix:**
1. Verify you're using **Sandbox** environment in `.env`
2. Check credentials are from Sandbox (not Production)
3. Use test card numbers listed above
4. Check Square Developer Dashboard for errors

### TypeScript Compilation Errors

**Error:** `Cannot find module...`

**Fix:**
```bash
# Install missing types
npm install -D @types/node @netlify/functions

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
npm run db:reset

# Or manually
rm local/local.db
sqlite3 local/local.db < local/seed.sql
```

### 3. Function Logs

All `console.log()` in functions appear in terminal:

```ts
// functions/products.ts
export default async (req: Request) => {
  console.log('Products requested'); // Shows in terminal
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
const apiKey = process.env.SQUARE_ACCESS_TOKEN;
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
6. **Use Square Production** - Switch from Sandbox to live payments

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Production deployment and infrastructure
- [Customer-Facing Site](customer-facing.md) - Frontend implementation details
- [Admin Panel](admin-ui.md) - Backend management interface

## Quick Reference

| Command | Purpose |
|---------|---------|
| `netlify dev` | Start local dev server |
| `npm run db:seed` | Initialize local database |
| `npm run db:reset` | Reset database to seed data |
| `sqlite3 local/local.db` | Open database shell |
| `netlify deploy` | Deploy to preview |
| `netlify deploy --prod` | Deploy to production |

---

**Ready to start building!** Begin with setting up the basic files, then create your first function and HTML page.
