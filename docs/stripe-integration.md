# Stripe Custom Checkout Implementation

## Overview

Integration using Stripe Checkout Sessions API with `ui_mode: 'custom'` and the Clover API version. This provides a custom payment UI using Stripe Elements while benefiting from Checkout Sessions features (line items, tax support, etc.).

**Key Resources:**

- [Accept a Payment (Custom Checkout)](https://docs.stripe.com/payments/accept-a-payment?payment-ui=elements&api-integration=checkout)
- [Stripe.js Versioning](https://docs.stripe.com/sdks/stripejs-versioning)
- [Custom Checkout Elements](https://docs.stripe.com/js/custom_checkout/custom_checkout_elements)

## Architecture

### Stripe.js Loading (PCI Compliance)

For PCI compliance, Stripe.js must be loaded directly from Stripe's servers in the HTML head:

**File**: `src/app.html`

```html
<head>
  <!-- Required for PCI compliance -->
  <script src="https://js.stripe.com/clover/stripe.js"></script>
</head>
```

**Note**: We use the `clover` version (current as of 2025-12-15). The `@stripe/stripe-js` npm package v8.x provides TypeScript types for clover, though some newer methods may not be fully typed.

### SDK Singleton

**File**: `src/lib/payments/stripe-sdk.svelte.ts`

```typescript
import { PUBLIC_STRIPE_KEY } from "$env/static/public";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

let stripeInstance = $state<Stripe | null>(null);

export async function loadStripeInstance() {
  if (stripeInstance) return stripeInstance;

  const stripe = await loadStripe(PUBLIC_STRIPE_KEY);
  if (!stripe) throw new Error("Failed to load Stripe");

  stripeInstance = stripe;
  return stripe;
}
```

## Server-Side: Checkout Session Creation

**File**: `src/routes/api/stripe/checkout-session/+server.ts`

```typescript
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SECRET_STRIPE_KEY } from "$env/static/private";
import Stripe from "stripe";

const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: "2025-12-15.clover",
});

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();

    // Build line_items from cart
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: item.price * 100, // Convert to cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      ui_mode: "custom", // CRITICAL: enables custom Elements UI
      line_items,
      mode: "payment",
      return_url: `${url.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to create checkout session: ${message}`);
  }
};
```

**Key Points:**

- `ui_mode: 'custom'` is required for Elements UI (not hosted redirect)
- `return_url` must be an absolute URL (not relative path)
- Use `{CHECKOUT_SESSION_ID}` placeholder for session ID in URL

## Client-Side: Payment Component

**File**: `src/lib/components/StripeGwy.svelte`

### Initialization Flow

```typescript
onMount(async () => {
  const stripe = await loadStripeInstance();

  // Initialize checkout with client secret (can be a Promise)
  const checkout = await stripe.initCheckout({
    clientSecret: fetchClientSecret(), // Returns Promise<string>
  });

  // Create and mount payment element
  const paymentElement = checkout.createPaymentElement({
    layout: "tabs",
    paymentMethodOrder: [
      "apple_pay",
      "google_pay",
      "amazon_pay",
      "card",
      "cashapp",
      "klarna",
    ],
  });
  paymentElement.mount("#payment-element");

  // Create and mount email element (Stripe's secure iframe)
  const emailElement = (checkout as any).createEmailElement();
  emailElement.mount("#email-element");

  // Listen for email changes
  emailElement.on("change", (event: any) => {
    if (event.value?.email) {
      email = event.value.email;
    }
    if (event.error) {
      errorMessage = event.error.message;
    }
  });

  // Load actions for payment confirmation
  const result = await checkout.loadActions();
  if (result.type === "success") {
    actions = result.actions;

    // Get session info (totals, line items, etc.)
    const session = actions.getSession();
    stripeTotal = session.total.total.amount; // e.g., "$36.00"
  }
});
```

### Payment Confirmation

```typescript
async function handlePayment() {
  if (!actions) return;

  // Check if email needs to be updated
  const session = actions.getSession();
  if (!session.email && email) {
    await actions.updateEmail(email);
  }

  errorMessage = "";
  const result = await actions.confirm();

  if (result.type === "error") {
    errorMessage = result.error.message;
  }
  // On success, Stripe redirects to return_url
}
```

### Template Structure

```svelte
<div class="stripe-checkout">
  <div id="calculated-total">
    {#if stripeTotal !== ""}
      <h4>Total: {stripeTotal}</h4>
    {:else}
      <h4>Calculating...</h4>
    {/if}
  </div>

  <form id="payment-form">
    <div id="email-element"></div>
    <div id="payment-method">Payment Method</div>
    <div id="payment-element"></div>

    <button id="submit" onclick={handlePayment}>
      <span>Pay now</span>
    </button>

    {#if errorMessage}
      <div id="payment-message">{errorMessage}</div>
    {/if}
  </form>
</div>
```

## Key API Methods

### `stripe.initCheckout(options)`

Initializes a custom checkout session.

- `clientSecret`: String or Promise<string> - the session's client secret

### `checkout.createPaymentElement(options)`

Creates the payment method input element.

- `layout`: "tabs" | "accordion" | "auto"
- `paymentMethodOrder`: Array of payment method types

### `checkout.createEmailElement()`

Creates Stripe's secure email input element (iframe).

- **Note**: Not fully typed in `@stripe/stripe-js` - cast to `any`

### `checkout.loadActions()`

Returns actions object for interacting with the session.

- Returns: `{ type: 'success', actions }` or `{ type: 'error', error }`

### `actions.getSession()`

Returns current session state including:

- `email`: Customer email (if set)
- `total.total.amount`: Formatted total (e.g., "$36.00")
- `total.total.minorUnitsAmount`: Total in cents (e.g., 3600)
- `lineItems`: Array of line items

### `actions.updateEmail(email)`

Updates the session's email address.

- Required before `confirm()` if email not already set
- Returns: `{ type: 'success' }` or `{ type: 'error', error }`

### `actions.confirm(options?)`

Confirms the payment.

- Optionally pass `{ email }` if not using email element
- On success: Redirects to `return_url`
- On error: Returns `{ type: 'error', error }`

## Email Collection

Email is **required** for checkout confirmation. Options:

### Option 1: Stripe Email Element (Recommended)

Uses Stripe's secure iframe - best for security/PCI compliance.

```typescript
const emailElement = (checkout as any).createEmailElement();
emailElement.mount("#email-element");

emailElement.on("change", (event: any) => {
  if (event.value?.email) email = event.value.email;
});

// Before confirm, update if needed
if (!actions.getSession().email && email) {
  await actions.updateEmail(email);
}
```

### Option 2: Custom Input + updateEmail()

```typescript
// Svelte input
<input type="email" bind:value={email} />

// Before confirm
await actions.updateEmail(email);
await actions.confirm();
```

### Option 3: Pass to confirm()

```typescript
await actions.confirm({ email: "customer@example.com" });
```

### Option 4: Prefill on Server

```typescript
const session = await stripe.checkout.sessions.create({
  customer_email: "customer@example.com",
  // ...
});
```

## TypeScript Considerations

The `@stripe/stripe-js` v8.x package provides types for clover, but some methods may not be fully typed:

```typescript
// Cast for untyped methods
const checkout = (await stripe.initCheckout({ clientSecret })) as any;
const emailElement = checkout.createEmailElement();

// Or use type assertions for specific methods
const emailElement = (checkout as any).createEmailElement();
```

## Testing

### Test Cards

- Success: `4242 4242 4242 4242`
- 3D Secure: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

### Test Flow

1. Add items to cart
2. Navigate to cart page
3. Fill email in Stripe element
4. Enter test card details
5. Click "Pay now"
6. Verify redirect to success page
7. Check Stripe Dashboard → Payments

## Future Enhancements

- [ ] Webhook handler for `checkout.session.completed`
- [ ] Drop capacity management
- [ ] Session expiration handling
- [ ] Order success page with session details
- [ ] Error recovery for abandoned sessions
