# Cloud Architecture Guide

This document covers the cloud-native architecture for Little Bitta Granola e-commerce site using Netlify Functions + Turso.

> **See also:** [Customer-Facing Site](customer-facing.md) for storefront implementation and [Admin Panel](admin-ui.md) for product management interface.

## Architecture Decision

**Chosen Stack:**
- **Frontend:** Netlify (static hosting + CDN)
- **Backend:** Netlify Functions (serverless)
- **Database:** Turso (SQLite-compatible, cloud-hosted)
- **Payments:** Square
- **Admin:** Netlify Functions with auth

**Why This Stack:**
1. Already familiar with Netlify (littlebitta.com is hosted there)
2. Free tier generous enough for launch
3. Zero server management
4. Turso is SQLite-compatible (minimal code changes)
5. Automatic SSL, CDN, DDoS protection
6. Clear growth path

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Netlify Edge Network                 │
│  (CDN, SSL, DDoS Protection - Automatic & Free)         │
└───────────────┬─────────────────────────────────────────┘
                │
    ┌───────────┴──────────┐
    │                      │
    ▼                      ▼
┌──────────┐        ┌─────────────┐
│  Static  │        │  Netlify    │
│  Assets  │        │  Functions  │
│          │        │  (Backend)  │
│ - HTML   │        │             │
│ - CSS    │        │ - API       │
│ - Alpine │        │ - Admin     │
└──────────┘        └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         ┌────────┐   ┌───────┐   ┌────────┐
         │ Turso  │   │Square │   │ Email  │
         │  (DB)  │   │  Pay  │   │Service │
         └────────┘   └───────┘   └────────┘
```

## Turso Database Setup

### What is Turso?

Turso is a cloud-hosted SQLite database with HTTP API. Same SQL syntax as `bun:sqlite`, but works in serverless environments.

**Key features:**
- SQLite-compatible (use same schema/queries)
- Edge replication (fast worldwide)
- Free tier: 500MB storage, 1B row reads/month
- Automatic backups

### Installation & Setup

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create database
turso db create little-bitta

# Get connection details
turso db show little-bitta --url
# Output: libsql://little-bitta-[your-org].turso.io

# Generate auth token
turso db tokens create little-bitta
# Output: eyJhbGc... (save this)
```

### Database Schema

```sql
-- Run this to create tables
turso db shell little-bitta

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
  status TEXT DEFAULT 'pending',
  square_payment_id TEXT,
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

### Code Migration: SQLite → Turso

**Before (local SQLite):**
```ts
import { Database } from "bun:sqlite";
const db = new Database("store.db");

const products = db.query("SELECT * FROM products").all();
```

**After (Turso):**
```ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

const result = await db.execute("SELECT * FROM products");
const products = result.rows;
```

**Key difference:** `db.execute()` is async and returns `{ rows, columns }`.

## Netlify Functions Structure

```
little-bitta-site/
├── public/              # Static frontend
│   ├── index.html
│   ├── styles.css
│   └── images/
├── netlify/
│   └── functions/       # Backend API
│       ├── products.ts       # GET /api/products
│       ├── product.ts        # GET /api/product/:id
│       ├── checkout.ts       # POST /api/checkout
│       ├── admin-login.ts    # POST /api/admin/login
│       ├── admin-products.ts # CRUD /api/admin/products
│       └── admin-orders.ts   # GET /api/admin/orders
├── netlify.toml         # Netlify config
└── package.json
```

### Example Function: Get Products

```ts
// netlify/functions/products.ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

