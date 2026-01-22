# Admin Panel Architecture

This document outlines the **local-only** admin panel implementation for managing
products and orders. The admin interface runs exclusively in development mode and
is never deployed to production.

> **See also:** [Cloud Architecture](cloud-arch.md) for complete infrastructure
> setup and [Customer-Facing Site](customer-facing.md) for the public
> storefront.

## Security-First Design Decision

**The admin panel is intentionally local-only and never exposed to the internet.**

### Why Local-Only?

Public admin endpoints are a primary attack vector:

- Constant automated scanning for `/admin`, `/dashboard`, `/wp-admin`, etc.
- Even with strong authentication, you're defending against bots 24/7
- Session management, CSRF, XSS, and auth bypass vulnerabilities
- Credential stuffing, brute force, and zero-day exploit attempts

**Attack Surface Comparison:**

```
Public Admin Endpoint:
- Authentication system (potential bypass)
- Session management (hijacking, fixation)
- CSRF protection (bypass attempts)
- Rate limiting (circumvention)
- Input validation (injection attacks)
- Authorization logic (privilege escalation)
= Multiple attack vectors, constant monitoring needed

Local-Only Admin:
- Physical access required (you need the codebase)
- No public endpoints to scan or exploit
- No auth system to bypass
- No sessions to hijack
= Zero public attack surface
```

### Business Context for Little Bitta

For a small granola business:

- **Low update frequency** - Products change occasionally, not hourly
- **Technical ownership** - If you can build a SvelteKit site, you can run it locally
- **Direct database access** - More powerful than web UI anyway
- **Zero ongoing security maintenance** - No auth system to patch/update

**This is more secure, simpler, and perfectly appropriate for the use case.**

## Overview

The admin panel provides a local-only interface for managing:

- Products (add, edit, delete, stock management)
- Orders (view, update status, track fulfillment)
- Basic analytics (sales, inventory)

**Technology:**

- **Frontend:** SvelteKit (development mode only)
- **Backend:** Direct Turso connection (production database)
- **Database:** Turso (SQLite-compatible)
- **Authentication:** Physical access + Netlify deployment auth

## Architecture

**Development Mode:**

```
Local Machine
    ↓
bun run dev (localhost:5173)
    ↓
/admin routes (only in dev)
    ↓
Direct Turso connection
    ↓
Production database
```

**Production Build:**

```
Admin routes excluded from build
    ↓
/admin → 404 Not Found
    ↓
Zero attack surface
```

## Database Schema

The same schema used across the entire application:

```sql
-- Products table
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, shipped, completed
  stripe_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price REAL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Admin users
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation

### 1. Configure SvelteKit to Exclude Admin Routes

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

### 2. Block Admin Routes in Production

```ts
// src/routes/admin/+layout.server.ts
import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";

export async function load() {
  // Admin panel only available in development mode
  if (!dev) {
    throw error(404, "Not found");
  }

  return {
    environment: "development",
  };
}
```

**Result:**

- In development: `/admin` routes work normally
- In production: `/admin` returns 404 (routes don't exist in build)
- No authentication system needed
- No session management
- No security vulnerabilities to patch

### 3. Connect to Production Database Locally

```bash
# .env.development (gitignored, local only)
# Connect local admin to production Turso
TURSO_URL=libsql://little-bitta-prod.turso.io
TURSO_TOKEN=your-production-turso-token

# For Netlify deployment credentials (separate)
NETLIFY_AUTH_TOKEN=your-netlify-token
```

```ts
// src/lib/server/db.ts
import { createClient } from "@libsql/client";
import { dev } from "$app/environment";

export const getDb = () => {
  // Both dev and prod can connect to production Turso
  // Dev connects for admin operations
  // Prod connects for customer-facing operations
  return createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_TOKEN!,
  });
};
```

## Route Structure

```
Development Only (localhost:5173):
/admin                     → Admin dashboard
/admin/products            → Product management
/admin/products/new        → Add new product
/admin/products/[id]/edit  → Edit product
/admin/orders              → Order management
/admin/orders/[id]         → Order details

Production (littlebitta.com):
/admin                     → 404 Not Found (route excluded from build)
```

**Security benefit:** Scanning tools that hit `/admin` on your production site
get a 404, just like any other non-existent route. No indication an admin panel
exists anywhere.

## Admin Workflow

### Daily Operations

**Update product stock:**

```bash
# 1. Start local dev server
bun run dev

# 2. Navigate to admin in browser
open http://localhost:5173/admin

# 3. Update product (changes saved directly to production Turso)

