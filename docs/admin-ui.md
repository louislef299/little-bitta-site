# Admin Panel Architecture

This document outlines the architecture for a self-built admin panel using SQLite, Bun, and Alpine.js.

## Database Schema

```sql
-- products.sql
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

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, shipped, completed
  square_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price REAL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
```

## Route Structure

```
/                          → Public storefront
/admin                     → Admin login page
/admin/dashboard           → Overview (sales, orders)
/admin/products            → Product list
/admin/products/new        → Add product form
/admin/products/:id/edit   → Edit product form
/admin/orders              → Order management
/api/admin/*               → Admin API endpoints (CRUD)
/api/checkout              → Public checkout endpoint
```

## Server Structure

```ts
// index.ts
import { Database } from "bun:sqlite";

const db = new Database("store.db");

// Simple session-based auth
const sessions = new Map(); // In production, use Redis or DB

Bun.serve({
  routes: {
    "/": publicHomePage,

    "/admin": adminLoginPage,

    "/admin/dashboard": {
      GET: requireAuth(adminDashboard)
    },

    "/admin/products": {
      GET: requireAuth(adminProductList)
    },

    "/api/admin/products": {
      GET: requireAuth(getProducts),
      POST: requireAuth(createProduct)
    },

    "/api/admin/products/:id": {
      PUT: requireAuth(updateProduct),
      DELETE: requireAuth(deleteProduct)
    },

    "/api/products": {
      GET: getPublicProducts // No auth needed
    },

    "/api/checkout": {
      POST: handleCheckout // Integrates with Square
    }
  }
});

function requireAuth(handler) {
  return (req) => {
    const cookie = req.headers.get("cookie");
    // Parse session cookie, check if valid
    if (!isAuthenticated(cookie)) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(req);
  };
}
```

## Admin UI Example

```html
<!-- admin/products.html -->
<html>
<head>
  <script src="//unpkg.com/alpinejs" defer></script>
</head>
<body>
  <div x-data="productManager()">
    <h1>Products</h1>

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
      <input x-model="form.name" placeholder="Product name" required>
      <textarea x-model="form.description" placeholder="Description"></textarea>
      <input x-model="form.price" type="number" step="0.01" placeholder="Price" required>
      <input x-model="form.stock" type="number" placeholder="Stock" required>
      <input x-model="form.image_url" placeholder="Image URL">
      <button type="submit">Save</button>
    </form>
  </div>

  <script>
    function productManager() {
      return {
        products: [],
        form: {},

        async init() {
          await this.loadProducts();
        },

        async loadProducts() {
          const res = await fetch('/api/admin/products');
          this.products = await res.json();
        },

        async saveProduct() {
          const method = this.form.id ? 'PUT' : 'POST';
          const url = this.form.id
            ? `/api/admin/products/${this.form.id}`
            : '/api/admin/products';

          await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
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
            await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            await this.loadProducts();
          }
        }
      };
    }
  </script>
</body>
</html>
```

## Key Components

### Authentication
- Simple username/password stored in env vars to start
- Session cookies for staying logged in
- In production: hash passwords with `Bun.password.hash()`

### File Uploads
- Use `Bun.file()` to save product images
- Or use a service like Cloudinary/S3

## Benefits of This Approach

- Full control over features
- No CMS subscription costs
- Easy to customize for your specific needs
- All data in one SQLite file

## Trade-offs

- You build and maintain the admin UI
- Need to handle auth yourself
- More code to write upfront
