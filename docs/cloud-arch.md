# Cloud Architecture Guide

This document covers the cloud-native architecture for Little Bitta Granola
e-commerce site using SvelteKit, Netlify, and Turso with progressive enhancement.

> **See also:** [Customer-Facing Site](customer-facing.md) for storefront
> implementation and [Admin Panel](admin-ui.md) for product management
> interface.

## Design Philosophy

This architecture follows **Resilient Web Design** principles:

1. **HTML-first delivery** - Server renders semantic HTML for all pages
2. **Progressive enhancement** - JavaScript enhances but isn't required
3. **Graceful degradation** - Core features work without JavaScript
4. **Performance** - Fast initial page load via SSR/SSG

## Architecture Decision

**Chosen Stack:**

- **Frontend:** SvelteKit with SSR/SSG (server-rendered HTML)
- **Hosting:** Netlify (static + edge functions, CDN)
- **Backend:** SvelteKit endpoints + Netlify Functions (serverless)
- **Database:** Turso (SQLite-compatible, cloud-hosted)
- **Payments:** Stripe
- **Admin:** SvelteKit with authentication

**Why This Stack:**

1. SvelteKit enables progressive enhancement out of the box
2. Server-side rendering for fast, resilient page loads
3. Already familiar with Netlify (littlebitta.com is hosted there)
4. Free tier generous enough for launch
5. Zero server management
6. Turso is SQLite-compatible (minimal code changes)
7. Automatic SSL, CDN, DDoS protection
8. Clear growth path

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Netlify Edge Network                     │
│         (CDN, SSL, DDoS Protection - Automatic)             │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│         SvelteKit Application         │
│                                       │
│  SSR/SSG: Renders HTML on server      │
│  Hydration: Adds interactivity        │
│  Progressive Enhancement: Forms work  │
│  without JS, enhanced with JS         │
└───────────────┬───────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Static   │ │ SvelteKit│ │ Netlify  │
│ Assets   │ │ Endpoints│ │ Functions│
│          │ │          │ │          │
│ - Images │ │ - Forms  │ │ - Legacy │
│ - CSS    │ │ - API    │ │ - Webhooks│
│ - Fonts  │ │ - Auth   │ │          │
└──────────┘ └────┬─────┘ └────┬─────┘
                  │            │
       ┌──────────┼────────────┼─────────┐
       │          │            │         │
       ▼          ▼            ▼         ▼
  ┌────────┐ ┌───────┐   ┌────────┐ ┌──────┐
  │ Turso  │ │Stripe │   │ Email  │ │ Logs │
  │  (DB)  │ │  Pay  │   │Service │ │      │
  └────────┘ └───────┘   └────────┘ └──────┘
```

## Rendering Strategy

**Server-Side Rendering (SSR):**

- All pages render HTML on Netlify's edge
- Users see content immediately (no loading spinners)
- SEO-friendly, accessible, resilient

**Static Site Generation (SSG):**

- Product pages pre-rendered at build time
- Served as static HTML (ultra-fast)
- Regenerate on product updates

**Progressive Enhancement:**

- HTML works without JavaScript (forms POST to endpoints)
- CSS adds responsive design and visual polish
- JavaScript enhances with animations, optimistic UI, client-side validation

## Turso Database Setup

### What is Turso?

Turso is a cloud-hosted SQLite database with HTTP API. Same SQL syntax as
`bun:sqlite`, but works in serverless environments.

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
  authToken: process.env.TURSO_TOKEN,
});

const result = await db.execute("SELECT * FROM products");
const products = result.rows;
```

**Key difference:** `db.execute()` is async and returns `{ rows, columns }`.

## Project Structure

