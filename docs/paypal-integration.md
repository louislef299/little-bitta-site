# PayPal Integration Architecture

## Overview

This implementation uses PayPal's Smart Payment Buttons SDK with server-side order creation and capture. PayPal acts as the sole source of truth for order data - no local database required.

## Architecture Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │────▶│ /api/order   │────▶│ PayPal API  │────▶│ PayPal   │
│          │     │ (Create)     │     │ v2/orders   │     │ System   │
└──────────┘     └──────────────┘     └─────────────┘     └──────────┘
      │                                                           │
      │  ┌────────────────────────────────────────────────────┐  │
      └─▶│ User approves payment in PayPal popup/redirect     │◀─┘
         └────────────────────────────────────────────────────┘
      │
      ▼
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │────▶│ /api/capture │────▶│ PayPal API  │────▶│ PayPal   │
│          │     │              │     │ v2/capture  │     │ System   │
└──────────┘     └──────────────┘     └─────────────┘     └──────────┘
```

## Components

### 1. Client-Side (PaymentGwy.svelte)

**Responsibilities:**

- Load PayPal SDK via `@paypal/paypal-js` package
- Render payment buttons (PayPal, Venmo, Credit/Debit Cards)
- Orchestrate order creation and capture flow

**Key Configuration:**

```typescript
loadScript({
  clientId: PUBLIC_PAYPAL_CLIENT_ID, // Public - safe to expose
  components: "buttons", // Standard buttons component
  currency: "USD",
  enableFunding: "venmo", // Explicit opt-in for Venmo
  disableFunding: "paylater", // Hide Pay Later options
});
```

**Payment Flow:**

1. `createOrder()` - Calls `/api/order` with cart items, returns PayPal order ID
2. PayPal SDK handles buyer authentication/approval
3. `onApprove()` - Calls `/api/capture` to finalize payment

**Important:** Apple Pay and Google Pay require completely separate integrations - see section below.

### 2. Server Endpoints

#### `/api/order/+server.ts` - Order Creation

**Purpose:** Create a PayPal order object representing the pending transaction

**Process:**

1. Authenticate with PayPal using OAuth 2.0 Client Credentials
2. Calculate order total from cart items
3. Call `POST /v2/checkout/orders` to create order
4. Return PayPal order ID to client

**Critical Details:**

- **Authentication:** Uses Basic auth with base64-encoded `client_id:client_secret`
- **Token endpoint:** `https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Grant type:** `client_credentials`
- **Token lifespan:** ~8 hours (PayPal caches, no need to optimize)

**Order Creation Payload:**

```json
{
  "intent": "CAPTURE", // Immediate payment vs AUTHORIZE (later capture)
  "purchase_units": [
    {
      "amount": {
        "currency_code": "USD",
        "value": "25.00",
        "breakdown": {
          "item_total": {
            "currency_code": "USD",
            "value": "25.00"
          }
        }
      },
      "items": [
        {
          "name": "Product Name",
          "quantity": "1",
          "unit_amount": {
            "currency_code": "USD",
            "value": "25.00"
          }
        }
      ]
    }
  ]
}
```

**Response:**

```json
{
  "id": "5O190127TN364715T",  // This is what you return to client
  "status": "CREATED",
  "links": [...]
}
```

**Gotchas:**

- `value` must be string in payload, but calculate as number
- `item_total` must exactly match sum of items \* quantity
- `quantity` must be string, not number
- Mismatched totals = `INVALID_REQUEST` error

#### `/api/capture/+server.ts` - Payment Capture

**Purpose:** Finalize the payment after buyer approval

**Process:**

1. Re-authenticate with PayPal (new access token)
2. Call `POST /v2/checkout/orders/{orderID}/capture`
3. Return capture status to client

**Capture Response:**

```json
{
  "id": "5O190127TN364715T",
  "status": "COMPLETED",  // Check this!
  "purchase_units": [{
    "payments": {
      "captures": [{
        "id": "0L0396...",
        "status": "COMPLETED",
        "amount": {...}
      }]
    }
  }]
}
```