export default async (req: Request) => {
  try {
    const result = await db.execute(
      "SELECT * FROM products WHERE active = 1"
    );

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60" // Cache for 1 min
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch products" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

### Example Function: Admin Products CRUD

```ts
// netlify/functions/admin-products.ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

// Simple auth check (expand with JWT in production)
function isAuthenticated(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  // Check session/JWT token here
  return authHeader === `Bearer ${process.env.ADMIN_SECRET}`;
}

export default async (req: Request) => {
  if (!isAuthenticated(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const method = req.method;

  // GET: List all products
  if (method === "GET") {
    const result = await db.execute("SELECT * FROM products");
    return Response.json(result.rows);
  }

  // POST: Create new product
  if (method === "POST") {
    const product = await req.json();
    await db.execute({
      sql: "INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)",
      args: [product.name, product.description, product.price, product.image_url, product.stock]
    });
    return Response.json({ success: true });
  }

  // PUT: Update product
  if (method === "PUT") {
    const product = await req.json();
    await db.execute({
      sql: "UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, stock = ? WHERE id = ?",
      args: [product.name, product.description, product.price, product.image_url, product.stock, product.id]
    });
    return Response.json({ success: true });
  }

  // DELETE: Remove product
  if (method === "DELETE") {
    const id = url.searchParams.get("id");
    await db.execute({
      sql: "UPDATE products SET active = 0 WHERE id = ?",
      args: [id]
    });
    return Response.json({ success: true });
  }

  return new Response("Method not allowed", { status: 405 });
};
```

## Square Payment Integration

```ts
// netlify/functions/checkout.ts
import { createClient } from "@libsql/client";
import { Client, Environment } from "square";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
});

const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: Environment.Production // Use Environment.Sandbox for testing
});

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { items, email, sourceId } = await req.json();

    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Create order in database first
    const orderResult = await db.execute({
      sql: "INSERT INTO orders (customer_email, total, status) VALUES (?, ?, 'pending')",
      args: [email, total]
    });
    const orderId = orderResult.lastInsertRowid;

    // Insert order items
    for (const item of items) {
      await db.execute({
        sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        args: [orderId, item.productId, item.quantity, item.price]
      });
    }

    // Process payment with Square
    const payment = await square.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(Math.round(total * 100)), // Convert to cents
        currency: "USD"
      },
      idempotencyKey: `order-${orderId}-${Date.now()}`
    });

    // Update order with payment ID
    await db.execute({
      sql: "UPDATE orders SET square_payment_id = ?, status = 'paid' WHERE id = ?",
      args: [payment.result.payment?.id, orderId]
    });

    return Response.json({
      success: true,
      orderId,
      paymentId: payment.result.payment?.id
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json({ error: "Checkout failed" }, { status: 500 });
  }
};
```

## Admin Panel Implementation

```html
<!-- public/admin.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Admin - Little Bitta</title>
  <script src="//unpkg.com/alpinejs" defer></script>
</head>
<body x-data="adminPanel()">
  <!-- Login Form -->
  <div x-show="!authenticated">
    <h1>Admin Login</h1>
    <form @submit.prevent="login">
      <input x-model="credentials.username" placeholder="Username" required>
      <input x-model="credentials.password" type="password" placeholder="Password" required>
      <button type="submit">Login</button>
    </form>
  </div>

  <!-- Admin Dashboard -->
  <div x-show="authenticated">
    <h1>Product Management</h1>

    <!-- Product List -->
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <template x-for="product in products">
          <tr>
            <td x-text="product.name"></td>
            <td x-text="'$' + product.price"></td>
            <td x-text="product.stock"></td>
            <td>
              <button @click="editProduct(product)">Edit</button>
              <button @click="deleteProduct(product.id)">Delete</button>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- Add/Edit Form -->
    <form @submit.prevent="saveProduct">
      <input x-model="form.name" placeholder="Name" required>
      <textarea x-model="form.description" placeholder="Description"></textarea>
      <input x-model="form.price" type="number" step="0.01" placeholder="Price" required>
      <input x-model="form.stock" type="number" placeholder="Stock" required>
      <input x-model="form.image_url" placeholder="Image URL">
      <button type="submit">Save</button>
    </form>

    <button @click="logout">Logout</button>
  </div>

  <script>
    function adminPanel() {
      return {
        authenticated: !!localStorage.getItem('adminToken'),
        credentials: { username: '', password: '' },
        products: [],
        form: {},

        async init() {
          if (this.authenticated) {
            await this.loadProducts();
          }
        },

        async login() {
          const res = await fetch('/.netlify/functions/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.credentials)
          });

          if (res.ok) {
            const { token } = await res.json();
            localStorage.setItem('adminToken', token);
            this.authenticated = true;
            await this.loadProducts();
          } else {
            alert('Login failed');
          }
        },

        logout() {
          localStorage.removeItem('adminToken');
          this.authenticated = false;
        },

        async loadProducts() {
          const token = localStorage.getItem('adminToken');
          const res = await fetch('/.netlify/functions/admin-products', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          this.products = await res.json();
        },

        async saveProduct() {
          const token = localStorage.getItem('adminToken');
          const method = this.form.id ? 'PUT' : 'POST';

          await fetch('/.netlify/functions/admin-products', {
            method,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.form)
          });

          this.form = {};
          await this.loadProducts();
        },

        editProduct(product) {
          this.form = { ...product };
        },

        async deleteProduct(id) {
          if (confirm('Delete this product?')) {
            const token = localStorage.getItem('adminToken');
            await fetch(`/.netlify/functions/admin-products?id=${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            await this.loadProducts();
          }
        }
      };
    }
  </script>
