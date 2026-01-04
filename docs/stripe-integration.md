# Stripe Integration Architecture

## Overview

This implementation uses Stripe's Payment Element with server-side payment intent creation. Stripe handles payment processing and acts as the source of truth for payment data. The Payment Element provides a unified interface for cards, Cash App, Apple Pay, Google Pay, and other payment methods.

## Architecture Flow

```
┌──────────┐     ┌─────────────────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │────▶│ /api/stripe/        │────▶│ Stripe API  │────▶│  Stripe  │
│          │     │ payment-intent      │     │ v1/payment_ │     │  System  │
│          │     │ (Create)            │     │ intents     │     │          │
└──────────┘     └─────────────────────┘     └─────────────┘     └──────────┘
      │                                                                  │
      │  ┌────────────────────────────────────────────────────────┐     │
      └─▶│ User enters payment details in Payment Element         │     │
         │ (Cards, Cash App, Apple Pay, Google Pay)               │     │
         └────────────────────────────────────────────────────────┘     │
      │                                                                  │
      ▼                                                                  ▼
┌──────────┐     ┌─────────────────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │────▶│ stripe.confirm      │────▶│ Stripe API  │────▶│  Stripe  │
│          │     │ Payment()           │     │ (Confirm)   │     │  System  │
└──────────┘     └─────────────────────┘     └─────────────┘     └──────────┘
```

## Components

### 1. Client-Side (StripeGwy.svelte)

**Responsibilities:**

- Load Stripe SDK via `@stripe/stripe-js` package
- Render Payment Element (unified payment UI)
- Handle payment confirmation and success/error states
- Manage payment flow lifecycle

**Key Features:**

```typescript
// Load Stripe SDK
const stripe = await loadStripe(PUBLIC_STRIPE_KEY);

// Payment Element shows all enabled payment methods
<PaymentElement
  options={{
    layout: { type: 'tabs' },
    wallets: {
      applePay: 'auto',
      googlePay: 'auto',
    },
  }}
/>
```

**Payment Flow:**

1. `onMount()` - Load Stripe SDK, create payment intent, render Payment Element
2. User selects payment method and enters details
3. `handleSubmit()` - Validate and submit payment data
4. `stripe.confirmPayment()` - Confirm payment with Stripe
5. Redirect to success page or show error

**Payment Methods Included:**

The Payment Element automatically shows all enabled payment methods:

- **Credit/Debit Cards** - Visa, Mastercard, Amex, Discover, etc.
- **Apple Pay** - Shown automatically on Safari/iOS if configured in Apple Wallet
- **Google Pay** - Shown automatically on Chrome if configured in Google account
- **Cash App Pay** - One-click Cash App payments (US only)
- **Link** - Stripe's one-click checkout (autofill saved payment details)
- **Other methods** - Any payment methods enabled in Stripe Dashboard

**No Separate Integration Required:** Unlike PayPal, Apple Pay and Google Pay work seamlessly through the Payment Element without separate SDKs or complex setup.

### 2. SDK Loading (stripe-sdk.svelte.ts)

**Purpose:** Centralized SDK loading with caching

```typescript
let stripeInstance = $state<Stripe | null>(null);

export async function loadStripeSDK() {
  if (stripeInstance) {
    return stripeInstance; // Return cached instance
  }

  const stripe = await loadStripe(PUBLIC_STRIPE_KEY);
  stripeInstance = stripe;
  return stripe;
}
```

**Opportunistic Loading:**

In `src/routes/shop/+page.svelte`, the SDK loads during browser idle time:

```typescript
if (browser) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => loadStripeSDK(), { timeout: 5000 });
  } else {
    setTimeout(() => loadStripeSDK(), 2000);
  }
}
```

This ensures the SDK is ready before users reach the cart page.

### 3. Server Endpoint

#### `/api/stripe/payment-intent/+server.ts` - Payment Intent Creation

**Purpose:** Create a Stripe PaymentIntent representing the pending transaction

**Process:**

1. Receive cart items from client
2. Calculate total amount (in cents)
3. Call `stripe.paymentIntents.create()` with amount and currency
4. Return `clientSecret` to client