**Status Values:**

- `COMPLETED` - Payment successful, funds captured
- `PENDING` - Requires additional action (e-check, manual review)
- `DECLINED` - Payment failed
- `VOIDED` - Order was cancelled

## Environment Variables

### Public (Browser-Safe)

```bash
PUBLIC_PAYPAL_CLIENT_ID=AaVahc...
```

- Used in browser to load PayPal SDK
- Already visible in network requests, safe to expose
- Prefix with `PUBLIC_` for SvelteKit

### Private (Server-Only)

```bash
PAYPAL_CLIENT_ID=AaVahc...       # Same as public, used for API auth
PAYPAL_CLIENT_SECRET=EJFZ9w...   # SECRET - never expose to browser
PAYPAL_ENV=sandbox               # "sandbox" or "production"
```

**Critical:** Never import from `$env/static/private` in components that run in browser. SvelteKit will error.

## API Endpoints by Environment

### Sandbox (Testing)

- **Auth:** `https://api-m.sandbox.paypal.com/v1/oauth2/token`
- **Orders:** `https://api-m.sandbox.paypal.com/v2/checkout/orders`
- **Capture:** `https://api-m.sandbox.paypal.com/v2/checkout/orders/{id}/capture`
- **Dashboard:** https://developer.paypal.com/dashboard/

### Production

- **Auth:** `https://api-m.paypal.com/v1/oauth2/token`
- **Orders:** `https://api-m.paypal.com/v2/checkout/orders`
- **Capture:** `https://api-m.paypal.com/v2/checkout/orders/{id}/capture`
- **Dashboard:** https://www.paypal.com/

## Payment Methods

### Currently Enabled (Standard Buttons)

The implementation uses standard PayPal Buttons which automatically render:

- **PayPal** - Always available, primary payment method
- **Venmo** - US mobile users only (explicitly enabled)
- **Credit/Debit Cards** - Guest checkout without PayPal account

These methods work seamlessly with the current `paypal.Buttons()` integration.

### Apple Pay & Google Pay (Separate Integration Required)

**IMPORTANT:** Apple Pay and Google Pay are **NOT** part of the standard buttons integration. They require completely different implementations.

#### Why They're Different

Unlike PayPal/Venmo/Cards which use the unified `Buttons()` API:

- Apple Pay requires `components: "applepay"` + separate Apple Pay JS SDK
- Google Pay requires `components: "googlepay"` + separate Google Pay configuration
- Both use dedicated APIs: `paypal.Applepay()`, `paypal.Googlepay()`
- Cannot be enabled via `enableFunding` parameter (will cause SDK load errors)

#### Complexity Comparison

**Standard Buttons (Current):** ~100 lines of code

- Single SDK load
- Single `Buttons()` component
- Automatic rendering of eligible methods

**Apple Pay:** ~200-300 additional lines