</body>
</html>
```

## Netlify Configuration

```toml
# netlify.toml
[build]
  command = "bun build public/index.html public/admin.html"
  publish = "public"
  functions = "netlify/functions"

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
    Access-Control-Allow-Origin = "https://littlebitta.com"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

## Security Considerations

### 1. Payment Data (Critical)

With Square, you **never handle credit card data**. Use Square's Web Payment SDK:

```html
<script src="https://web.squarecdn.com/v1/square.js"></script>
<script>
  const payments = Square.payments(appId, locationId);
  const card = await payments.card();
  await card.attach('#card-container');

  // On checkout
  const result = await card.tokenize();
  const sourceId = result.token; // Send this to your backend

  // Backend processes payment with sourceId
  await fetch('/.netlify/functions/checkout', {
    method: 'POST',
    body: JSON.stringify({ sourceId, items, email })
  });
</script>
```

Never store card numbers. Square handles everything.

### 2. Admin Authentication

**Simple approach (launch):**
```ts
// Environment variable: ADMIN_SECRET=your-secret-token
const isAuthenticated = req.headers.get("Authorization") === `Bearer ${process.env.ADMIN_SECRET}`;
```

**Better approach (production):**
- Use JWT tokens with expiration
- Hash passwords with Bun.password.hash()
- Implement rate limiting on login endpoint
- Consider IP whitelist for admin panel

### 3. Environment Variables

```bash
# Set in Netlify dashboard: Site settings → Environment variables
TURSO_URL=libsql://little-bitta-[org].turso.io
TURSO_TOKEN=eyJhbGc...
SQUARE_ACCESS_TOKEN=sq0atp-...
SQUARE_LOCATION_ID=L...
ADMIN_SECRET=your-secret-here
```

Never commit these to git.

### 4. Rate Limiting

Netlify doesn't have built-in rate limiting. Add to functions:

```ts
const rateLimits = new Map();

function rateLimit(ip: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimits.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }

  rateLimits.set(ip, record);

  return record.count <= maxRequests;
}

// In function
const ip = req.headers.get('x-forwarded-for') || 'unknown';
if (!rateLimit(ip, 5, 60000)) {
  return new Response('Too many requests', { status: 429 });
}
```

### 5. HTTPS & Headers