# 4. Verify on live site
open https://littlebitta.com
```

**No deployment needed** - Changes are immediate because you're writing directly
to the production database.

### Emergency Access Pattern (Optional)

If you need a safety valve for truly remote emergencies, add an environment-gated
escape hatch:

```ts
// src/routes/admin/+layout.server.ts
import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";

export async function load({ request }) {
  // Always allow in development
  if (dev) {
    return { environment: "development" };
  }

  // Emergency access only (use sparingly)
  const authHeader = request.headers.get("authorization");
  const emergencyToken = process.env.EMERGENCY_ADMIN_TOKEN;

  if (emergencyToken && authHeader === `Bearer ${emergencyToken}`) {
    console.warn("⚠️ EMERGENCY ADMIN ACCESS USED");
    return { environment: "emergency" };
  }

  // Production: admin does not exist
  throw error(404, "Not found");
}
```

**Usage:**

```bash
# Store in password manager, use only when truly needed
curl -H "Authorization: Bearer your-emergency-token" \
  https://littlebitta.com/admin/products

# Or add to browser bookmark for one-click access
```

**Important:** This slightly increases attack surface. Only add if you genuinely
need remote access in emergencies. Otherwise, keep it pure local-only.

### Admin Product Management

```ts
// src/routes/admin/products/+page.server.ts
import { getDb } from "$lib/server/db";
import { fail, redirect } from "@sveltejs/kit";

// Check authentication
async function requireAuth(cookies) {
  const sessionId = cookies.get("session");
  if (!sessionId) {
    throw redirect(303, "/admin/login");
  }
  // Verify session in database
  return sessionId;
}

export async function load({ cookies }) {
  await requireAuth(cookies);
  const db = getDb();

  const result = await db.execute(
    "SELECT * FROM products ORDER BY created_at DESC",
  );

  return {
    products: result.rows,
  };
}

export const actions = {
  // Create new product
  create: async ({ request, cookies }) => {
    await requireAuth(cookies);
    const db = getDb();
    const data = await request.formData();

    try {
      await db.execute({
        sql: "INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)",
        args: [
          data.get("name"),
          data.get("description"),
          data.get("price"),
          data.get("image_url"),
          data.get("stock") || 0,
        ],
      });

      return { success: true, message: "Product created" };
    } catch (error) {
      return fail(500, { error: "Failed to create product" });
    }
  },

  // Update product
  update: async ({ request, cookies }) => {
    await requireAuth(cookies);
    const db = getDb();
    const data = await request.formData();

    try {
      await db.execute({
        sql: "UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, stock = ? WHERE id = ?",
        args: [
          data.get("name"),
          data.get("description"),
          data.get("price"),
          data.get("image_url"),
          data.get("stock"),
          data.get("id"),
        ],
      });

      return { success: true, message: "Product updated" };
    } catch (error) {
      return fail(500, { error: "Failed to update product" });
    }
  },

  // Delete product (soft delete)
  delete: async ({ request, cookies }) => {
    await requireAuth(cookies);
    const db = getDb();
    const data = await request.formData();

    try {
      await db.execute({
        sql: "UPDATE products SET active = 0 WHERE id = ?",
        args: [data.get("id")],
      });

      return { success: true, message: "Product deleted" };
    } catch (error) {
      return fail(500, { error: "Failed to delete product" });
    }
  },
};
```

### Admin Orders Function

```ts
// netlify/functions/admin-orders.ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

