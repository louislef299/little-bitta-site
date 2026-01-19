# Customer-Facing Site Architecture

This document outlines the customer-facing storefront implementation using SvelteKit with progressive enhancement, following Resilient Web Design principles.

> **See also:** [Cloud Architecture](cloud-arch.md) for complete infrastructure and [Admin Panel](admin-ui.md) for product management.

## Overview

The customer-facing site follows the **three-layer enhancement model**:

1. **Layer 1 (HTML)** - Semantic markup, server-rendered, works everywhere
2. **Layer 2 (CSS)** - Visual presentation, responsive design
3. **Layer 3 (JavaScript)** - Interactivity, animations, optimistic UI

**Core Principle:** Everyone is a non-JavaScript user until the JavaScript finishes loading. This site works without JavaScript and gets better with it.

**Technology:**

- **Frontend:** SvelteKit with SSR/SSG (server-rendered HTML)
- **Backend:** SvelteKit form actions + endpoints (serverless)
- **Database:** Turso (SQLite-compatible)
- **Payments:** Square Web Payments SDK
- **Hosting:** Netlify (CDN, SSL, edge functions)

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

**Server-Side Rendering with Progressive Enhancement:**

```
Initial Request (Server):
  → SvelteKit renders full HTML with products
  → Semantic markup, accessible content
  → Works without JavaScript

Browser Receives HTML:
  → User sees content immediately (no loading spinner)
  → Forms work via standard POST
  → Links navigate via standard HTTP

JavaScript Loads (Enhancement):
  → SvelteKit hydrates interactive components
  → Forms enhanced with optimistic UI
  → Smooth transitions and animations
  → Client-side validation

Checkout Flow:
  → Works without JS via form submission
  → Enhanced with Square Web Payment SDK
  → Server processes payment via SvelteKit action
```

## Progressive Enhancement Benefits

**Without JavaScript:**

- View all products
- Read descriptions and prices
- Add items to cart (via form POST)
- Navigate between pages
- Complete checkout
- View order confirmation

**With JavaScript:**

- Smooth page transitions
- Optimistic UI updates
- Client-side form validation
- Real-time cart preview
- Animated interactions
- Better error messages

## Frontend Implementation

### Homepage with Server-Side Rendering

```ts
// src/routes/+page.server.ts
import { getDb } from "$lib/db";

export async function load() {
  const db = getDb();

  try {
    const result = await db.execute(
      `SELECT id, name, description, price, image_url, stock
       FROM products
       WHERE active = 1
       ORDER BY created_at DESC`,
    );

    // This data is rendered as HTML on the server
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

<svelte:head>
  <title>Little Bitta Granola - Artisan Granola from Minnesota</title>
  <meta name="description" content="Premium handcrafted granola made with organic ingredients. Four unique flavors available.">
  <meta property="og:title" content="Little Bitta Granola">
  <meta property="og:description" content="Premium handcrafted granola">
  <meta property="og:image" content="https://littlebitta.com/images/og-image.jpg">
</svelte:head>

<!-- Header -->
<header>
  <div class="container">
    <h1>Little Bitta Granola</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/cart">Cart</a>
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
<!-- This HTML is rendered on the server, visible immediately -->
<section class="products">
  <div class="container">
    <h2>Our Granola</h2>

    {#if data.error}
      <p class="error">{data.error}</p>
    {/if}

    <!-- Products Grid: rendered as HTML, no loading spinner needed -->
    <div class="product-grid">
      {#each data.products as product}
        <article class="product-card" itemscope itemtype="http://schema.org/Product">
          <img src={product.image_url} alt={product.name} itemprop="image">

          <h3 itemprop="name">{product.name}</h3>
          <p class="description" itemprop="description">{product.description}</p>

          <div class="product-footer" itemprop="offers" itemscope itemtype="http://schema.org/Offer">
            <meta itemprop="priceCurrency" content="USD">
            <span class="price" itemprop="price" content={product.price}>
              ${product.price}
            </span>

            {#if product.stock > 0}
              <link itemprop="availability" href="http://schema.org/InStock">
              <!-- Works without JavaScript: standard form POST -->
              <form method="POST" action="/cart?/add">
                <input type="hidden" name="productId" value={product.id}>
                <input type="hidden" name="name" value={product.name}>
                <input type="hidden" name="price" value={product.price}>
                <button type="submit" class="add-to-cart">
                  Add to Cart
                </button>
              </form>
            {:else}
              <link itemprop="availability" href="http://schema.org/OutOfStock">
              <span class="out-of-stock">Out of Stock</span>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- Footer -->
<footer>
  <div class="container">
    <p>&copy; 2025 Little Bitta Granola. Made in Minnesota.</p>
  </div>
</footer>

<style>
  /* CSS provides visual presentation layer */
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .product-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    transition: transform 0.2s;
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  /* Mobile-first responsive design */
  @media (max-width: 640px) {
    .product-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### Cart Page with Progressive Enhancement

```ts
// src/routes/cart/+page.server.ts
import { getDb } from "$lib/db";