Netlify provides:
- Automatic SSL (Let's Encrypt)
- DDoS protection
- CDN caching
- Security headers (configure in netlify.toml)

## Cost Breakdown

### Phase 1: Launch (Free)

| Service | Free Tier | Limit | Cost |
|---------|-----------|-------|------|
| **Netlify** | 100GB bandwidth/month | ~200k page views | $0 |
| **Turso** | 500MB storage, 1B row reads | ~100k orders | $0 |
| **Square** | No monthly fee | 2.9% + $0.30 per transaction | Pay per transaction |
| **Domain** | N/A | Already own littlebitta.com | $0 |
| **Total** | | | **$0/mo** |

**Transaction costs (Square):**
- $10 granola bag = $0.59 Square fee
- Net revenue: $9.41 per sale
- 100 sales/month = $941 revenue, $59 in fees

### Phase 2: Growing (Low Cost)

**When you exceed free tier (likely 6-12 months out):**

| Service | Paid Plan | Cost |
|---------|-----------|------|
| **Netlify** | Pro (1TB bandwidth) | $19/mo |
| **Turso** | Scaler (25GB, unlimited reads) | $29/mo |
| **Square** | Same (per transaction) | 2.9% + $0.30 |
| **Total** | | **$48/mo** |

**At this point, you're doing:**
- 1M+ page views/month
- 10k+ orders (= $100k revenue)
- Infrastructure cost: 0.05% of revenue

### Phase 3: Scaling (Optimized)

**When revenue > $10k/month, consider optimizations:**

| Approach | Cost | When |
|----------|------|------|
| **Stay on Netlify + Turso** | $48/mo | Easiest, works for most |
| **Move backend to Railway** | $5-20/mo | Want more control |
| **Move to VPS (Hetzner)** | $5-10/mo | Traffic is huge |

**Most likely:** Stay on Netlify + Turso. At $10k/mo revenue, $48/mo infrastructure is negligible.

## Growth Plan

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Launch ($0/mo)                                 │
│ - Netlify free tier                                     │
│ - Turso free tier                                       │
│ - 0-1,000 orders/month                                  │
│ - Revenue: $0-$10k/month                                │
│ - Timeline: Months 0-12                                 │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2: Growing ($48/mo)                               │
│ - Netlify Pro ($19/mo)                                  │
│ - Turso Scaler ($29/mo)                                 │
│ - 1,000-10,000 orders/month                             │
│ - Revenue: $10k-$100k/month                             │
│ - Timeline: Months 12-24                                │
│ - Consider: Email marketing, inventory management       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Scaling (Optimize)                             │
│ - Evaluate: Stay on Netlify vs VPS vs hybrid            │
│ - Add: CDN for images (Cloudflare R2/S3)                │
│ - Add: Analytics (Plausible/Fathom)                     │
│ - Add: Customer support (Intercom/Plain)                │
│ - Revenue: $100k+/month                                 │
│ - Timeline: Months 24+                                  │
│ - Infrastructure cost: <1% of revenue                   │
└─────────────────────────────────────────────────────────┘
```

### Traffic Thresholds

**Netlify Free Tier (100GB/month):**
```
Average page size: 500KB
100GB = 200,000 page views/month

Typical conversion: 2% of visitors buy
200,000 visitors = 4,000 orders/month = $40k revenue

Stay free until $40k/month revenue
```

**Turso Free Tier (1B row reads/month):**
```
Per order: ~10 DB reads
1B reads = 100M orders/month

You'll never hit this limit
```

**Realistic timeline:**
- Months 0-6: 0-100 orders/month ($0-1k revenue) → Free
- Months 6-12: 100-500 orders/month ($1k-5k revenue) → Free
- Months 12-18: 500-2000 orders/month ($5k-20k revenue) → Free
- Months 18-24: 2000-5000 orders/month ($20k-50k revenue) → Might need paid
- Year 2+: Scale as needed

**Most granola shops never exceed free tier.**

## Deployment Checklist

### Initial Setup

- [ ] Create Turso database
- [ ] Set up Turso tables (products, orders, etc.)
- [ ] Create Square account (sandbox for testing)
- [ ] Get Square API credentials
- [ ] Set up Netlify site (import from GitHub)
- [ ] Configure environment variables in Netlify
- [ ] Deploy functions
- [ ] Test payment flow in Square sandbox
- [ ] Switch to Square production
- [ ] Configure custom domain (littlebitta.com)

### Pre-Launch

- [ ] Add at least 4 products via admin panel
- [ ] Test full purchase flow
- [ ] Verify email receipts work
- [ ] Test on mobile devices
- [ ] Check SEO meta tags
- [ ] Set up basic analytics (Netlify Analytics or Plausible)
- [ ] Create backup strategy (Turso auto-backups)
- [ ] Document admin procedures

### Post-Launch

- [ ] Monitor Netlify function logs
- [ ] Track first orders
- [ ] Respond to customer emails quickly
- [ ] Iterate on product descriptions/images
- [ ] Collect customer feedback
- [ ] Optimize based on analytics

## Monitoring & Observability

### Netlify Built-in

Netlify provides:
- Function logs (last 24 hours on free tier)
- Bandwidth usage
- Build logs
- Deploy previews

### Add-ons

**Analytics (choose one):**
- Netlify Analytics: $9/mo (server-side, accurate)
- Plausible: $9/mo (privacy-friendly)
- Google Analytics: Free (client-side)

**Error tracking:**
- Sentry: Free tier (5k events/month)
- Rollbar: Free tier (5k events/month)

**Uptime monitoring:**
- UptimeRobot: Free (50 monitors, 5-min checks)
- Better Uptime: Free tier

### Example: Basic Error Tracking

```ts
// netlify/functions/products.ts
try {
  const result = await db.execute("SELECT * FROM products");
  return Response.json(result.rows);
} catch (error) {
  // Log to Sentry
  console.error("Database error:", error);

  // Send alert (if critical)
  if (process.env.SLACK_WEBHOOK) {
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 Database error: ${error.message}`
      })
    });
  }

  return Response.json({ error: "Server error" }, { status: 500 });
}
```

## Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Turso Quickstart](https://docs.turso.tech/quickstart)
- [Square Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Alpine.js Documentation](https://alpinejs.dev/)
- [Bun Runtime](https://bun.sh/docs)

## Conclusion

This architecture gives you:
- **$0/mo to start** (free tiers)
- **Zero server management** (fully managed)
- **Familiar tools** (already use Netlify)
- **Clear growth path** (scales with revenue)
- **SQLite familiarity** (Turso is compatible)
- **Production-ready security** (SSL, DDoS, PCI via Square)

Start building, launch fast, scale when revenue justifies it. Focus on selling granola, not infrastructure.