function isAuthenticated(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async (req: Request) => {
  if (!isAuthenticated(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const method = req.method;

  try {
    // GET: List all orders with items
    if (method === "GET") {
      const orders = await db.execute(`
        SELECT
          o.id,
          o.customer_email,
          o.total,
          o.status,
          o.created_at,
          GROUP_CONCAT(p.name || ' x' || oi.quantity) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `);
      return Response.json(orders.rows);
    }

    // PUT: Update order status
    if (method === "PUT") {
      const { orderId, status } = await req.json();
      await db.execute({
        sql: "UPDATE orders SET status = ? WHERE id = ?",
        args: [status, orderId],
      });
      return Response.json({ success: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Admin orders error:", error);
    return Response.json({ error: "Operation failed" }, { status: 500 });
  }
};
```

## Frontend: Admin Panel UI

```html
<!-- public/admin.html -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Panel - Little Bitta</title>
    <script type="module" src="/admin.js"></script>
    <style>
      body {
        font-family: system-ui, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      th {
        background: #f5f5f5;
        font-weight: 600;
      }
      input,
      textarea {
        width: 100%;
        padding: 8px;
        margin: 5px 0;
        box-sizing: border-box;
      }
      button {
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
      }
      .login-form {
        max-width: 400px;
        margin: 100px auto;
      }
      .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .tab {
        padding: 10px 20px;
        cursor: pointer;
        background: #f5f5f5;
        border-radius: 5px;
      }
      .tab.active {
        background: #007bff;
        color: white;
      }
    </style>
  </head>
  <body x-data="adminPanel()" x-init="init()">
    <!-- Login Form -->
    <div x-show="!authenticated" class="login-form">
      <h1>Admin Login</h1>
      <form @submit.prevent="login">
        <input x-model="credentials.username" placeholder="Username" required />
        <input
          x-model="credentials.password"
          type="password"
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
        <p x-show="loginError" style="color: red;" x-text="loginError"></p>
      </form>
    </div>

    <!-- Admin Dashboard -->
    <div x-show="authenticated">
      <header
        style="display: flex; justify-content: space-between; align-items: center;"
      >
        <h1>Little Bitta Admin</h1>
        <div>
          <span x-text="username"></span> |
          <button @click="logout">Logout</button>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <div
          class="tab"
          :class="{ active: activeTab === 'products' }"
          @click="activeTab = 'products'"
        >
          Products
        </div>
        <div
          class="tab"
          :class="{ active: activeTab === 'orders' }"
          @click="activeTab = 'orders'; loadOrders()"
        >
          Orders
        </div>
      </div>

      <!-- Products Tab -->
      <div x-show="activeTab === 'products'">
        <h2>Product Management</h2>

        <!-- Product List -->
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="product in products" :key="product.id">
              <tr>
                <td x-text="product.name"></td>
                <td x-text="'$' + product.price"></td>
                <td x-text="product.stock"></td>
                <td x-text="product.active ? 'Active' : 'Inactive'"></td>
                <td>
                  <button @click="editProduct(product)">Edit</button>
                  <button @click="deleteProduct(product.id)">Delete</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- Add/Edit Form -->
        <h3 x-text="form.id ? 'Edit Product' : 'Add New Product'"></h3>
        <form @submit.prevent="saveProduct">
          <input x-model="form.name" placeholder="Product name" required />
          <textarea
            x-model="form.description"
            placeholder="Description"
            rows="3"
          ></textarea>
          <input
            x-model="form.price"
            type="number"
            step="0.01"
            placeholder="Price"
            required
          />
          <input
            x-model="form.stock"
            type="number"
            placeholder="Stock quantity"
            required
          />
          <input x-model="form.image_url" placeholder="Image URL" />
          <div>
            <button type="submit">Save Product</button>
            <button type="button" @click="form = {}">Cancel</button>
          </div>
        </form>
      </div>

      <!-- Orders Tab -->
      <div x-show="activeTab === 'orders'">
        <h2>Order Management</h2>

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="order in orders" :key="order.id">
              <tr>
                <td x-text="'#' + order.id"></td>
                <td x-text="order.customer_email"></td>
                <td x-text="order.items"></td>
                <td x-text="'$' + order.total"></td>
                <td x-text="order.status"></td>
                <td
                  x-text="new Date(order.created_at).toLocaleDateString()"
                ></td>
                <td>
                  <select
                    @change="updateOrderStatus(order.id, $event.target.value)"
                  >
                    <option value="">Update status...</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <script>
      function adminPanel() {
        return {
          authenticated: !!localStorage.getItem("adminToken"),
          username: localStorage.getItem("adminUsername") || "",
          credentials: { username: "", password: "" },
          loginError: "",
          activeTab: "products",
          products: [],
          orders: [],
          form: {},

          async init() {
            if (this.authenticated) {
              await this.loadProducts();
            }
          },

          async login() {
            this.loginError = "";
            try {
              const res = await fetch("/.netlify/functions/admin-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.credentials),
              });

              if (res.ok) {
                const { token, username } = await res.json();
                localStorage.setItem("adminToken", token);
                localStorage.setItem("adminUsername", username);
                this.authenticated = true;
                this.username = username;
                await this.loadProducts();
              } else {
                const error = await res.json();
                this.loginError = error.error || "Login failed";
              }
            } catch (error) {
              this.loginError = "Network error. Please try again.";
            }
          },

          logout() {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUsername");
            this.authenticated = false;
            this.username = "";
            this.products = [];
            this.orders = [];
          },

          async loadProducts() {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/.netlify/functions/admin-products", {
              headers: { Authorization: `Bearer ${token}` },
            });
            this.products = await res.json();
          },

          async loadOrders() {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/.netlify/functions/admin-orders", {
              headers: { Authorization: `Bearer ${token}` },
            });
            this.orders = await res.json();
          },

          async saveProduct() {
            const token = localStorage.getItem("adminToken");
            const method = this.form.id ? "PUT" : "POST";

            await fetch("/.netlify/functions/admin-products", {
              method,
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(this.form),
            });

            this.form = {};
            await this.loadProducts();
          },

          editProduct(product) {
            this.form = { ...product };
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
          },

          async deleteProduct(id) {
            if (
              confirm("Delete this product? It will be hidden from customers.")
            ) {
              const token = localStorage.getItem("adminToken");
              await fetch(`/.netlify/functions/admin-products?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              await this.loadProducts();
            }
          },

          async updateOrderStatus(orderId, status) {
            if (!status) return;

            const token = localStorage.getItem("adminToken");
            await fetch("/.netlify/functions/admin-orders", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ orderId, status }),
            });

            await this.loadOrders();
          },
        };
      }
    </script>
  </body>
</html>
```

## Security Model

### Authentication Layers

**Local-only approach has implicit multi-factor authentication:**

1. **Physical Access** - Must have codebase cloned locally
2. **Git Authentication** - Authenticated to GitHub/repository
3. **Netlify Authentication** - Authenticated to deploy (separate concern)
4. **Turso Token** - Must have production database credentials

This is actually **more secure** than a password-protected web UI because an
attacker would need:

- Your laptop (physical access)
- Your GitHub credentials (to clone)
- Your `.env.development` file (with Turso token)

Compare to public admin panel where they only need:

- To find the URL (automated scanning)
- To bypass authentication (one attack surface)

### Credential Management

```bash
# .env.development (NEVER commit this file)
TURSO_URL=libsql://little-bitta-prod.turso.io
TURSO_TOKEN=eyJhbGc...  # Get from: turso db tokens create little-bitta
```

**Token security:**

- Store in `.env.development` (gitignored)
- Never commit to repository
- Rotate periodically: `turso db tokens create little-bitta`
- Revoke old tokens: `turso db tokens revoke <token-id>`

**Backup access:**

```bash
# Always keep Turso CLI access as backup
turso auth login
turso db shell little-bitta

# Can manage products directly via SQL if needed
sqlite> UPDATE products SET stock = 100 WHERE name = 'Pistachio';
```

## Alternative: Git-Based Product Management

For even simpler management (and version control), consider file-based products:

```
products/
├── peanut-butter-nutella.json
├── pistachio.json
├── pb-chocolate.json
└── honey-bear.json
```

```json
// products/pistachio.json
{
  "slug": "pistachio",
  "name": "Pistachio",
  "description": "Crunchy pistachios with a hint of honey",
  "price": 10.0,
  "stock": 50,
  "image": "/images/pistachio.jpg",
  "active": true
}
```

```ts
// scripts/sync-products.ts
// Runs on build: syncs JSON files to Turso
import { getDb } from "$lib/server/db";
import { readdir, readFile } from "fs/promises";

async function syncProducts() {
  const db = getDb();
  const files = await readdir("./products");

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const product = JSON.parse(await readFile(`./products/${file}`, "utf-8"));

    await db.execute({
      sql: `INSERT INTO products (slug, name, description, price, stock, image_url, active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
              name = excluded.name,
              description = excluded.description,
              price = excluded.price,
              stock = excluded.stock,
              image_url = excluded.image_url,
              active = excluded.active`,
      args: [
        product.slug,
        product.name,
        product.description,
        product.price,
        product.stock,
        product.image,
        product.active,
      ],
    });
  }
}

syncProducts();
```

**Workflow:**

1. Edit `products/pistachio.json` (update stock)
2. Commit: `git commit -m "Update pistachio stock to 25"`
3. Push: `git push`
4. Netlify builds and runs sync script
5. Product updated in Turso

**Benefits:**

- Version control for all changes (`git log products/`)
- Can revert mistakes (`git revert abc123`)
- No admin UI needed at all
- Can edit files in GitHub web UI (emergency fallback)
- Audit trail of who changed what when

## File Uploads (Product Images)

**Recommended approach for Little Bitta:**

**Option 1: Commit images to `/static/images/`**

```
static/images/
├── pb-nutella.jpg
├── pistachio.jpg
├── pb-chocolate.jpg
└── honey-bear.jpg
```

For a small product catalog (4-6 items), just commit images to git. Simple,
version controlled, no external dependencies.

**Option 2: Use Cloudinary (if catalog grows)**

```bash
# Upload via CLI
cloudinary upload products/pistachio.jpg

# Returns URL
https://res.cloudinary.com/little-bitta/image/upload/v1234/pistachio.jpg
```

**Option 3: Netlify Large Media**
Automatic image optimization and CDN delivery for git-committed images.

## Security Checklist

**Local-Only Admin:**

- [x] Admin routes excluded from production build
- [x] No public admin endpoints to scan
- [x] No authentication system to bypass
- [x] No session management vulnerabilities
- [x] No CSRF, XSS, or injection vectors
- [ ] Turso token stored in `.env.development` (gitignored)
- [ ] Enable 2FA for Netlify account (deployment security)
- [ ] Enable 2FA for GitHub account (code access security)
- [ ] Rotate Turso tokens periodically
- [ ] Backup access via Turso CLI (`turso auth login`)

**Production Site (Customer-Facing):**

- [x] HTTPS only (automatic with Netlify)
- [x] No admin endpoints exposed
- [x] Server-side input validation
- [x] Stripe handles payment data (PCI-compliant)
- [x] Environment variables for secrets
- [ ] Monitor Netlify logs for anomalies
- [ ] Test checkout flow regularly

## Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/little-bitta-site.git
cd little-bitta-site

# 2. Install dependencies
bun install

# 3. Create .env.development (gitignored)
cat > .env.development <<EOF
# Production Turso database
TURSO_URL=libsql://little-bitta-prod.turso.io
TURSO_TOKEN=your-production-token

# Stripe test mode for testing checkout locally
STRIPE_SECRET_KEY=sk_test_...
PUBLIC_STRIPE_KEY=pk_test_...
EOF

# 4. Get Turso token (if you don't have it)
turso auth login
turso db tokens create little-bitta

# 5. Start development server
bun run dev

# 6. Access admin
open http://localhost:5173/admin
```

### Daily Admin Tasks

**Check orders:**

```bash
bun run dev
open http://localhost:5173/admin/orders
```

**Update product stock:**

```bash
bun run dev
# Navigate to /admin/products
# Edit product, update stock
# Changes save directly to production Turso
```

**Verify changes on live site:**

```bash
open https://littlebitta.com
```

## Admin UI Features

### Product Management (Local UI)

- View all products (server-rendered list)
- Add new product (form POST)
- Edit product details (form POST)
- Update stock levels
- Mark products active/inactive
- Direct Turso write (immediate changes)

### Order Management (Local UI)

- View recent orders (read-only)
- Filter by status/date
- View order details
- Update fulfillment status
- Direct Turso queries

### Analytics (Future)

Can add analytics dashboard to local admin:

- Revenue trends
- Popular products
- Low stock warnings
- Customer insights

All data queries run against production Turso, displayed in local UI.

## Threat Model Analysis

### Attack Vectors Eliminated

**Public Admin Panel (Traditional):**

```
Attack Surface:
├── Automated scanning (bots find /admin)
├── Credential stuffing (leaked password databases)
├── Brute force attacks (dictionary attacks on login)
├── Session hijacking (XSS, CSRF, network sniffing)
├── SQL injection (malicious input in forms)
├── Authentication bypass (logic flaws, zero-days)
├── Privilege escalation (normal user → admin)
└── DDoS on admin endpoints (service disruption)

Security Requirements:
├── Rate limiting implementation
├── CAPTCHA or similar
├── Session management (secure cookies, rotation)
├── CSRF tokens
├── Input sanitization
├── SQL parameterization
├── Password hashing (bcrypt/argon2)
├── 2FA implementation
├── Audit logging
├── Security headers
├── Regular security updates
└── Penetration testing
```

**Local-Only Admin (This Implementation):**

```
Attack Surface:
└── Physical access to developer laptop
    └── Requires multiple compromises:
        ├── Physical theft of laptop
        ├── Bypass disk encryption
        ├── Access GitHub account (2FA)
        └── Access .env.development (Turso token)

Security Requirements:
├── Disk encryption (FileVault/BitLocker)
├── Strong laptop password
├── GitHub 2FA
├── Turso token rotation
└── .env.development in .gitignore
```

**Result:** Attack surface reduced by ~95%, security maintenance reduced to zero.

### Risk Assessment

**For Little Bitta Granola:**

- **Asset value:** Low (granola inventory, customer emails)
- **Attack motivation:** Very low (not a high-value target)
- **Update frequency:** Low (seasonal flavors, stock updates)
- **Technical capability:** High (you built the site)

**Conclusion:** Local-only admin is the correct security posture. The convenience
trade-off (can't update from phone) is acceptable given the low update frequency
and high security benefit.

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Complete infrastructure setup and deployment
- [Customer-Facing Site](customer-facing.md) - How customers interact with products you manage here
- [Local Development](local-dev.md) - Running the site locally (includes admin access)