**Payment Intent Payload:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2500, // $25.00 in cents
  currency: 'usd',
  automatic_payment_methods: {
    enabled: true, // Enable all available payment methods
  },
  metadata: {
    items: JSON.stringify(items) // Store order details
  }
});
```

**Response:**

```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxxxxxxxxxxxx"
}
```

**Critical Details:**

- **Amount:** Must be in cents (integer) - $25.00 = 2500
- **Currency:** Use lowercase ISO code (`'usd'`, `'eur'`, etc.)
- **automatic_payment_methods:** Enables all payment methods configured in Dashboard
- **metadata:** Optional key-value pairs for storing order info (max 500 chars per value)
- **clientSecret:** Used on client-side to confirm payment (contains payment intent ID + secret)

**Gotchas:**

- Amount must be integer (use `Math.round()` to avoid decimals)
- Minimum amounts vary by currency (USD: $0.50 = 50 cents)
- Metadata values are strings only (use `JSON.stringify()` for objects)

## Environment Variables

### Public (Browser-Safe)

```bash
PUBLIC_STRIPE_KEY=pk_test_51...
```

- **Purpose:** Load Stripe SDK in browser
- **Format:** Starts with `pk_test_` (sandbox) or `pk_live_` (production)
- **Safety:** Publishable keys are safe to expose (they can only create tokens, not charge payments)
- **SvelteKit:** Must prefix with `PUBLIC_` to access in browser

### Private (Server-Only)

```bash
SECRET_STRIPE_KEY=sk_test_51...
```

- **Purpose:** Authenticate server-side API calls to Stripe
- **Format:** Starts with `sk_test_` (sandbox) or `sk_live_` (production)
- **Security:** NEVER expose to browser - can perform any operation including charges, refunds
- **SvelteKit:** Import from `$env/static/private` (only accessible server-side)

**Critical:** The secret key can create charges, issue refunds, access customer data, and perform any Stripe operation. Never log it, commit it to git, or expose it client-side.

## API Version

Stripe uses API versioning to maintain backwards compatibility:

```typescript
const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: '2025-12-15.clover',
});
```

- **Purpose:** Lock to specific API version for stability
- **Latest version:** Check [Stripe API Changelog](https://stripe.com/docs/upgrades)
- **Migration:** Test in sandbox before upgrading production
- **Default:** Uses account's default version if not specified

## Payment Element vs Individual Components

### Payment Element (Current Implementation)

**Advantages:**

- Single component handles all payment methods
- Automatic support for new payment methods as Stripe adds them
- Built-in validation and error handling
- Unified, mobile-optimized UI
- Consistent styling across payment methods
- Apple Pay and Google Pay included automatically
- Recommended by Stripe (best practices)

```svelte
<PaymentElement
  options={{
    layout: { type: 'tabs' },
    wallets: { applePay: 'auto', googlePay: 'auto' },
  }}
/>
```

**Use when:** Building modern checkout (99% of use cases)

### Individual Components (Alternative)

Stripe also provides individual components if you need granular control:

```svelte
<CardNumber />
<CardExpiry />
<CardCvc />
```

**Use when:**

- Need custom UI/layout for card fields
- Only accepting cards (no other payment methods)
- Requires specific styling that Payment Element can't achieve

**Trade-offs:**

- More code to maintain
- Manual handling of each payment method
- No automatic support for new payment methods
- More testing surface area

## Payment Flow States

### Payment Intent Lifecycle

1. **`requires_payment_method`** - Initial state, awaiting payment details
2. **`requires_confirmation`** - Payment method attached, ready to confirm
3. **`requires_action`** - Needs additional action (3D Secure, authentication)
4. **`processing`** - Being processed by payment network
5. **`requires_capture`** - Authorized but not captured (if using manual capture)
6. **`succeeded`** - Payment completed successfully
7. **`canceled`** - Payment intent was canceled

### Error States

- **`payment_failed`** - Payment failed (insufficient funds, fraud, etc.)
- **`requires_payment_method`** (after failure) - User can retry with different payment method

### Our Implementation

```typescript
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: '/order-success' },
  redirect: 'if_required',
});

if (paymentIntent?.status === 'succeeded') {
  // Payment successful
  emptyCart();
  window.location.href = `/order-success?id=${paymentIntent.id}`;
}
```

**Key Details:**

- `redirect: 'if_required'` - Only redirect for 3D Secure/authentication
- Most payments complete immediately without redirect
- Handle both inline and redirect flows

## Apple Pay & Google Pay Integration

### No Separate Implementation Needed!

Unlike PayPal, Stripe's Payment Element handles Apple Pay and Google Pay automatically:

```svelte
<PaymentElement
  options={{
    wallets: {
      applePay: 'auto', // Show Apple Pay if available
      googlePay: 'auto', // Show Google Pay if available
    },
  }}
