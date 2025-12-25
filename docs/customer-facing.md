# Customer-Facing Site Architecture

This document outlines the customer-facing storefront implementation using static HTML, Alpine.js, Netlify Functions, and Turso.

> **See also:** [Cloud Architecture](cloud-arch.md) for complete infrastructure and [Admin Panel](admin-ui.md) for product management.

## Overview

The customer-facing site is a fast, SEO-friendly storefront with client-side interactivity for shopping cart and checkout.

**Technology:**
- **Frontend:** Static HTML/CSS with Svelte
- **Backend:** Netlify Functions (serverless API)
- **Database:** Turso (SQLite-compatible)
- **Payments:** Square Web Payments SDK
- **Hosting:** Netlify (CDN, SSL, DDoS included)

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│       Netlify Edge Network (CDN)            │
│  Automatic SSL, DDoS Protection, Caching    │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┴────────────┐
    │                        │
    ▼                        ▼
┌──────────┐          ┌─────────────┐
│  Static  │          │   Netlify   │
│   HTML   │          │  Functions  │
│   CSS    │          │   (API)     │
│  Svelte  │          └──────┬──────┘
└──────────┘                 │
                 ┌───────────┼──────────┐
                 │           │          │
                 ▼           ▼          ▼
            ┌────────┐  ┌───────┐  ┌────────┐
            │ Turso  │  │Square │  │ Email  │
            │  (DB)  │  │  API  │  │Service │
            └────────┘  └───────┘  └────────┘
```

## Rendering Strategy

**Static HTML + Client-Side Hydration:**

```
Initial Page Load:
  → Static HTML served from Netlify CDN (fast, SEO-friendly)
  → Products rendered server-side or fetched via API

Svelte Loads:
  → Adds interactivity (cart, filters, animations)
  → No page refreshes needed

Checkout Flow:
  → Square Web Payment SDK (PCI-compliant)
  → POST to Netlify Function → Turso + Square API
