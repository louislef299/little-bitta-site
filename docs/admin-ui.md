# Admin Panel Architecture

This document outlines the admin panel implementation for managing products and
orders using SvelteKit with server-side rendering.

> **See also:** [Cloud Architecture](cloud-arch.md) for complete infrastructure
> setup and [Customer-Facing Site](customer-facing.md) for the public
> storefront.

## Overview

The admin panel provides a web-based interface for managing:
- Products (add, edit, delete, stock management)
- Orders (view, update status, track fulfillment)
- Basic analytics (sales, inventory)

**Technology:**
- **Frontend:** SvelteKit with SSR (server-rendered forms)
- **Backend:** SvelteKit form actions (serverless)
- **Database:** Turso (SQLite-compatible)
- **Authentication:** Session-based auth with cookies

## Design Philosophy

**Admin Panel vs Customer-Facing Site:**

The admin panel is a **private tool** for authorized users, so we can be more
pragmatic about progressive enhancement:

- **Still use server-side rendering** - Fast initial page loads, works without JS
- **Forms still work without JavaScript** - But richer interactions are acceptable
- **Can assume modern browsers** - Admin users likely have up-to-date browsers
- **Enhanced UX is valuable** - Real-time updates, drag-and-drop, etc. improve workflow

**Progressive Enhancement Approach:**
1. **Core functionality via forms** - Add/edit/delete works without JavaScript
2. **Enhanced interactions** - Inline editing, optimistic updates, better UX with JavaScript
3. **Server-side validation** - Never trust client-side validation alone

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

## Route Structure

```
/admin                     → Admin dashboard (requires auth)
/admin/login               → Login page
/admin/products            → Product management
/admin/products/new        → Add new product
/admin/products/[id]/edit  → Edit product
/admin/orders              → Order management
/admin/orders/[id]         → Order details

All routes use SvelteKit:
- Server-side rendering (SSR)
- Form actions for mutations
- Session-based authentication
```

## Backend: SvelteKit Server Routes

### Admin Login with Session Management

```ts
// src/routes/admin/login/+page.server.ts
import { getDb } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';
import * as crypto from 'crypto';

export const actions = {
  login: async ({ request, cookies }) => {
    const db = getDb();
    const data = await request.formData();
    const username = data.get('username') as string;
    const password = data.get('password') as string;

    try {
      // Get admin user from database
      const result = await db.execute({
        sql: "SELECT * FROM admin_users WHERE username = ?",
        args: [username]
      });

      if (result.rows.length === 0) {
        return fail(401, { error: "Invalid credentials" });
      }

      const admin = result.rows[0];

      // Verify password
      const isValid = await Bun.password.verify(
        password,
        admin.password_hash as string
      );

      if (!isValid) {
        return fail(401, { error: "Invalid credentials" });
      }

      // Create session
      const sessionId = crypto.randomUUID();
      cookies.set('session', sessionId, {
        path: '/admin',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      // Store session in database or memory
      await db.execute({
        sql: "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
        args: [sessionId, admin.id, new Date().toISOString()]
      });

      throw redirect(303, '/admin');

    } catch (error) {
      if (error instanceof redirect) throw error;
      console.error("Login error:", error);
      return fail(500, { error: 'Login failed' });
    }
  }
};
```

```svelte
<!-- src/routes/admin/login/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  export let form;
</script>

<div class="login-container">
  <h1>Admin Login</h1>

  <!-- Works without JavaScript via standard form POST -->
  <form method="POST" action="?/login" use:enhance>
    <label>
      Username
      <input type="text" name="username" required>
    </label>

    <label>
      Password
      <input type="password" name="password" required>
    </label>

    <button type="submit">Login</button>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
  </form>
</div>
```

### Admin Product Management

```ts
// src/routes/admin/products/+page.server.ts
import { getDb } from '$lib/server/db';
import { fail, redirect } from '@sveltejs/kit';

// Check authentication
async function requireAuth(cookies) {
  const sessionId = cookies.get('session');
  if (!sessionId) {
    throw redirect(303, '/admin/login');
  }
  // Verify session in database
  return sessionId;
}

export async function load({ cookies }) {
  await requireAuth(cookies);
  const db = getDb();

  const result = await db.execute(
    "SELECT * FROM products ORDER BY created_at DESC"
  );

  return {
    products: result.rows
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
          data.get('name'),
          data.get('description'),
          data.get('price'),
          data.get('image_url'),
          data.get('stock') || 0
        ]
      });

      return { success: true, message: 'Product created' };
    } catch (error) {
      return fail(500, { error: 'Failed to create product' });
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
          data.get('name'),
          data.get('description'),
          data.get('price'),
          data.get('image_url'),
          data.get('stock'),
          data.get('id')
        ]
      });

      return { success: true, message: 'Product updated' };
    } catch (error) {
      return fail(500, { error: 'Failed to update product' });
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
        args: [data.get('id')]
      });

      return { success: true, message: 'Product deleted' };
    } catch (error) {
      return fail(500, { error: 'Failed to delete product' });
    }
  }
};
```

### Admin Orders Function