/>
```

### How It Works

**Stripe automatically:**

1. Detects if device supports Apple Pay / Google Pay
2. Checks if user has configured wallet
3. Shows appropriate button in Payment Element
4. Handles all wallet communication
5. Returns standard payment method (same flow as cards)

**Requirements:**

- **Domain verification** (automatic in Stripe Dashboard)
- **HTTPS** (required for production, localhost works in test mode)
- **Browser support:**
  - Apple Pay: Safari on iOS/macOS
  - Google Pay: Chrome on Android/Desktop

**Testing:**

- **Sandbox:** Works on `localhost` with test keys
- **Test Cards:** Add test cards to Apple/Google Wallet in test mode
- **No complex setup:** Just enable in Stripe Dashboard → Settings → Payment methods

### Enabling Digital Wallets

**Stripe Dashboard:**

1. Go to [Settings → Payment methods](https://dashboard.stripe.com/settings/payment_methods)
2. Enable **Apple Pay** and **Google Pay**
3. Add domain (automatic verification for Stripe-hosted checkout)

**For custom integration (our case):**

1. Dashboard → Settings → Payment methods → Apple Pay → Add domain
2. Enter domain: `yourdomain.com`
3. Stripe automatically verifies (no files to upload)
4. Repeat for Google Pay if needed

**Sandbox vs Production:**

- **Sandbox:** Localhost works, no verification needed
- **Production:** Must verify each domain, requires HTTPS

## Cash App Pay

Cash App Pay is a one-click payment method popular in the US.

### Enabling Cash App

**Stripe Dashboard:**

1. [Settings → Payment methods](https://dashboard.stripe.com/settings/payment_methods)
2. Find "Cash App Pay"
3. Click "Turn on"

**No code changes needed** - Payment Element automatically shows Cash App when enabled.

### Requirements

- **US-based business** (Stripe account in US)
- **USD currency** only
- **Customer location:** US only
- **Amount limits:** $1 - $2,500 per transaction

### User Experience

1. User clicks Cash App button in Payment Element
2. Redirected to Cash App (mobile) or QR code shown (desktop)
3. Approves payment in Cash App
4. Redirected back to your site
5. Payment confirmed

### Testing

**Test mode:**

- Use Cash App test account
- Or use test card numbers (Cash App won't actually launch in test mode)

**Production:**

- Requires real Cash App account
- Real money transactions

## Security Considerations

### PCI Compliance

**Payment Element handles PCI compliance:**

- Card data never touches your server
- Stripe.js creates tokens client-side
- Tokens sent to your server (not card numbers)
- You remain PCI-DSS SAQ A compliant (simplest level)

**What this means:**

- No card data stored in your database
- No PCI audit required for most businesses
- Stripe handles security and compliance

### HTTPS Requirements

- **Test mode:** Works on `localhost` (HTTP)
- **Production:** Requires HTTPS for:
  - Payment Element to load
  - Apple Pay / Google Pay eligibility
  - PCI compliance
  - General security best practices

### API Key Protection

**Publishable Key (`pk_test_...`):**

- ✅ Safe to expose in client-side code
- ✅ Can create payment methods/tokens
- ❌ Cannot charge payments or access sensitive data
- Used in browser to initialize Stripe.js

**Secret Key (`sk_test_...`):**

- ❌ NEVER expose client-side
- ❌ NEVER commit to git
- ❌ NEVER log in production
- ✅ Only use server-side
- ✅ Rotate immediately if compromised

**Best practices:**

```bash
# .gitignore
.env
.env.local
.env.*.local
```

```typescript
// ✅ GOOD - Server-side only
import { SECRET_STRIPE_KEY } from '$env/static/private';

// ❌ BAD - Never in components
import { SECRET_STRIPE_KEY } from '$env/static/private'; // In .svelte file
```

## Error Handling

### Common Errors

**Client-Side Errors:**

```typescript
const { error } = await stripe.confirmPayment({ ... });