```

## Frontend Implementation

### Homepage (Static HTML)

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Little Bitta Granola - Artisan Granola from Minnesota</title>
  <meta name="description" content="Premium handcrafted granola made with organic ingredients. Four unique flavors available.">

  <!-- SEO -->
  <meta property="og:title" content="Little Bitta Granola">
  <meta property="og:description" content="Premium handcrafted granola">
  <meta property="og:image" content="https://littlebitta.com/images/og-image.jpg">

  <!-- Svelte -->
  <script type="module" src="/storefront.js"></script>

  <!-- Styles -->
  <link rel="stylesheet" href="/styles.css">
</head>
<body x-data="storefront()" x-init="init()">

  <!-- Header -->
  <header>
    <div class="container">
      <h1>Little Bitta Granola</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about.html">About</a>
        <button @click="showCart = !showCart" class="cart-button">
          Cart (<span x-text="cart.length">0</span>)
        </button>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <h2>Artisan Granola Made in Minnesota</h2>
      <p>Small-batch, handcrafted granola with organic ingredients</p>
    </div>
  </section>

  <!-- Products Section -->
  <section class="products">
    <div class="container">
      <h2>Our Granola</h2>

      <!-- Loading State -->
      <div x-show="loading">Loading products...</div>

      <!-- Products Grid -->
      <div class="product-grid" x-show="!loading">
        <template x-for="product in products" :key="product.id">
          <article class="product-card" itemscope itemtype="http://schema.org/Product">
            <img :src="product.image_url" :alt="product.name" itemprop="image">

            <h3 itemprop="name" x-text="product.name"></h3>
            <p class="description" itemprop="description" x-text="product.description"></p>

            <div class="product-footer" itemprop="offers" itemscope itemtype="http://schema.org/Offer">
              <meta itemprop="priceCurrency" content="USD">
              <span class="price" itemprop="price" :content="product.price">
                $<span x-text="product.price"></span>
              </span>

              <template x-if="product.stock > 0">
                <div>
                  <link itemprop="availability" href="http://schema.org/InStock">
                  <button
                    @click="addToCart(product)"
                    class="add-to-cart"
                  >
                    Add to Cart
                  </button>
                </div>
              </template>

              <template x-if="product.stock === 0">
                <div>
                  <link itemprop="availability" href="http://schema.org/OutOfStock">
                  <span class="out-of-stock">Out of Stock</span>
                </div>
              </template>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>

  <!-- Shopping Cart Sidebar -->
  <aside class="cart-sidebar" :class="{ 'open': showCart }" x-show="showCart" @click.away="showCart = false">
    <div class="cart-header">
      <h3>Shopping Cart</h3>
      <button @click="showCart = false" class="close-btn">&times;</button>
    </div>

    <div class="cart-content">
      <template x-if="cart.length === 0">
        <p class="empty-cart">Your cart is empty</p>
      </template>

      <template x-if="cart.length > 0">
        <div>
          <ul class="cart-items">
            <template x-for="(item, index) in cart" :key="index">
              <li class="cart-item">
                <div class="item-details">
                  <span class="item-name" x-text="item.name"></span>
                  <span class="item-price">$<span x-text="item.price"></span></span>
                </div>
                <button @click="removeFromCart(index)" class="remove-btn">Remove</button>
              </li>
            </template>
          </ul>

          <div class="cart-footer">
            <div class="cart-total">
              <strong>Total:</strong>
              <strong>$<span x-text="cartTotal.toFixed(2)"></span></strong>
            </div>
            <button @click="checkout()" class="checkout-btn">Proceed to Checkout</button>
          </div>
        </div>
      </template>
    </div>
  </aside>

  <!-- Footer -->
  <footer>
    <div class="container">
      <p>&copy; 2025 Little Bitta Granola. Made in Minnesota.</p>
    </div>
  </footer>

  <script>
    function storefront() {
      return {
        products: [],
        cart: JSON.parse(localStorage.getItem('cart') || '[]'),
        showCart: false,
        loading: true,

        async init() {
          await this.loadProducts();
        },

        async loadProducts() {
          try {
            const res = await fetch('/.netlify/functions/products');
            this.products = await res.json();
          } catch (error) {
            console.error('Failed to load products:', error);
          } finally {
            this.loading = false;
          }
        },

        get cartTotal() {
          return this.cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        },

        addToCart(product) {
          this.cart.push({
            id: product.id,
            name: product.name,
            price: product.price
          });
          this.saveCart();
          this.showCart = true;
        },

        removeFromCart(index) {
          this.cart.splice(index, 1);
          this.saveCart();
        },

        saveCart() {
          localStorage.setItem('cart', JSON.stringify(this.cart));
        },

        async checkout() {
          // Redirect to checkout page with cart data
          window.location.href = `/checkout.html?items=${encodeURIComponent(JSON.stringify(this.cart))}`;
        }
      };
    }
  </script>
</body>
</html>
```

### Checkout Page with Square

```html
<!-- public/checkout.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout - Little Bitta Granola</title>
  <script type="module" src="/checkout.js"></script>
  <script src="https://web.squarecdn.com/v1/square.js"></script>
  <link rel="stylesheet" href="/styles.css">
</head>
<body x-data="checkoutPage()" x-init="init()">
  <div class="container">
    <h1>Checkout</h1>

    <!-- Order Summary -->
    <div class="order-summary">
      <h2>Order Summary</h2>
      <ul>
        <template x-for="item in items">
          <li>
            <span x-text="item.name"></span>
            <span>$<span x-text="item.price"></span></span>
          </li>
        </template>
      </ul>
      <div class="total">
        <strong>Total:</strong>
        <strong>$<span x-text="total.toFixed(2)"></span></strong>
      </div>
    </div>

    <!-- Customer Info -->
    <form @submit.prevent="processPayment">
      <h2>Contact Information</h2>
      <input x-model="email" type="email" placeholder="Email" required>

      <h2>Payment</h2>
      <div id="card-container"></div>

      <button type="submit" :disabled="processing">
        <span x-show="!processing">Pay $<span x-text="total.toFixed(2)"></span></span>
        <span x-show="processing">Processing...</span>
      </button>

      <p x-show="error" style="color: red;" x-text="error"></p>
    </form>
  </div>

  <script>
    function checkoutPage() {
      return {
        items: [],
        email: '',
        total: 0,
        processing: false,
        error: '',
        card: null,

        async init() {
          // Get cart from URL params
          const params = new URLSearchParams(window.location.search);
          this.items = JSON.parse(decodeURIComponent(params.get('items') || '[]'));
          this.total = this.items.reduce((sum, item) => sum + parseFloat(item.price), 0);

          // Initialize Square
          await this.initializeSquare();
        },

        async initializeSquare() {
          const payments = Square.payments(
            'YOUR_SQUARE_APP_ID',
            'YOUR_SQUARE_LOCATION_ID'
          );

          this.card = await payments.card();
          await this.card.attach('#card-container');
        },

        async processPayment() {
          if (!this.email) {
            this.error = 'Please enter your email';
            return;
          }

          this.processing = true;
          this.error = '';

          try {
            // Tokenize card
            const result = await this.card.tokenize();
            if (result.status === 'OK') {
              // Send to backend
              const response = await fetch('/.netlify/functions/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sourceId: result.token,
                  items: this.items.map(item => ({
                    productId: item.id,
                    quantity: 1,
                    price: item.price
                  })),
                  email: this.email
                })
              });

              const data = await response.json();

              if (data.success) {
                // Clear cart
                localStorage.removeItem('cart');
                // Redirect to success page
                window.location.href = `/success.html?order=${data.orderId}`;
              } else {
                this.error = data.error || 'Payment failed';
              }
            } else {
              this.error = 'Card tokenization failed';
            }
          } catch (error) {
            console.error('Payment error:', error);
            this.error = 'Payment failed. Please try again.';
          } finally {
            this.processing = false;
          }
        }
      };
    }
  </script>
</body>
</html>
```