```
little-bitta-site/
├── src/
│   ├── routes/              # SvelteKit routes (SSR/SSG)
│   │   ├── +page.svelte           # Homepage (SSR)
│   │   ├── +page.server.ts        # Load products server-side
│   │   ├── products/
│   │   │   ├── +page.svelte       # Product list (SSG)
│   │   │   └── [slug]/
│   │   │       └── +page.svelte   # Product detail (SSG)
│   │   ├── cart/
│   │   │   ├── +page.svelte       # Cart page
│   │   │   └── +page.server.ts    # Add/remove actions
│   │   ├── checkout/
│   │   │   ├── +page.svelte       # Checkout form
│   │   │   └── +server.ts         # Process payment
│   │   └── admin/
│   │       ├── +page.svelte       # Admin dashboard
│   │       └── +page.server.ts    # Admin actions
│   ├── lib/
│   │   ├── db.ts                  # Turso client
│   │   ├── stripe.ts              # Stripe client
│   │   └── components/            # Reusable components
│   └── app.html                   # HTML template
├── static/                  # Static assets
│   ├── images/
│   ├── fonts/
│   └── favicon.png
├── netlify/
│   └── functions/           # Legacy/webhook functions
├── svelte.config.js         # SvelteKit config
├── netlify.toml             # Netlify config
└── package.json
```

### Example: Server-Side Product Loading

```ts
// src/routes/+page.server.ts
import { getDb } from "$lib/db";

export async function load() {
  const db = getDb();

  try {
    const result = await db.execute(
      "SELECT id, name, description, price, image_url, stock FROM products WHERE active = 1",
    );

    // Return data that will be rendered as HTML
    return {
      products: result.rows,
    };
  } catch (error) {
    console.error("Failed to load products:", error);
    return {
      products: [],
      error: "Failed to load products",
    };
  }
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script>
  export let data;
</script>

<h1>Our Granola</h1>

<!-- This HTML is rendered on the server, visible immediately -->
<div class="product-grid">
  {#each data.products as product}
    <article class="product-card">
      <img src={product.image_url} alt={product.name}>
      <h2>{product.name}</h2>
      <p>{product.description}</p>
      <p class="price">${product.price}</p>

      <!-- Works without JavaScript: standard form POST -->
      <form method="POST" action="/cart?/add">
        <input type="hidden" name="productId" value={product.id}>
        <button type="submit">Add to Cart</button>
      </form>
    </article>
  {/each}
</div>
```

### Example: Progressive Enhancement with Form Actions

```ts
// src/routes/cart/+page.server.ts
import { getDb } from "$lib/db";
import { fail } from "@sveltejs/kit";

export const actions = {
  // Add to cart action (works without JavaScript)
  add: async ({ request, cookies }) => {
    const data = await request.formData();
    const productId = data.get("productId");

    // Get current cart from cookie
    const cart = JSON.parse(cookies.get("cart") || "[]");

    // Add product to cart
    cart.push({ productId, quantity: 1 });

    // Save cart to cookie
    cookies.set("cart", JSON.stringify(cart), { path: "/" });

    return { success: true };
  },

  // Remove from cart
  remove: async ({ request, cookies }) => {
    const data = await request.formData();
    const index = Number(data.get("index"));

    const cart = JSON.parse(cookies.get("cart") || "[]");
    cart.splice(index, 1);
    cookies.set("cart", JSON.stringify(cart), { path: "/" });

    return { success: true };
  },
};

export async function load({ cookies }) {
  const db = getDb();
  const cartData = JSON.parse(cookies.get("cart") || "[]");

  // Load full product details for cart items
  const cart = await Promise.all(
    cartData.map(async (item: any) => {
      const result = await db.execute({
        sql: "SELECT * FROM products WHERE id = ?",
        args: [item.productId],
      });
      return { ...result.rows[0], quantity: item.quantity };
    }),
  );

  return { cart };
}
```

```svelte
<!-- src/routes/cart/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  export let data;
  export let form;
</script>

<h1>Shopping Cart</h1>

{#if data.cart.length === 0}
  <p>Your cart is empty</p>
{:else}
  {#each data.cart as item, i}
    <div class="cart-item">
      <span>{item.name} - ${item.price}</span>

      <!-- Works without JS, enhanced with use:enhance -->
      <form method="POST" action="?/remove" use:enhance>
        <input type="hidden" name="index" value={i}>
        <button type="submit">Remove</button>
      </form>
    </div>
  {/each}

  <a href="/checkout">Proceed to Checkout</a>
{/if}

{#if form?.success}
  <p class="success">Cart updated!</p>
{/if}
```

## Stripe Payment Integration