if (error) {
  // error.type: 'card_error', 'validation_error', 'api_error', etc.
  // error.code: 'card_declined', 'expired_card', 'insufficient_funds', etc.
  // error.message: User-friendly message
  console.error(error.message);
}
```

**Error Types:**

- **`card_error`** - Card declined, insufficient funds, incorrect details
- **`validation_error`** - Invalid parameters sent to API
- **`api_error`** - Stripe API issue (rare, retry)
- **`authentication_error`** - Invalid API key
- **`rate_limit_error`** - Too many requests
- **`invalid_request_error`** - Malformed request

**Server-Side Errors:**

```typescript
try {
  const paymentIntent = await stripe.paymentIntents.create({ ... });
} catch (err) {
  if (err instanceof Stripe.errors.StripeCardError) {
    // Card was declined
  } else if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    // Invalid parameters
  } else {
    // Other error
  }
}
```

### Error Recovery

**For Users:**

- Show clear error messages from `error.message`
- Allow retry with same or different payment method
- Don't create new payment intent for retries (reuse existing)

**For Developers:**

- Log errors to monitoring service (Sentry, LogRocket, etc.)
- Track decline rates by error code
- Set up alerts for unusual error patterns

## Testing

### Test Mode

Stripe provides two environments:

- **Test mode:** Sandbox with test data (keys start with `pk_test_`, `sk_test_`)
- **Live mode:** Real payments with real money (keys start with `pk_live_`, `sk_live_`)

Toggle in Stripe Dashboard (top-right)

### Test Card Numbers

**Success:**

- `4242 4242 4242 4242` - Visa (succeeds)
- `5555 5555 5555 4444` - Mastercard (succeeds)
- `3782 822463 10005` - Amex (succeeds)

**Requires Authentication (3D Secure):**

- `4000 0025 0000 3155` - Visa (triggers 3D Secure flow)

**Declined:**

- `4000 0000 0000 9995` - Always declined
- `4000 0000 0000 0002` - Declined (generic)
- `4000 0000 0000 0069` - Declined (expired card)

**Regional Cards:**

- `4000 0056 0000 0004` - Debit card (US)
- `4000 0082 6000 0000` - Debit card (UK)

**Other Test Data:**

- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (Amex: 4 digits)
- **ZIP:** Any 5 digits (US) or postal code format

**Full list:** https://stripe.com/docs/testing

### Testing Digital Wallets

**Apple Pay (Test Mode):**

1. Use Safari on iOS/macOS
2. Add test card to Apple Wallet (Stripe test cards work)
3. Payment Element shows Apple Pay button
4. Authenticate with Face ID/Touch ID
5. Payment processes in test mode

**Google Pay (Test Mode):**

1. Use Chrome browser
2. Add test card to Google account
3. Payment Element shows Google Pay button
4. Payment processes in test mode

**Cash App (Test Mode):**

- Cash App won't actually launch in test mode
- Payment flow simulated
- Use regular test cards instead for testing

### Testing Payment Flows

**Successful Payment:**

1. Enter test card: `4242 4242 4242 4242`
2. Expiry: `12/34`, CVC: `123`, ZIP: `12345`
3. Submit payment
4. Check Stripe Dashboard → Payments for successful charge

**3D Secure Authentication:**

1. Enter test card: `4000 0025 0000 3155`
2. Submit payment
3. Modal appears asking to authenticate
4. Click "Complete authentication"
5. Payment succeeds after authentication

**Declined Payment:**

1. Enter test card: `4000 0000 0000 9995`
2. Submit payment
3. Error message: "Your card was declined"
4. User can retry with different card

## Webhooks (Recommended for Production)

Webhooks notify your server of payment events (e.g., successful payment, failed payment, dispute).

### Why Use Webhooks?

- Asynchronous payment updates (e.g., after 3D Secure)
- Handle edge cases (user closes browser before redirect)
- Capture disputes, refunds, chargebacks
- Track subscription events
- More reliable than client-side callbacks

### Setup

**Stripe Dashboard:**

1. [Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "+ Add endpoint"
3. Enter URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created` (chargebacks)

**Implementation (Future):**

Create `/api/stripe/webhook/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { SECRET_STRIPE_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: '2025-12-15.clover',
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      STRIPE_WEBHOOK_SECRET
    );

    // Handle event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // TODO: Fulfill order, send confirmation email
        break;

      case 'payment_intent.payment_failed':
        const failed = event.data.object;
        console.log('Payment failed:', failed.id);
        // TODO: Notify customer
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return json({ error: 'Webhook error' }, { status: 400 });
  }
};
```

**Security:**

- Always verify webhook signature using `stripe.webhooks.constructEvent()`
- Use raw request body (not parsed JSON)
- Store webhook secret in environment variables

## Querying Payment History

### Via API

