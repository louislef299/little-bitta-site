# Customer-Facing Site Architecture

This document outlines the hybrid server-rendered + client-side interactive architecture for the Little Bitta Granola storefront.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Bun Server (index.ts)           │
├─────────────────────────────────────────┤
│                                         │
│  Customer Routes                        │
│  /              → index.html            │
│  /products/:id  → product.html          │
│  /cart          → cart.html             │
│                                         │
│  Admin Routes (authenticated)           │
│  /admin/*       → admin pages           │
│                                         │
│  Public API (for customer site)         │
│  GET /api/products                      │
│  GET /api/products/:id                  │
│  POST /api/checkout                     │
│                                         │
│  Admin API (authenticated)              │
│  POST /api/admin/products               │
│  PUT /api/admin/products/:id            │
│  DELETE /api/admin/products/:id         │
│                                         │
└─────────────────────────────────────────┘
              │
              ▼
        ┌───────────┐
        │  SQLite   │
        │  Database │
        └───────────┘
```

## Hybrid Rendering Strategy

```
Initial Page Load: Server-rendered HTML (SEO-friendly)
        ↓
Alpine.js loads and adds interactivity
        ↓
Cart, filters, search: Client-side Alpine.js
        ↓
Checkout: POST to /api/checkout → Square
```

### Why Hybrid?

**Server-rendered initial HTML:**
- Google/search engines see full product listings
- Fast initial page load
- Works without JavaScript

**Alpine.js for interactivity:**
- Shopping cart management
- Real-time filtering/search
- Add-to-cart animations
- No page refreshes needed

## Server Implementation

```ts
// index.ts
import { Database } from "bun:sqlite";
const db = new Database("store.db");

Bun.serve({
  routes: {
    "/": {
      GET: (req) => {
        // Fetch products from database
        const products = db.query("SELECT * FROM products WHERE active = 1").all();

        // Server-render HTML with products
        return new Response(renderStorefront(products), {
          headers: { "Content-Type": "text/html" }
        });
      }
    },

    "/products/:id": {
      GET: (req) => {
        const product = db.query("SELECT * FROM products WHERE id = ?")
          .get(req.params.id);

        return new Response(renderProductPage(product), {
          headers: { "Content-Type": "text/html" }
        });
      }
    },

    // Public API endpoints
    "/api/products": {
      GET: (req) => {
        const products = db.query("SELECT * FROM products WHERE active = 1").all();
        return Response.json(products);
      }
    },

    "/api/products/:id": {
      GET: (req) => {
        const product = db.query("SELECT * FROM products WHERE id = ?")
          .get(req.params.id);
        return Response.json(product);
      }
    },

    "/api/checkout": {
      POST: async (req) => {
        const { items, email } = await req.json();

        // Create order in database
        const total = calculateTotal(items);
        const orderId = db.query(
          "INSERT INTO orders (customer_email, total, status) VALUES (?, ?, 'pending')"
        ).run(email, total).lastInsertRowid;

        // Insert order items
        items.forEach(item => {
          db.query(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
          ).run(orderId, item.productId, item.quantity, item.price);
        });

        // Process payment with Square
        const squarePayment = await processSquarePayment(total, email);

        // Update order with Square payment ID
        db.query("UPDATE orders SET square_payment_id = ?, status = 'paid' WHERE id = ?")
          .run(squarePayment.id, orderId);

        return Response.json({
          success: true,
          orderId,
          paymentId: squarePayment.id
        });
      }
    }
  },

  development: {
    hmr: true,
    console: true
  }
});

function renderStorefront(products) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Little Bitta Granola - Artisan Granola</title>
      <meta name="description" content="Premium handcrafted granola made with organic ingredients">
      <script src="//unpkg.com/alpinejs" defer></script>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <div x-data="store()">
        <header>
          <h1>Little Bitta Granola</h1>
          <nav>
            <a href="/">Home</a>
            <button @click="showCart = !showCart">
              Cart (<span x-text="cart.length">0</span>)
            </button>
          </nav>
        </header>

        <main>
          <!-- Products are server-rendered for SEO -->
          <div class="products">
            ${products.map(p => `
              <article class="product" itemscope itemtype="http://schema.org/Product">
                <img src="${p.image_url}" alt="${p.name}" itemprop="image">
                <h2 itemprop="name">${p.name}</h2>
                <p itemprop="description">${p.description}</p>
                <div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
                  <meta itemprop="priceCurrency" content="USD">
                  <span itemprop="price" content="${p.price}">$${p.price}</span>
                  ${p.stock > 0
                    ? `<link itemprop="availability" href="http://schema.org/InStock">
                       <button @click="addToCart(${p.id}, '${p.name}', ${p.price})">
                         Add to Cart
                       </button>`
                    : `<link itemprop="availability" href="http://schema.org/OutOfStock">
                       <span>Out of Stock</span>`
                  }
                </div>
              </article>
            `).join('')}
          </div>

          <!-- Cart is client-side interactive -->
          <aside x-show="showCart" class="cart-sidebar">
            <h3>Shopping Cart</h3>
            <template x-if="cart.length === 0">
              <p>Your cart is empty</p>
            </template>

            <template x-if="cart.length > 0">
              <div>
                <ul>
                  <template x-for="item in cart" :key="item.id">
                    <li>
                      <span x-text="item.name"></span> -
                      <span x-text="'$' + item.price"></span>
                      <button @click="removeFromCart(item.id)">Remove</button>
                    </li>
                  </template>
                </ul>

                <p>Total: $<span x-text="cartTotal"></span></p>
                <button @click="checkout()">Checkout</button>
              </div>
            </template>
          </aside>
        </main>
      </div>

      <script>
        function store() {
          return {
            cart: JSON.parse(localStorage.getItem('cart') || '[]'),
            showCart: false,

            get cartTotal() {
              return this.cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
            },

            addToCart(id, name, price) {
              this.cart.push({ id, name, price });
              this.saveCart();
            },

            removeFromCart(id) {
              const index = this.cart.findIndex(item => item.id === id);
              if (index > -1) {
                this.cart.splice(index, 1);
                this.saveCart();
              }
            },

            saveCart() {
              localStorage.setItem('cart', JSON.stringify(this.cart));
            },

            async checkout() {
              const email = prompt('Enter your email:');
              if (!email) return;

              const items = this.cart.map(item => ({
                productId: item.id,
                quantity: 1,
                price: item.price
              }));

              const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, email })
              });

              const result = await response.json();

              if (result.success) {
                alert('Order placed successfully!');
                this.cart = [];
                this.saveCart();
                this.showCart = false;
              } else {
                alert('Checkout failed. Please try again.');
              }
            }
          };
        }
      </script>
    </body>
    </html>
  `;
}

function renderProductPage(product) {
  // Similar structure but for individual product detail page
  return `<!DOCTYPE html>...`;
}
```

## How Customer Site Connects to Admin

**Flow:**

1. **Admin adds product** via `/admin/products`:
   - POST to `/api/admin/products` (authenticated)
   - Data inserted into `products` table in SQLite

2. **Customer visits homepage**:
   - Server queries `products` table
   - Renders HTML with products embedded
   - HTML is SEO-friendly (Google sees it)

3. **Customer browses**:
   - Alpine.js provides interactive cart
   - No page reloads needed for cart operations
   - Cart state stored in localStorage

4. **Customer checks out**:
   - POST to `/api/checkout` (public endpoint)
   - Creates order in database
   - Processes payment via Square API
   - Updates order status

## Key Features

### SEO Optimization
- Server-rendered product listings
- Semantic HTML with schema.org markup
- Meta tags for social sharing
- Fast initial page load

### Client-Side Interactivity
- Shopping cart (Alpine.js + localStorage)
- Real-time cart updates
- No page refreshes
- Smooth user experience

### Payment Integration
- Square for payment processing
- Order tracking in SQLite
- Email receipts (via Square)
- Inventory updates on purchase

## Data Flow

```
┌──────────┐
│  Admin   │
│  Panel   │
└────┬─────┘
     │ POST /api/admin/products
     ▼
┌──────────┐
│ SQLite   │
│ Database │
└────┬─────┘
     │ SELECT * FROM products
     ▼
┌──────────┐     Alpine.js      ┌──────────┐
│ Customer │  ◄─────────────────►│  Cart    │
│   HTML   │   (interactivity)  │  State   │
└────┬─────┘                     └────┬─────┘
     │                                │
     │ POST /api/checkout             │
     ▼                                │
┌──────────┐                          │
│  Square  │ ◄────────────────────────┘
│ Payment  │
└──────────┘
```

## Benefits of This Architecture

1. **SEO**: Search engines can index products
2. **Performance**: Fast initial load (server-rendered)
3. **UX**: Smooth interactions (Alpine.js)
4. **Simplicity**: No build step, no complex framework
5. **Control**: Single database, easy to manage
6. **Cost**: No CMS fees, just hosting

## Trade-offs

1. More server logic needed for rendering
2. HTML generation in JavaScript (could use a template engine)
3. Manual cache management if traffic grows
4. No automatic image optimization (handle separately)
