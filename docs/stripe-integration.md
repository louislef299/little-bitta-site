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
import { getStripe } from "$lib/server/stripe";
import { getCurrentDrop, getDropCapacity } from "$lib/server/db/drop";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();
    const stripe = getStripe();

    // Check drop capacity before creating session
    const currDrop = await getCurrentDrop();
    const capacity = await getDropCapacity(currDrop.id);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    if (capacity.available < totalQuantity) {
      throw error(400, `Only ${capacity.available} items available`);
    }

    // Build line_items with adjustable quantities
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          metadata: { order_item_id: item.id.toString() },
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
      adjustable_quantity: {
        enabled: true,
        minimum: 0,
        maximum: 50,
      },
    }));

    const session = await stripe.checkout.sessions.create({
      ui_mode: "custom",
      line_items,
      mode: "payment",
      automatic_tax: { enabled: true },
      return_url: `${url.origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Retrieve line items to build ID mapping
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      session.id,
      { expand: ["line_items"] },
    );

    const lineItemMapping: Record<number, string> = {};
    items.forEach((item: any, index: number) => {
      const stripeLineItem = sessionWithLineItems.line_items?.data[index];
      if (stripeLineItem) {
        lineItemMapping[item.id] = stripeLineItem.id;
      }
    });

    return json({
      clientSecret: session.client_secret,
      dropCapacity: capacity,
      lineItemMapping,
    });
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
- `adjustable_quantity` must be enabled for client-side quantity updates
- `lineItemMapping` is returned so client can map order items to Stripe line item IDs
- Drop capacity is checked before session creation to prevent overselling

## Client-Side: Payment Component

**File**: `src/lib/components/StripeGwy.svelte`

### Initialization Flow

```typescript
let lineItemMapping: Record<number, string> = {};

async function fetchClientSecret(): Promise<string> {
  const currentHash = getCartHash();
  const cacheKey = getCheckoutCacheKey();

  // Check cache first
  if (browser) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const {
        clientSecret,
        cartHash,
        lineItemMapping: cached_mapping,
      } = JSON.parse(cached);
      if (cartHash === currentHash) {
        lineItemMapping = cached_mapping;
        return clientSecret;
      }
    }
  }

  // Fetch new session
  const response = await fetch("/api/stripe/checkout-session", {
    method: "POST",
    body: JSON.stringify({ items: getItems() }),
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();
  lineItemMapping = data.lineItemMapping;

  // Cache the session
  if (browser) {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        clientSecret: data.clientSecret,
        cartHash: currentHash,
        lineItemMapping: data.lineItemMapping,
      }),
    );
  }

  return data.clientSecret;
}

onMount(async () => {
  const stripe = await loadStripeInstance();

  checkout = await stripe.initCheckout({
    clientSecret: fetchClientSecret(),
    elementsOptions: {
      appearance: getAppearance(),
    },
  });

  // Payment element with wallet support
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
    wallets: {
      applePay: "auto",
      googlePay: "auto",
      link: "auto",
    },
  });
  paymentElement.mount("#payment-element");

  // Billing address element
  const billingElement = checkout.createBillingAddressElement();
  billingElement.mount("#billing-element");

  // Email element (not fully typed in @stripe/stripe-js)
  const emailElement = (checkout as any).createEmailElement();
  emailElement.mount("#email-element");
  emailElement.on("change", (event: any) => {
    if (event.value?.email) email = event.value.email;
    if (event.error) errorMessage = event.error.message;
  });

  // Load actions for payment confirmation
  const result = await checkout.loadActions();
  if (result.type === "success") {
    actions = result.actions;
    stripeTotal = actions.getSession().total.total.amount;
  }
});
```

### Payment Confirmation

```typescript
async function handlePayment() {
  if (!actions) return;

  // Update email if needed
  const session = actions.getSession();
  if (!session.email && email) {
    await actions.updateEmail(email);
  }

  // Update all line item quantities before confirmation
  const updatePromises = getItems()
    .map((item) => {
      const stripeLineItemId = lineItemMapping[item.id];
      if (!stripeLineItemId) {
        console.error(`No Stripe lineItem found for OrderItem ${item.id}`);
        return null;
      }
      return actions?.updateLineItemQuantity({
        lineItem: stripeLineItemId,
        quantity: item.quantity,
      });
    })
    .filter(Boolean);

  const results = await Promise.all(updatePromises);
  const errorResult = results.find((r) => r?.type === "error");
  if (errorResult) {
    errorMessage = errorResult.error.message;
    return;
  }

  // Confirm payment
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
    <div id="payment-element"></div>
    <div id="email-element"></div>
    <div id="billing-element"></div>

    <button id="submit" onclick={handlePayment} disabled={buttonDisabled}>
      <span>{buttonStatus}</span>
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

| Card Number           | Scenario                      |
| --------------------- | ----------------------------- |
| `4242 4242 4242 4242` | Success                       |
| `4000 0025 0000 3155` | 3D Secure required            |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic)            |