```typescript
// Get single payment intent
const paymentIntent = await stripe.paymentIntents.retrieve('pi_xxxxxxxxxxxxx');

// List all payments
const payments = await stripe.paymentIntents.list({
  limit: 100,
});

// Search payments
const results = await stripe.paymentIntents.search({
  query: 'status:"succeeded" AND metadata["order_id"]:"12345"',
});
```

### Via Dashboard

- **Test mode:** https://dashboard.stripe.com/test/payments
- **Live mode:** https://dashboard.stripe.com/payments

**Features:**

- Filter by status, amount, date
- Export transactions (CSV, Excel)
- Issue refunds
- View customer details
- See full timeline of events

## Production Checklist

- [ ] Replace test keys with live keys
  - [ ] `PUBLIC_STRIPE_KEY=pk_live_...`
  - [ ] `SECRET_STRIPE_KEY=sk_live_...`
- [ ] Verify HTTPS on production domain
- [ ] Enable payment methods in live mode Dashboard
  - [ ] Cards (enabled by default)
  - [ ] Apple Pay
  - [ ] Google Pay
  - [ ] Cash App Pay (if US-based)
- [ ] Add production domain for Apple Pay/Google Pay
- [ ] Set up webhook endpoints
  - [ ] Create `/api/stripe/webhook` endpoint
  - [ ] Add webhook URL in Dashboard
  - [ ] Store `STRIPE_WEBHOOK_SECRET` in env
- [ ] Test with real payment (small amount like $1.00)
- [ ] Implement error monitoring (Sentry, LogRocket, etc.)
- [ ] Add refund functionality if needed
- [ ] Review Stripe's terms of service
- [ ] Configure email receipts in Stripe Dashboard
- [ ] Test all payment methods (cards, Apple Pay, Google Pay, Cash App)
- [ ] Set up fraud prevention rules (Stripe Radar)

## Performance Optimization

### Current Implementation

**Opportunistic SDK Loading:**

SDK loads during browser idle time on shop page:

```typescript
// src/routes/shop/+page.svelte
if (browser) {
  requestIdleCallback(() => loadStripeSDK(), { timeout: 5000 });
}
```

**Benefits:**

- SDK ready before user reaches cart
- No blocking on cart page load
- Improved perceived performance

**SDK Size:**

- Stripe.js: ~45KB gzipped
- Payment Element: Lazy-loaded on demand
- Total: ~80KB for full payment flow

### Additional Optimizations

**1. Preconnect to Stripe Domains:**

```html
<!-- In app.html or layout -->
<link rel="preconnect" href="https://js.stripe.com" />
<link rel="preconnect" href="https://api.stripe.com" />
```

**2. DNS Prefetch:**

```html
<link rel="dns-prefetch" href="https://js.stripe.com" />
```

**3. Lazy Load Payment Element:**

Only load when cart has items:

```svelte
{#if cart.items.length > 0}
  <StripeGwy />
{/if}
```

**4. Payment Intent Reuse:**

Reuse payment intent for retries instead of creating new ones (current implementation creates on mount - could be optimized).

## Refunds

Refunds can be issued via Dashboard or API.

### Via Dashboard

