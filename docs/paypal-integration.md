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
- Render payment buttons (PayPal, Venmo, Apple Pay, Google Pay)
- Orchestrate order creation and capture flow

**Key Configuration:**
```typescript
loadScript({
  clientId: PUBLIC_PAYPAL_CLIENT_ID,  // Public - safe to expose
  components: "buttons",
  currency: "USD",
  enableFunding: ["venmo", "applepay"],
  disableFunding: "paylater"
})
```

**Payment Flow:**
1. `createOrder()` - Calls `/api/order` with cart items, returns PayPal order ID
2. PayPal SDK handles buyer authentication/approval
3. `onApprove()` - Calls `/api/capture` to finalize payment

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
  "intent": "CAPTURE",  // Immediate payment vs AUTHORIZE (later capture)
  "purchase_units": [{
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
    "items": [{
      "name": "Product Name",
      "quantity": "1",
      "unit_amount": {
        "currency_code": "USD",
        "value": "25.00"
      }
    }]
  }]
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
- `item_total` must exactly match sum of items * quantity
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

### Automatic Detection
PayPal Buttons automatically render eligible payment methods based on:
- Buyer's location (Venmo = US only)
- Device type (Apple Pay = Safari/iOS, Google Pay = Chrome/Android)
- Browser capabilities
- Account setup

### Configuration
```typescript
enableFunding: ["venmo", "applepay", "googlepay"]  // Opt-in
disableFunding: ["paylater", "card"]               // Opt-out
```

**Available Methods:**
- `paypal` - Always available
- `venmo` - US mobile only
- `applepay` - Safari/iOS with Apple Pay configured, HTTPS required
- `googlepay` - Chrome/Android with Google Pay
- `paylater` - Buy now pay later options
- `card` - Guest card payments

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