```ts
// src/routes/checkout/+page.server.ts
import { getDb } from "$lib/db";
import { getStripeClient } from "$lib/stripe";
import { fail, redirect } from "@sveltejs/kit";

export async function load({ cookies }) {
  // Server-render cart for checkout page
  const db = getDb();
  const cartData = JSON.parse(cookies.get("cart") || "[]");

  const cart = await Promise.all(
    cartData.map(async (item: any) => {
      const result = await db.execute({
        sql: "SELECT * FROM products WHERE id = ?",
        args: [item.productId],
      });
      return { ...result.rows[0], quantity: item.quantity };
    }),
  );

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { cart, total };
}

export const actions = {
  // Process payment (works without JavaScript via form submission)
  checkout: async ({ request, cookies }) => {
    const db = getDb();
    const stripe = getStripeClient();
    const data = await request.formData();

    const email = data.get("email") as string;
    const paymentIntentId = data.get("paymentIntentId") as string; // From Stripe

    try {
      // Get cart from cookie
      const cartData = JSON.parse(cookies.get("cart") || "[]");

      // Calculate total
      const total = cartData.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      );

      // Create order in database
      const orderResult = await db.execute({
        sql: "INSERT INTO orders (customer_email, total, status) VALUES (?, ?, 'pending')",
        args: [email, total],
      });
      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      for (const item of cartData) {
        await db.execute({
          sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          args: [orderId, item.productId, item.quantity, item.price],
        });
      }

      // Process payment with Stripe
      const payment = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (payment.status !== "succeeded") {
        throw new Error("Payment not completed");
      }

      // Update order status
      await db.execute({
        sql: "UPDATE orders SET stripe_payment_id = ?, status = 'paid' WHERE id = ?",
        args: [payment.id, orderId],
      });

      // Clear cart
      cookies.delete("cart", { path: "/" });

      // Redirect to success page
      throw redirect(303, `/order/${orderId}/success`);
    } catch (error) {
      console.error("Checkout error:", error);
      return fail(500, { error: "Payment failed. Please try again." });
    }
  },
};
```

## Admin Panel Implementation

```html
<!-- public/admin.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Admin - Little Bitta</title>
    <script type="module" src="/admin.js"></script>
  </head>
  <body x-data="adminPanel()">
    <!-- Login Form -->
    <div x-show="!authenticated">
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
        <input x-model="form.name" placeholder="Name" required />
        <textarea
          x-model="form.description"
          placeholder="Description"
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
          placeholder="Stock"
          required
        />
        <input x-model="form.image_url" placeholder="Image URL" />
        <button type="submit">Save</button>
      </form>

      <button @click="logout">Logout</button>
    </div>

    <script>
      function adminPanel() {
        return {
          authenticated: !!localStorage.getItem("adminToken"),
          credentials: { username: "", password: "" },
          products: [],
          form: {},

          async init() {
            if (this.authenticated) {
              await this.loadProducts();
            }
          },

          async login() {
            const res = await fetch("/.netlify/functions/admin-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(this.credentials),
            });

            if (res.ok) {
              const { token } = await res.json();
              localStorage.setItem("adminToken", token);
              this.authenticated = true;
              await this.loadProducts();
            } else {
              alert("Login failed");
            }
          },

          logout() {
            localStorage.removeItem("adminToken");
            this.authenticated = false;
          },

          async loadProducts() {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/.netlify/functions/admin-products", {
              headers: { Authorization: `Bearer ${token}` },
            });
            this.products = await res.json();
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
          },

          async deleteProduct(id) {
            if (confirm("Delete this product?")) {
              const token = localStorage.getItem("adminToken");
              await fetch(`/.netlify/functions/admin-products?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              await this.loadProducts();
            }
          },
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
  command = "bun run build"
  publish = "build"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

# SvelteKit adapter handles routing
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
    # Enable streaming for SSR
    X-Accel-Buffering = "no"

[[headers]]
  for = "/build/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

## SvelteKit Configuration

```js
// svelte.config.js
import adapter from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      edge: false, // Use standard Netlify Functions
      split: false, // Single function for all routes
    }),

    // Enable progressive enhancement
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
      },
    },
  },
};

export default config;
```

## Security Considerations

### 1. Payment Data (Critical)