```ts
// netlify/functions/admin-orders.ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!
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
        args: [status, orderId]
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Panel - Little Bitta</title>
  <script type="module" src="/admin.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    input, textarea { width: 100%; padding: 8px; margin: 5px 0; box-sizing: border-box; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    .login-form { max-width: 400px; margin: 100px auto; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; cursor: pointer; background: #f5f5f5; border-radius: 5px; }
    .tab.active { background: #007bff; color: white; }
  </style>
</head>
<body x-data="adminPanel()" x-init="init()">

  <!-- Login Form -->
  <div x-show="!authenticated" class="login-form">
    <h1>Admin Login</h1>
    <form @submit.prevent="login">
      <input x-model="credentials.username" placeholder="Username" required>
      <input x-model="credentials.password" type="password" placeholder="Password" required>
      <button type="submit">Login</button>
      <p x-show="loginError" style="color: red;" x-text="loginError"></p>
    </form>
  </div>

  <!-- Admin Dashboard -->
  <div x-show="authenticated">
    <header style="display: flex; justify-content: space-between; align-items: center;">
      <h1>Little Bitta Admin</h1>
      <div>
        <span x-text="username"></span> |
        <button @click="logout">Logout</button>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <div class="tab" :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">
        Products
      </div>
      <div class="tab" :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'; loadOrders()">
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
        <input x-model="form.name" placeholder="Product name" required>
        <textarea x-model="form.description" placeholder="Description" rows="3"></textarea>
        <input x-model="form.price" type="number" step="0.01" placeholder="Price" required>
        <input x-model="form.stock" type="number" placeholder="Stock quantity" required>
        <input x-model="form.image_url" placeholder="Image URL">
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
              <td x-text="new Date(order.created_at).toLocaleDateString()"></td>
              <td>
                <select @change="updateOrderStatus(order.id, $event.target.value)">
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
        authenticated: !!localStorage.getItem('adminToken'),
        username: localStorage.getItem('adminUsername') || '',
        credentials: { username: '', password: '' },
        loginError: '',
        activeTab: 'products',
        products: [],
        orders: [],
        form: {},

        async init() {
          if (this.authenticated) {
            await this.loadProducts();
          }
        },

        async login() {
          this.loginError = '';
          try {
            const res = await fetch('/.netlify/functions/admin-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.credentials)
            });

            if (res.ok) {
              const { token, username } = await res.json();
              localStorage.setItem('adminToken', token);
              localStorage.setItem('adminUsername', username);
              this.authenticated = true;
              this.username = username;
              await this.loadProducts();
            } else {
              const error = await res.json();
              this.loginError = error.error || 'Login failed';
            }
          } catch (error) {
            this.loginError = 'Network error. Please try again.';
          }
        },

        logout() {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
          this.authenticated = false;
          this.username = '';
          this.products = [];
          this.orders = [];
        },

        async loadProducts() {
          const token = localStorage.getItem('adminToken');
          const res = await fetch('/.netlify/functions/admin-products', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          this.products = await res.json();
        },

        async loadOrders() {
          const token = localStorage.getItem('adminToken');
          const res = await fetch('/.netlify/functions/admin-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          this.orders = await res.json();
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
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        },

        async deleteProduct(id) {
          if (confirm('Delete this product? It will be hidden from customers.')) {
            const token = localStorage.getItem('adminToken');
            await fetch(`/.netlify/functions/admin-products?id=${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            await this.loadProducts();
          }
        },

        async updateOrderStatus(orderId, status) {
          if (!status) return;

          const token = localStorage.getItem('adminToken');
          await fetch('/.netlify/functions/admin-orders', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, status })
          });

          await this.loadOrders();
        }
      };
    }
  </script>
</body>
</html>
```

## Authentication Strategy

### Session-Based Authentication (Recommended)

**Why sessions over tokens:**
- More secure (httpOnly cookies can't be accessed by JavaScript)
- Automatic CSRF protection with SvelteKit
- Easy to revoke (delete from database)
- Works without JavaScript

**Implementation:**
```ts
// src/hooks.server.ts
import { getDb } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
  // Check if route requires authentication
  if (event.url.pathname.startsWith('/admin') &&
      event.url.pathname !== '/admin/login') {

    const sessionId = event.cookies.get('session');

    if (!sessionId) {
      throw redirect(303, '/admin/login');
    }

    // Verify session
    const db = getDb();
    const result = await db.execute({
      sql: "SELECT * FROM sessions WHERE id = ? AND expires_at > ?",
      args: [sessionId, new Date().toISOString()]
    });

    if (result.rows.length === 0) {
      event.cookies.delete('session', { path: '/' });
      throw redirect(303, '/admin/login');
    }

    // Attach user to event.locals
    event.locals.user = result.rows[0];
  }

  return resolve(event);
}
```

**Session Management:**
- Sessions stored in database
- Automatic expiration
- Logout deletes session
- Works with or without JavaScript

## File Uploads (Product Images)

**Option 1: Use Cloudinary (Recommended)**
```ts
// Upload to Cloudinary, get URL
const imageUrl = await uploadToCloudinary(imageFile);
// Store URL in database
```

**Option 2: Netlify Large Media**
Store images in git with Large Media support.

**Option 3: Cloudflare R2 / AWS S3**
Use object storage for images.

## Security Checklist

- [ ] Use HTTPS only (automatic with Netlify)
- [ ] Strong admin password (hashed with bcrypt)
- [ ] Rate limit login attempts
- [ ] IP whitelist for admin panel (optional)
- [ ] Validate all inputs server-side
- [ ] Use environment variables for secrets
- [ ] Enable 2FA for Netlify account
- [ ] Regular security audits

## Key Features

### Product Management
- Add/edit/delete products
- Update stock levels
- Upload product images
- Mark products active/inactive

### Order Management
- View all orders
- Update order status
- Filter by status/date
- Export orders (future)

### Future Enhancements
- Analytics dashboard (revenue, popular products)
- Inventory alerts (low stock warnings)
- Batch operations (bulk price updates)
- Customer management
- Email templates for receipts

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Complete infrastructure setup and deployment
- [Customer-Facing Site](customer-facing.md) - How customers interact with products you manage here