1. Go to [Payments](https://dashboard.stripe.com/payments)
2. Click payment to refund
3. Click "Refund payment" button
4. Enter amount (partial or full)
5. Add reason (optional)
6. Confirm

**Refund timeline:**

- 5-10 business days to customer's card
- Instant for Cash App Pay
- Stripe fees NOT refunded (2.9% + $0.30)

### Via API (Future Implementation)

```typescript
const refund = await stripe.refunds.create({
  payment_intent: 'pi_xxxxxxxxxxxxx',
  amount: 2500, // $25.00 in cents (optional - omit for full refund)
  reason: 'requested_by_customer', // or 'duplicate', 'fraudulent'
});
```

**Partial Refunds:**

```typescript
// Refund $10 of $25 payment
await stripe.refunds.create({
  payment_intent: 'pi_xxxxxxxxxxxxx',
  amount: 1000, // $10.00
});
```

## Current Limitations

1. **No webhook integration** - Add for production reliability
2. **No refund handling in app** - Currently must use Dashboard
3. **No subscription support** - Only one-time payments
4. **No shipping calculation** - Static cart, no address-based shipping
5. **No tax calculation** - Add via Stripe Tax API if needed
6. **No order persistence** - Payments only exist in Stripe (by design)
7. **No email receipts** - Enable in Stripe Dashboard (Settings → Emails)

## Comparison: Stripe vs PayPal

### Stripe Advantages

✅ **Simpler digital wallet integration**

- Apple Pay / Google Pay built into Payment Element
- No separate SDKs or complex setup
- Automatic domain verification

✅ **Better developer experience**

- Cleaner API design
- Better documentation
- More predictable behavior

✅ **Modern payment methods**

- Cash App Pay (growing in US)
- Link (one-click checkout)
- Buy Now Pay Later options (Klarna, Affirm)

✅ **Unified payment UI**

- Single component for all payment methods
- Consistent UX across methods
- Mobile-optimized out of the box

### PayPal Advantages

✅ **Higher trust in US**

- More recognizable brand
- Users comfortable with PayPal account

✅ **Venmo integration**

- Popular among younger demographics
- Peer-to-peer payment familiarity

✅ **No card required**

- Users can pay from PayPal balance
- Alternative to traditional card payments

### Recommendation

**Use both!** They serve different user preferences:

- **Stripe:** Modern checkout, digital wallets, card payments
- **PayPal:** Users who prefer PayPal/Venmo accounts

Current implementation offers both on cart page:

```svelte
<div class="payment-methods">
  <StripeGwy />  <!-- Cards, Apple Pay, Google Pay, Cash App -->
  <PayPalGwy />  <!-- PayPal, Venmo -->
</div>
```

## Z-Index Management

**Issue:** Payment buttons/modals appearing above sticky header

**Solution:** Wrap payment components with constrained z-index:

```svelte
<div class="payment-container">
  <!-- Payment UI here -->
</div>

<style>
  .payment-container {
    position: relative;
    z-index: 1;
  }

  .payment-container :global(*) {
    z-index: 1 !important;
  }
</style>
```

**Z-Index Hierarchy:**

- Header: `z-index: 100` (highest)
- Sticky total: `z-index: 10`
- Payment elements: `z-index: 1`
- Page content: `z-index: auto` (default)

This ensures sticky header always appears above payment UI when scrolling.

## References

- **Stripe Docs:** https://stripe.com/docs
- **Payment Element:** https://stripe.com/docs/payments/payment-element
- **API Reference:** https://stripe.com/docs/api
- **Dashboard:** https://dashboard.stripe.com/
- **Test Cards:** https://stripe.com/docs/testing
- **Webhooks:** https://stripe.com/docs/webhooks
- **Stripe.js Reference:** https://stripe.com/docs/js

## Troubleshooting

### Payment Element Not Showing

**Possible causes:**

1. Stripe SDK failed to load
   - Check browser console for errors
   - Verify `PUBLIC_STRIPE_KEY` is correct

2. Payment intent creation failed
   - Check server logs
   - Verify `SECRET_STRIPE_KEY` is correct
   - Check network tab for API errors

3. No payment methods enabled
   - Check Stripe Dashboard → Settings → Payment methods
   - Enable at least one payment method

### Apple Pay / Google Pay Not Showing

**Possible causes:**

1. Wrong browser/device
   - Apple Pay: Requires Safari on iOS/macOS
   - Google Pay: Works best on Chrome

2. Wallet not configured
   - User must have Apple/Google Pay set up
   - Must have at least one card saved

3. Domain not verified (production only)
   - Check Dashboard → Settings → Payment methods → Apple Pay → Domains
   - Add and verify your domain

4. Not enabled in Dashboard
   - Dashboard → Settings → Payment methods
   - Enable Apple Pay and Google Pay

### "Invalid API Key" Error

**Causes:**

- Using test key in production mode or vice versa
- Key copied incorrectly (missing characters)
- Using secret key client-side (should use publishable key)

**Solution:**

- Verify key format: `pk_test_...` or `pk_live_...` for client
- Verify key format: `sk_test_...` or `sk_live_...` for server
- Check for trailing spaces when copying

### Payment Succeeds but Cart Not Empty

**Possible causes:**

1. Redirect happens before cart state updates
2. User closed tab before redirect completed
3. Network error during redirect

**Solution:**

- Implement webhook to handle async completion
- Store "processing" state to prevent duplicate orders
- Clear cart on success page load as backup

### 3D Secure Modal Not Appearing

**Causes:**

- Popup blocked by browser
- Using test card that doesn't require 3DS

**Solution:**

- Test with `4000 0025 0000 3155` (always requires 3DS)
- Check browser popup blocker settings
- Ensure `redirect: 'if_required'` is set correctly