Use any future expiration date and any 3-digit CVC.

### Test Flow

1. Start webhook listener: `just webhook`
2. Start dev server: `just dev` (in separate terminal)
3. Copy `whsec_xxx` from webhook output to `.env` as `STRIPE_WEBHOOK_SECRET`
4. Restart dev server to pick up env var
5. Add items to cart
6. Navigate to cart page
7. Fill email in Stripe element
8. Enter test card details
9. Click "Pay now"
10. Verify redirect to success page
11. Check `stripe listen` terminal for webhook events:
    ```
    --> checkout.session.completed [evt_xxx]
    <-- [200] POST http://localhost:5173/api/stripe/webhook
    ```
12. Verify drop `sold_count` updated in database

## Webhook Handler

**File**: `src/routes/api/stripe/webhook/+server.ts`

The webhook handler processes payment events from Stripe to update drop inventory.

### Handled Events

- `checkout.session.completed` - Updates drop `sold_count` when payment succeeds
- `checkout.session.async_payment_succeeded` - Handles async payment methods (bank transfers)
- `checkout.session.expired` - Logs expired sessions (could release reserved capacity)

### Webhook Secret Configuration

The `STRIPE_WEBHOOK_SECRET` environment variable is **required** for webhook signature verification. Without it, the endpoint returns a 500 error.

**For local development:**

1. Run the Stripe CLI listener (see Local Development section below)
2. Copy the `whsec_xxx` signing secret from the CLI output
3. Add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

**For production:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
4. Copy the signing secret to your production environment variables

## Local Development

### Running with Stripe Webhooks

Use the `just webhook` command to start the Stripe CLI listener:

```bash
# Terminal 1: Start webhook listener
just webhook

# Terminal 2: Start dev server
just dev
```

The `webhook` recipe runs:

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

**Note**: You must run `stripe login` once before using the webhook listener.

### Testing Payments

1. Add items to cart
2. Navigate to cart page
3. Fill email in Stripe element
4. Enter test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Click "Pay now"
6. Verify redirect to success page
7. Check `stripe listen` output for webhook events
8. Verify drop `sold_count` updated in database

## Line Item Quantity Updates

The checkout supports updating line item quantities client-side before payment confirmation.

### Server Configuration

Line items must have `adjustable_quantity` enabled:

```typescript
const line_items = items.map((item: any) => ({
  price_data: { ... },
  quantity: item.quantity,
  adjustable_quantity: {
    enabled: true,
    minimum: 0,
    maximum: 50,
  },
}));
```

### Line Item ID Mapping

Stripe generates its own line item IDs. The server returns a mapping from your order item IDs to Stripe's line item IDs:

```typescript
// Server retrieves line items after session creation
const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
  session.id,
  {
    expand: ["line_items"],
  },
);

// Build mapping: orderItemId → stripeLineItemId
const lineItemMapping: Record<number, string> = {};
items.forEach((item: any, index: number) => {
  const stripeLineItem = sessionWithLineItems.line_items?.data[index];
  if (stripeLineItem) {
    lineItemMapping[item.id] = stripeLineItem.id;
  }
});

return json({ clientSecret, lineItemMapping });
```

### Client Usage

```typescript
// Use the mapping to update quantities
const stripeLineItemId = lineItemMapping[item.id];
await actions.updateLineItemQuantity({
  lineItem: stripeLineItemId,
  quantity: item.quantity,
});
```

## Cart Reactivity

When the cart changes (items added/removed), the Stripe checkout session must be recreated. This is handled by:

1. **Cache invalidation**: `clearCheckoutCache()` removes the cached session from localStorage
2. **Component remount**: The cart page uses `{#key cartHash}` to force `StripeGwy` to remount when cart changes

**File**: `src/routes/cart/+page.svelte`

```svelte
<script>
  var cartHash = $derived(getCartHash());
</script>

{#key cartHash}
  <StripeGwy />
{/key}
```

This ensures a fresh checkout session is fetched whenever the cart contents change.

## PaymentIntent Timing

With `ui_mode: "custom"`, the PaymentIntent is **not** created when the Checkout Session is created. It's only created when `actions.confirm()` is called. This means:

- PaymentIntents won't appear in Stripe Dashboard until user clicks "Pay now"
- The webhook `checkout.session.completed` fires after successful payment confirmation

## Future Enhancements

- [ ] Session expiration handling
- [ ] Order success page with session details
- [ ] Error recovery for abandoned sessions
- [ ] Reservation system for capacity (hold inventory during checkout)