- Second SDK (Apple Pay JS SDK)
- Separate button rendering
- Complex `ApplePaySession` setup with callbacks
- `onvalidatemerchant` callback handling
- `onpaymentauthorized` callback handling
- Domain verification required
- HTTPS mandatory (won't work on localhost)

**Google Pay:** Similar complexity to Apple Pay

#### Requirements for Apple Pay

**Prerequisites:**

1. **HTTPS domain** - Required (localhost HTTP not supported)
2. **Domain verification** - Must register with PayPal Dashboard
3. **Domain association file** - Host on your server at `/.well-known/apple-developer-merchantid-domain-association`
4. **Apple Developer Account** - Required for sandbox testing (NOT required for production)
5. **Merchant onboarding** - Complete PayPal's Apple Pay onboarding process

**Technical Requirements:**

- Safari browser (iOS/macOS) or latest Chrome with Apple Pay support
- iOS 12.1+ or macOS 10.14.1+
- Apple Pay configured in buyer's Wallet app
- Supported regions/currencies (34 countries, 22 currencies)

#### Requirements for Google Pay

**Prerequisites:**

1. **HTTPS domain** - Required
2. **Google Pay API access** - Merchant account setup
3. **Domain verification** - Similar to Apple Pay
4. **Chrome browser** - Primary support
5. **Google Pay configured** - In buyer's Google account

**Technical Requirements:**

- Chrome browser (desktop/Android)
- Google Pay account linked
- Supported regions/currencies

### Configuration Options

**Standard buttons (current approach):**

```typescript
loadScript({
  components: "buttons",
  enableFunding: "venmo",
  disableFunding: "paylater",
});
```

**Apple Pay (requires separate implementation):**

```typescript
// Load Apple Pay SDK separately
<script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js"></script>

// Load PayPal with Apple Pay component
loadScript({
  components: "buttons,applepay",  // Note: comma-separated
  currency: "USD"
})

// Use separate API
const applepay = paypal.Applepay();
await applepay.config();
await applepay.validateMerchant({...});
await applepay.confirmOrder({...});
```

**Google Pay (requires separate implementation):**

```typescript
// Load PayPal with Google Pay component
loadScript({
  components: "buttons,googlepay",
  currency: "USD",
});

// Use separate API
const googlepay = paypal.Googlepay();
// ... similar complex setup
```

**Available Funding Sources:**

- `paypal` - Always enabled, cannot disable
- `venmo` - US mobile only
- `paylater` - Buy now pay later options (currently disabled)
- `card` - Guest credit/debit card payments
- `credit` - PayPal Credit (US, UK)

**NOT valid for enableFunding:**

- ❌ `applepay` - Use `components` parameter instead
- ❌ `googlepay` - Use `components` parameter instead

## Security Considerations

### Authentication Flow

1. Every API call requires fresh OAuth token
2. Token obtained via Basic auth with `client_id:client_secret`
3. Token used as Bearer token for order operations
4. Tokens expire after ~8 hours (but request new one each time for simplicity)

### HTTPS Requirements

- **Sandbox:** Works on localhost HTTP
- **Production:** Requires HTTPS for:
  - Payment button rendering
  - Apple Pay eligibility
  - Security best practices

### Client Secret Protection

- **Never** commit to git (ensure `.env` in `.gitignore`)
- **Never** expose in client-side code
- **Never** log in production
- Rotate if compromised via PayPal dashboard

## Order Lifecycle

### States

1. **CREATED** - Order created, awaiting buyer approval
2. **APPROVED** - Buyer approved, ready to capture
3. **COMPLETED** - Payment captured, funds transferred
4. **VOIDED** - Order cancelled before capture
5. **PAYER_ACTION_REQUIRED** - Buyer needs to complete additional steps

### Timing

- Orders expire after **3 hours** if not approved
- Approved orders must be captured within **3 hours**
- After 3 hours, buyer can dispute uncaptured authorization

## Error Handling

### Common Errors

**`INVALID_REQUEST`**

- Mismatched totals (item_total ≠ sum of items)
- Invalid currency format
- Missing required fields

**`AUTHENTICATION_FAILURE`**

- Invalid client_id or client_secret
- Expired credentials
- Wrong environment (sandbox vs production)

**`AUTHORIZATION_ERROR`**

- Insufficient permissions
- Attempting to capture already-captured order
- Order expired

**`UNPROCESSABLE_ENTITY`**

- Buyer account issue
- Payment method declined
- Risk/compliance hold

### Debugging

1. Check server logs for PayPal API responses
2. Use `debug: true` in loadScript() for client-side debugging
3. PayPal returns detailed error objects with `name`, `message`, `details[]`
4. Test with sandbox accounts in different states (buyer, seller, limited)

## Testing

### Sandbox Accounts

Create test accounts at: https://developer.paypal.com/dashboard/accounts

**Required Accounts:**

- **Business (Seller):** Receives payments (your merchant account)
- **Personal (Buyer):** Makes test purchases

### Test Payment Flow

1. Use sandbox credentials in `.env`
2. Click PayPal button
3. Log in with Personal test account
4. Approve payment
5. Check Sandbox dashboard for transaction

### Test Cards (for Guest Checkout)

PayPal provides test card numbers in sandbox:

- Visa: 4032039847632978
- Mastercard: 5425459096544057
- Amex: 378282246310005

## Webhooks (Future Enhancement)

For production, consider PayPal webhooks to handle:

- Payment disputes/chargebacks
- Refunds
- Subscription billing events
- Account status changes

**Setup:** https://developer.paypal.com/dashboard/webhooks

Webhook events POST to your server with signatures for verification.

## Querying Order History

### Via API

```bash
GET /v2/checkout/orders/{order_id}
Authorization: Bearer {access_token}
```

Returns full order details including payment status, buyer info, timestamps.

### Via Dashboard

- Sandbox: https://www.sandbox.paypal.com/
- Production: https://www.paypal.com/

View transactions, download reports, issue refunds.

## Production Checklist

- [ ] Replace sandbox credentials with production credentials
- [ ] Set `PAYPAL_ENV=production` in `.env`
- [ ] Verify HTTPS on production domain
- [ ] Test with real PayPal account (small amount)
- [ ] Set up webhook endpoints for order updates
- [ ] Implement error monitoring/logging
- [ ] Add refund functionality if needed
- [ ] Review PayPal's acceptable use policy
- [ ] Configure return/cancel URLs (optional)
- [ ] Test all payment methods (PayPal, Venmo, cards)

## Performance Optimization

Reference: https://developer.paypal.com/sdk/js/performance/

**Current Implementation:**

- Dynamic SDK loading via `@paypal/paypal-js`
- Loads on component mount
- ~100KB gzipped SDK size

**Optimizations to Consider:**

- Preconnect to PayPal domains
- Lazy load button component
- Cache access tokens (if high volume)
- Use `data-sdk-integration-source` for attribution

## References

- **Orders API:** https://developer.paypal.com/docs/api/orders/v2/
- **SDK Reference:** https://developer.paypal.com/sdk/js/reference/
- **Dashboard:** https://developer.paypal.com/dashboard/
- **Status Codes:** https://developer.paypal.com/api/rest/responses/

## Current Limitations

1. **No order persistence** - Orders only exist in PayPal (by design)
2. **No refund handling** - Implement via PayPal API if needed
3. **No webhook integration** - Add for production reliability
4. **No shipping calculation** - Static cart, no address-based shipping
5. **No tax calculation** - Add if required for your jurisdiction
6. **Apple Pay/Google Pay not implemented** - See integration guide below

---

## Apple Pay Integration Guide

If you want to add Apple Pay support, follow this comprehensive guide. This is a **separate integration** from the standard buttons.

### Step 1: Prerequisites & Setup

#### 1.1 Enable Apple Pay in PayPal Dashboard

**Sandbox:**

1. Log into [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Go to **Apps & Credentials** → **Sandbox**
3. Select your app
4. Scroll to **Features** → Enable **Apple Pay** checkbox → Save

**Production:** Complete [Apple Pay onboarding](https://www.paypal.com/bizsignup/add-product?product=payment_methods&capabilities=APPLE_PAY)

#### 1.2 Download Domain Association File

**Sandbox:**

```bash
curl -O https://paypalobjects.com/devdoc/apple-pay/sandbox/apple-developer-merchantid-domain-association
```

**Production:**

```bash
curl -O https://paypalobjects.com/devdoc/apple-pay/well-known/apple-developer-merchantid-domain-association
```

Host at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`

**CRITICAL:**

- Serve with `Content-Type: application/octet-stream`
- Must be HTTPS (not HTTP)
- No redirects (no 3XX status codes)
- Not behind authentication/firewall
- Remove file extension when hosting

#### 1.3 Register Your Domain

1. PayPal Developer Dashboard → Apps & Credentials → Your App
2. Features → Apple Pay → **Manage** button
3. **Add Domain** → Enter `yourdomain.com`
4. Click **Register Domain**

Register ALL domains/subdomains that will show Apple Pay button:

- `example.com`
- `checkout.example.com`
- `www.example.com`

#### 1.4 Create Apple Sandbox Account (Testing Only)

1. Create [Apple Developer account](https://developer.apple.com/)
2. Create [Apple Sandbox account](https://developer.apple.com/apple-pay/sandbox-testing/)
3. Add test cards to Apple Wallet on iOS device

### Step 2: Code Implementation

#### 2.1 Load Required SDKs

Add to `app.html` or component:

```html
<!-- Apple Pay JS SDK -->
<script src="https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js"></script>
```

#### 2.2 Create ApplePayButton Component

Create `src/lib/components/ApplePayButton.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { loadScript } from "@paypal/paypal-js";
  import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';
  import { getItems, emptyCart } from '$lib/cart.svelte';

  let showButton = false;
  let errorMessage = '';

  onMount(async () => {
    if (!browser) return;

    // Check if device supports Apple Pay
    if (!window.ApplePaySession) {
      console.log('This device does not support Apple Pay');
      return;
    }

    if (!ApplePaySession.canMakePayments()) {
      console.log('This device is not capable of making Apple Pay payments');
      return;
    }

    try {
      // Load PayPal SDK with Apple Pay component
      const paypal = await loadScript({
        clientId: PUBLIC_PAYPAL_CLIENT_ID,
        components: "applepay",
        currency: "USD"
      });

      if (!paypal?.Applepay) {
        throw new Error('PayPal Applepay component not available');
      }

      // Check merchant eligibility
      const applepay = paypal.Applepay();
      const config = await applepay.config();

      if (config.isEligible) {
        showButton = true;
        setupApplePayButton(applepay, config);
      } else {
        console.log('Merchant not eligible for Apple Pay');
      }
    } catch (error) {
      console.error('Failed to initialize Apple Pay:', error);
      errorMessage = 'Apple Pay unavailable';
    }
  });

  function setupApplePayButton(applepay: any, config: any) {
    const button = document.getElementById('applepay-btn');
    if (!button) return;

    button.addEventListener('click', async () => {
      try {
        await startApplePaySession(applepay, config);
      } catch (error) {
        console.error('Apple Pay error:', error);
        alert('Apple Pay payment failed. Please try another method.');
      }
    });
  }

  async function startApplePaySession(applepay: any, config: any) {
    const items = getItems();
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create Apple Pay payment request
    const paymentRequest = {
      countryCode: config.countryCode,
      merchantCapabilities: config.merchantCapabilities,
      supportedNetworks: config.supportedNetworks,
      currencyCode: "USD",
      requiredShippingContactFields: ["name", "phone", "email", "postalAddress"],
      requiredBillingContactFields: ["postalAddress"],
      total: {
        label: "Little Bitta Granola",
        type: "final",
        amount: total.toFixed(2)
      }
    };

    // Create Apple Pay session (must be in user gesture handler)
    const session = new ApplePaySession(4, paymentRequest);

    // Handle merchant validation
    session.onvalidatemerchant = async (event: any) => {
      try {
        const validateResult = await applepay.validateMerchant({
          validationUrl: event.validationURL,
          displayName: "Little Bitta Granola"
        });
        session.completeMerchantValidation(validateResult.merchantSession);
      } catch (error) {
        console.error('Merchant validation failed:', error);
        session.abort();
      }
    };

    // Handle payment authorization
    session.onpaymentauthorized = async (event: any) => {
      try {
        // Create order on backend
        const orderResponse = await fetch("/api/order", {
          method: "POST",
          body: JSON.stringify({ items }),
          headers: { "Content-Type": "application/json" }
        });
        const orderData = await orderResponse.json();

        // Confirm order with Apple Pay token
        await applepay.confirmOrder({
          orderId: orderData.id,
          token: event.payment.token,
          billingContact: event.payment.billingContact
        });

        // Capture payment
        const captureResponse = await fetch(`/api/capture`, {
          method: "POST",
          body: JSON.stringify({ orderID: orderData.id }),
          headers: { "Content-Type": "application/json" }
        });
        const captureData = await captureResponse.json();

        if (captureData.status === 'COMPLETED') {
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
          emptyCart();
          window.location.href = `/order-success?id=${orderData.id}`;
        } else {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          alert('Payment failed');
        }
      } catch (error) {
        console.error('Payment authorization failed:', error);
        session.completePayment(ApplePaySession.STATUS_FAILURE);
      }
    };

    // Handle cancellation
    session.oncancel = () => {
      console.log('Apple Pay cancelled by user');
    };

    // Start the session
    session.begin();
  }
</script>

{#if showButton}
  <apple-pay-button id="applepay-btn" buttonstyle="black" type="buy" locale="en"></apple-pay-button>
{/if}

{#if errorMessage}
  <p class="error">{errorMessage}</p>
{/if}

<style>
  apple-pay-button {
    --apple-pay-button-width: 100%;
    --apple-pay-button-height: 48px;
    --apple-pay-button-border-radius: 4px;
    --apple-pay-button-padding: 0px 0px;
    --apple-pay-button-box-sizing: border-box;
  }

  .error {
    color: red;
    font-size: 0.875rem;
  }
</style>
```

#### 2.3 Add to Cart Page

In `src/routes/cart/+page.svelte`:

```svelte
<script>
  import PaymentGwy from '$lib/components/PaymentGwy.svelte';
  import ApplePayButton from '$lib/components/ApplePayButton.svelte';
  // ... existing imports
</script>

<!-- Existing cart UI -->

<div class="payment-buttons">
  <!-- Apple Pay (shows only on eligible devices) -->
  <ApplePayButton />

  <!-- Standard PayPal/Venmo/Card buttons -->
  <PaymentGwy />
</div>
```

### Step 3: TypeScript Types

Update `src/app.d.ts`:

```typescript
declare global {
  interface Window {
    paypal?: PayPalNamespace;
    ApplePaySession?: typeof ApplePaySession;
  }

  // Apple Pay types
  class ApplePaySession {
    static readonly STATUS_SUCCESS: number;
    static readonly STATUS_FAILURE: number;
    static canMakePayments(): boolean;
    static canMakePaymentsWithActiveCard(
      merchantIdentifier: string,
    ): Promise<boolean>;

    constructor(version: number, paymentRequest: ApplePayPaymentRequest);

    begin(): void;
    abort(): void;
    completeMerchantValidation(merchantSession: any): void;
    completePayment(status: number): void;

    onvalidatemerchant: (event: any) => void;
    onpaymentauthorized: (event: any) => void;
    oncancel: () => void;
  }

  interface ApplePayPaymentRequest {
    countryCode: string;
    currencyCode: string;
    merchantCapabilities: string[];
    supportedNetworks: string[];
    total: {
      label: string;
      type: string;
      amount: string;
    };
    requiredShippingContactFields?: string[];
    requiredBillingContactFields?: string[];
  }
}

export {};
```

### Step 4: Testing

#### Local Testing (Sandbox)

1. **Deploy to HTTPS domain** - Apple Pay will NOT work on `localhost:5173`
2. Use services like:
   - Vercel (free tier with auto-HTTPS)
   - Netlify (free tier with auto-HTTPS)
   - ngrok (tunnel with HTTPS)

#### Testing on iOS Device

1. Log into iTunes Connect sandbox tester account
2. Open Safari on iOS device
3. Navigate to your HTTPS site
4. Click Apple Pay button
5. Authenticate with Face ID/Touch ID
6. Complete test purchase

#### Testing on macOS

1. Safari on macOS 10.14.1+
2. Apple Pay configured in System Preferences
3. Navigate to your HTTPS site
4. Click Apple Pay button
5. Authenticate with Touch ID/password

### Step 5: Production Deployment

1. **Complete onboarding:** [Apple Pay Production Onboarding](https://www.paypal.com/bizsignup/add-product?product=payment_methods&capabilities=APPLE_PAY)
2. **Update environment variables:**
   ```bash
   PAYPAL_ENV=production
   PAYPAL_CLIENT_ID=<production-client-id>
   PAYPAL_CLIENT_SECRET=<production-secret>
   ```
3. **Download production domain association file**
4. **Register production domain** in PayPal Dashboard (Live environment)
5. **Test with real PayPal account** (small transaction)
6. **Monitor transactions** in PayPal production dashboard

### Common Issues & Troubleshooting

**"This device does not support Apple Pay"**

- Solution: Use Safari on iOS/macOS, or latest Chrome

**"Must create ApplePaySession from a user gesture handler"**

- Solution: Ensure `new ApplePaySession()` is inside click handler

**Domain registration fails**

- Check domain association file is accessible
- Verify HTTPS (not HTTP)
- Ensure `Content-Type: application/octet-stream`
- Check no authentication/firewall blocking

**"Merchant validation failed"**

- Domain not registered in PayPal Dashboard
- Domain association file missing or wrong location
- Using HTTP instead of HTTPS

**Apple Pay button doesn't appear**

- Device doesn't support Apple Pay
- `config.isEligible` returned false
- Check PayPal Dashboard has Apple Pay enabled

### Supported Countries & Currencies

**Countries (34):** Australia, Austria, Belgium, Bulgaria, Canada, China, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hong Kong, Hungary, Ireland, Italy, Japan, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Singapore, Slovakia, Slovenia, Spain, Sweden, United States, United Kingdom

**Currencies (22):** AUD, BRL, CAD, CHF, CZK, DKK, EUR, GBP, HKD, HUF, ILS, JPY, MXN, NOK, NZD, PHP, PLN, SEK, SGD, THB, TWD, USD

---

## Google Pay Integration Guide

Google Pay integration follows a similar pattern to Apple Pay but with different APIs.

### Step 1: Prerequisites

1. **Enable Google Pay** in PayPal Dashboard (similar to Apple Pay)
2. **HTTPS domain** required
3. **Google Pay Business Console** setup
4. **Domain verification** with Google

### Step 2: Implementation Overview

Google Pay requires:

- Loading PayPal SDK with `components: "googlepay"`
- Using `paypal.Googlepay()` API
- Creating Google Pay payment request
- Handling payment data response

**Note:** Google Pay integration is similar in complexity to Apple Pay. The full implementation would require an additional ~200-300 lines of code following Google's payment API specifications.

### Key Differences from Apple Pay

- Uses Google Pay API instead of Apple Pay JS
- Different button styling (`<gpay-button>`)
- Chrome browser primary support (works on Android/Desktop)
- Different payment request structure
- Different callback flow

### Reference Documentation

- [PayPal Google Pay Docs](https://developer.paypal.com/docs/checkout/apm/google-pay/)
- [Google Pay Web Integration](https://developers.google.com/pay/api/web/guides/tutorial)

---

## Recommendation: Standard Buttons vs Apple/Google Pay

### Current Implementation (Standard Buttons)

✅ **Pros:**

- Simple, clean code (~100 lines)
- Supports PayPal, Venmo, Cards
- Works on localhost
- No domain verification needed
- Covers 95% of users
- Easy to maintain

❌ **Cons:**

- No Apple Pay button
- No Google Pay button

### With Apple Pay + Google Pay

✅ **Pros:**

- Premium payment experience
- May increase conversion on iOS/Android
- Brand recognition

❌ **Cons:**

- 3-5x more code (~400-500 total lines)
- Requires HTTPS (no localhost testing)
- Domain verification complexity
- Separate button implementations
- More testing surface area
- Maintenance overhead
- Sandbox testing requires Apple/Google accounts

### Decision Framework

**Choose Standard Buttons (current) if:**

- Building MVP or prototype
- Want simple, maintainable code
- Don't have HTTPS for testing
- Users can pay with PayPal/Venmo/Cards
- Time-to-market is priority

**Add Apple/Google Pay if:**

- iOS/Android user base is significant
- Premium checkout experience is required
- Resources available for complex integration
- HTTPS infrastructure in place
- Can maintain separate payment flows
- Analytics show drop-off at payment step