With Stripe, you **never handle credit card data**. Use Stripe's Custom Checkout:

```html
<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe(publishableKey);
  const elements = stripe.elements();
  const cardElement = elements.create('card');
  cardElement.mount('#card-element');

  // On checkout - create PaymentIntent on server, confirm on client
  const { clientSecret } = await fetch('/api/create-payment-intent', {
    method: 'POST',
    body: JSON.stringify({ items, email })
  }).then(r => r.json());

  const { paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: { card: cardElement }
  });
</script>
```

Never store card numbers. Stripe handles everything.

### 2. Admin Authentication

**Simple approach (launch):**

```ts
// Environment variable: ADMIN_SECRET=your-secret-token
const isAuthenticated =
  req.headers.get("Authorization") === `Bearer ${process.env.ADMIN_SECRET}`;
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
STRIPE_SECRET_KEY=sk_live_...
PUBLIC_STRIPE_KEY=pk_live_...
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
const ip = req.headers.get("x-forwarded-for") || "unknown";
if (!rateLimit(ip, 5, 60000)) {
  return new Response("Too many requests", { status: 429 });
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

| Service     | Free Tier                   | Limit                        | Cost                |
| ----------- | --------------------------- | ---------------------------- | ------------------- |
| **Netlify** | 100GB bandwidth/month       | ~200k page views             | $0                  |
| **Turso**   | 500MB storage, 1B row reads | ~100k orders                 | $0                  |
| **Stripe**  | No monthly fee              | 2.9% + $0.30 per transaction | Pay per transaction |
| **Domain**  | N/A                         | Already own littlebitta.com  | $0                  |
| **Total**   |                             |                              | **$0/mo**           |

**Transaction costs (Stripe):**

- $10 granola bag = $0.59 Stripe fee
- Net revenue: $9.41 per sale
- 100 sales/month = $941 revenue, $59 in fees

### Phase 2: Growing (Low Cost)

**When you exceed free tier (likely 6-12 months out):**

| Service     | Paid Plan                      | Cost         |
| ----------- | ------------------------------ | ------------ |
| **Netlify** | Pro (1TB bandwidth)            | $19/mo       |
| **Turso**   | Scaler (25GB, unlimited reads) | $29/mo       |
| **Stripe**  | Same (per transaction)         | 2.9% + $0.30 |
| **Total**   |                                | **$48/mo**   |

**At this point, you're doing:**

- 1M+ page views/month
- 10k+ orders (= $100k revenue)
- Infrastructure cost: 0.05% of revenue

### Phase 3: Scaling (Optimized)

**When revenue > $10k/month, consider optimizations:**

| Approach                    | Cost     | When                    |
| --------------------------- | -------- | ----------------------- |
| **Stay on Netlify + Turso** | $48/mo   | Easiest, works for most |
| **Move backend to Railway** | $5-20/mo | Want more control       |
| **Move to VPS (Hetzner)**   | $5-10/mo | Traffic is huge         |

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
- [ ] Create Stripe account (test mode for testing)
- [ ] Get Stripe API credentials
- [ ] Set up Netlify site (import from GitHub)
- [ ] Configure environment variables in Netlify
- [ ] Deploy functions
- [ ] Test payment flow in Stripe test mode
- [ ] Switch to Stripe live mode
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
      method: "POST",
      body: JSON.stringify({
        text: `🚨 Database error: ${error.message}`,
      }),
    });
  }

  return Response.json({ error: "Server error" }, { status: 500 });
}
```

## Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Turso Quickstart](https://docs.turso.tech/quickstart)
- [Stripe Payments Docs](https://stripe.com/docs/payments)
- [Svelte Documentation](https://svelte.dev/)
- [Bun Runtime](https://bun.sh/docs)

## Conclusion

This architecture gives you:

- **$0/mo to start** (free tiers)
- **Zero server management** (fully managed)
- **Familiar tools** (already use Netlify)
- **Clear growth path** (scales with revenue)
- **SQLite familiarity** (Turso is compatible)
- **Production-ready security** (SSL, DDoS, PCI via Stripe)

Start building, launch fast, scale when revenue justifies it. Focus on selling granola, not infrastructure.