## Backend: Netlify Functions

### Products API

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
      "SELECT id, name, description, price, image_url, stock FROM products WHERE active = 1"
    );

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60" // Cache for 1 minute
      }
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return new Response(JSON.stringify({ error: "Failed to load products" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
```

### Checkout API

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
  environment: Environment.Production
});

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { sourceId, items, email } = await req.json();

    // Calculate total
    const total = items.reduce((sum: number, item: any) =>
      sum + (parseFloat(item.price) * item.quantity), 0
    );

    // Create order in database
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

## Data Flow

```
1. Customer visits homepage
   ↓
2. Browser loads static HTML from Netlify CDN (fast!)
   ↓
3. Alpine.js fetches products from /.netlify/functions/products
   ↓
4. Products displayed (from Turso database)
   ↓
5. Customer adds items to cart (Alpine.js + localStorage)
   ↓
6. Customer clicks checkout → /checkout.html
   ↓
7. Square Web SDK collects payment info (PCI-compliant)
   ↓
8. Square tokenizes card → sourceId
   ↓
9. POST to /.netlify/functions/checkout with sourceId + items
   ↓
10. Netlify Function:
    - Creates order in Turso
    - Processes payment with Square API
    - Updates order status
   ↓
11. Redirect to success page
```

## SEO Optimization

### Meta Tags
```html
<title>Little Bitta Granola - Artisan Granola from Minnesota</title>
<meta name="description" content="Premium handcrafted granola...">
<meta property="og:title" content="Little Bitta Granola">
<meta property="og:image" content="/images/og-image.jpg">
```

### Schema.org Markup
```html
<article itemscope itemtype="http://schema.org/Product">
  <h3 itemprop="name">Peanut Butter Nutella</h3>
  <p itemprop="description">Rich and creamy...</p>
  <div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
    <meta itemprop="priceCurrency" content="USD">
    <span itemprop="price" content="10.00">$10.00</span>
    <link itemprop="availability" href="http://schema.org/InStock">
  </div>
</article>
```

### Performance
- Static HTML served from CDN (fast first load)
- Minimal JavaScript (Svelte compiles to efficient vanilla JS)
- Image optimization (use Cloudinary or imgix)
- HTTP/2 and modern compression (automatic with Netlify)

## Key Features

### Shopping Experience
- Fast page loads (static HTML + CDN)
- Interactive cart (no page refreshes)
- Persistent cart (localStorage)
- Mobile-responsive design

### Payment Processing
- PCI-compliant (Square handles card data)
- Multiple payment methods via Square
- Secure checkout flow
- Email receipts (via Square)

### SEO & Discoverability
- Server-side rendered product data
- Schema.org markup
- Social media preview tags
- Fast Core Web Vitals

## Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1s | Static HTML from CDN |
| Time to Interactive | < 2s | Minimal JavaScript (Alpine.js) |
| Lighthouse Score | > 90 | Optimized images, modern code |
| SEO Score | 100 | Semantic HTML, meta tags, schema |

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Infrastructure, deployment, and scaling
- [Admin Panel](admin-ui.md) - How to manage products shown on this site