export const actions = {
  // Add to cart (works without JavaScript)
  add: async ({ request, cookies }) => {
    const data = await request.formData();
    const productId = data.get("productId");
    const name = data.get("name");
    const price = data.get("price");

    const cart = JSON.parse(cookies.get("cart") || "[]");
    cart.push({ productId, name, price, quantity: 1 });
    cookies.set("cart", JSON.stringify(cart), { path: "/" });

    return { success: true, message: "Added to cart!" };
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
  const cart = JSON.parse(cookies.get("cart") || "[]");
  const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

  return { cart, total };
}
```

```svelte
<!-- src/routes/cart/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  export let data;
  export let form;
</script>

<div class="container">
  <h1>Shopping Cart</h1>

  {#if data.cart.length === 0}
    <p>Your cart is empty. <a href="/">Continue shopping</a></p>
  {:else}
    <!-- Server-rendered cart items -->
    <ul class="cart-items">
      {#each data.cart as item, i}
        <li class="cart-item">
          <div class="item-details">
            <span class="item-name">{item.name}</span>
            <span class="item-price">${item.price}</span>
          </div>

          <!-- Form works without JavaScript -->
          <form method="POST" action="?/remove" use:enhance>
            <input type="hidden" name="index" value={i}>
            <button type="submit" class="remove-btn">Remove</button>
          </form>
        </li>
      {/each}
    </ul>

    <div class="cart-total">
      <strong>Total:</strong>
      <strong>${data.total.toFixed(2)}</strong>
    </div>

    <!-- Standard link, no JavaScript required -->
    <a href="/checkout" class="checkout-btn">Proceed to Checkout</a>
  {/if}

  {#if form?.success}
    <p class="success">{form.message}</p>
  {/if}
</div>
```

### Checkout Page with Progressive Enhancement

```ts
// src/routes/checkout/+page.server.ts
import { getDb } from "$lib/db";
import { getSquareClient } from "$lib/square";
import { fail, redirect } from "@sveltejs/kit";

export async function load({ cookies }) {
  const cart = JSON.parse(cookies.get("cart") || "[]");

  if (cart.length === 0) {
    throw redirect(303, "/cart");
  }

  const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

  return {
    cart,
    total,
    squareAppId: process.env.SQUARE_APP_ID,
    squareLocationId: process.env.SQUARE_LOCATION_ID,
  };
}

export const actions = {
  checkout: async ({ request, cookies }) => {
    const db = getDb();
    const square = getSquareClient();
    const data = await request.formData();

    const email = data.get("email") as string;
    const sourceId = data.get("sourceId") as string;

    try {
      const cart = JSON.parse(cookies.get("cart") || "[]");
      const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

      // Create order
      const orderResult = await db.execute({
        sql: "INSERT INTO orders (customer_email, total, status) VALUES (?, ?, 'pending')",
        args: [email, total],
      });
      const orderId = orderResult.lastInsertRowid;

      // Insert order items
      for (const item of cart) {
        await db.execute({
          sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          args: [orderId, item.productId, 1, item.price],
        });
      }

      // Process payment
      const payment = await square.paymentsApi.createPayment({
        sourceId,
        amountMoney: {
          amount: BigInt(Math.round(total * 100)),
          currency: "USD",
        },
        idempotencyKey: `order-${orderId}-${Date.now()}`,
      });

      // Update order
      await db.execute({
        sql: "UPDATE orders SET square_payment_id = ?, status = 'paid' WHERE id = ?",
        args: [payment.result.payment?.id, orderId],
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

```svelte
<!-- src/routes/checkout/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';

  export let data;
  export let form;

  let squareCard;
  let processing = false;

  // Progressive enhancement: Square SDK is optional
  onMount(async () => {
    if (typeof Square !== 'undefined') {
      const payments = Square.payments(data.squareAppId, data.squareLocationId);
      squareCard = await payments.card();
      await squareCard.attach('#card-container');
    }
  });

  async function handleSubmit(event) {
    processing = true;

    if (squareCard) {
      // With JavaScript: tokenize card with Square
      event.preventDefault();
      const result = await squareCard.tokenize();

      if (result.status === 'OK') {
        const formData = new FormData(event.target);
        formData.append('sourceId', result.token);

        // Submit form programmatically
        event.target.submit();
      } else {
        processing = false;
        alert('Card validation failed');
      }
    }
    // Without JavaScript: form submits normally
  }
</script>

<svelte:head>
  <script src="https://web.squarecdn.com/v1/square.js"></script>
</svelte:head>

<div class="container">
  <h1>Checkout</h1>

  <!-- Order Summary (server-rendered) -->
  <div class="order-summary">
    <h2>Order Summary</h2>
    <ul>
      {#each data.cart as item}
        <li>
          <span>{item.name}</span>
          <span>${item.price}</span>
        </li>
      {/each}
    </ul>
    <div class="total">
      <strong>Total:</strong>
      <strong>${data.total.toFixed(2)}</strong>
    </div>
  </div>

  <!-- Checkout Form -->
  <form method="POST" action="?/checkout" on:submit={handleSubmit} use:enhance>
    <h2>Contact Information</h2>
    <label>
      Email
      <input type="email" name="email" required>
    </label>

    <h2>Payment</h2>
    <!-- Square card container (enhanced with JS) -->
    <div id="card-container"></div>

    <!-- Fallback: works without Square SDK -->
    <noscript>
      <p>JavaScript is required for payment processing. Please enable JavaScript to complete your order.</p>
    </noscript>

    <button type="submit" disabled={processing}>
      {processing ? 'Processing...' : `Pay $${data.total.toFixed(2)}`}
    </button>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
  </form>
</div>
```

## Backend: Netlify Functions

### Products API

```ts
// netlify/functions/products.ts
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN!,
});

export default async (req: Request) => {
  try {
    const result = await db.execute(
      "SELECT id, name, description, price, image_url, stock FROM products WHERE active = 1",
    );

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return new Response(JSON.stringify({ error: "Failed to load products" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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
  authToken: process.env.TURSO_TOKEN!,
});

const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: Environment.Production,
});

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { sourceId, items, email } = await req.json();

    // Calculate total
    const total = items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
      0,
    );

    // Create order in database
    const orderResult = await db.execute({
      sql: "INSERT INTO orders (customer_email, total, status) VALUES (?, ?, 'pending')",
      args: [email, total],
    });
    const orderId = orderResult.lastInsertRowid;

    // Insert order items
    for (const item of items) {
      await db.execute({
        sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        args: [orderId, item.productId, item.quantity, item.price],
      });
    }

    // Process payment with Square
    const payment = await square.paymentsApi.createPayment({
      sourceId,
      amountMoney: {
        amount: BigInt(Math.round(total * 100)), // Convert to cents
        currency: "USD",
      },
      idempotencyKey: `order-${orderId}-${Date.now()}`,
    });

    // Update order with payment ID
    await db.execute({
      sql: "UPDATE orders SET square_payment_id = ?, status = 'paid' WHERE id = ?",
      args: [payment.result.payment?.id, orderId],
    });

    return Response.json({
      success: true,
      orderId,
      paymentId: payment.result.payment?.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return Response.json({ error: "Checkout failed" }, { status: 500 });
  }
};
```

## Data Flow

**Progressive Enhancement Model:**

```
1. Customer requests homepage
   ↓
2. SvelteKit renders HTML on server
   - Queries Turso for products
   - Generates semantic HTML
   ↓
3. Browser receives complete HTML
   - Content visible immediately
   - No loading spinners
   - Works without JavaScript
   ↓
4. JavaScript loads (enhancement)
   - SvelteKit hydrates components
   - Adds smooth transitions
   - Enables optimistic UI
   ↓
5. Customer adds to cart
   - Without JS: Form POST to /cart?/add
   - With JS: Enhanced with use:enhance (no page reload)
   - Cart stored in server-side cookie
   ↓
6. Checkout page
   - Server renders cart summary from cookie
   - Square SDK enhances payment form
   - Form works via POST even without Square
   ↓
7. Payment processing
   - Square tokenizes card (client-side)
   - Form submits to SvelteKit action
   - Server creates order in Turso
   - Server processes payment with Square API
   ↓
8. Order complete
   - Server redirects to success page
   - Success page rendered with order details
```

**Key Difference from SPA:**

- HTML rendered on server (not client)
- Content accessible immediately (no "loading..." state)
- Forms work via standard HTTP POST (not just AJAX)
- JavaScript enhances but isn't required

## SEO Optimization

### Meta Tags

```html
<title>Little Bitta Granola - Artisan Granola from Minnesota</title>
<meta name="description" content="Premium handcrafted granola..." />
<meta property="og:title" content="Little Bitta Granola" />
<meta property="og:image" content="/images/og-image.jpg" />
```

### Schema.org Markup

```html
<article itemscope itemtype="http://schema.org/Product">
  <h3 itemprop="name">Peanut Butter Nutella</h3>
  <p itemprop="description">Rich and creamy...</p>
  <div itemprop="offers" itemscope itemtype="http://schema.org/Offer">
    <meta itemprop="priceCurrency" content="USD" />
    <span itemprop="price" content="10.00">$10.00</span>
    <link itemprop="availability" href="http://schema.org/InStock" />
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

| Metric                 | Target | How                              |
| ---------------------- | ------ | -------------------------------- |
| First Contentful Paint | < 1s   | Static HTML from CDN             |
| Time to Interactive    | < 2s   | Minimal JavaScript (Alpine.js)   |
| Lighthouse Score       | > 90   | Optimized images, modern code    |
| SEO Score              | 100    | Semantic HTML, meta tags, schema |

## Related Documentation

- [Cloud Architecture](cloud-arch.md) - Infrastructure, deployment, and scaling
- [Admin Panel](admin-ui.md) - How to manage products shown on this site
