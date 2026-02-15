<!--
  Stripe Payment Integration

  Resources:
  - https://docs.stripe.com/payments/accept-a-payment
  - https://docs.stripe.com/payments/elements
  - https://docs.stripe.com/elements/express-checkout-element#supported-browsers
  - https://docs.stripe.com/js/custom_checkout/init
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStripeInstance } from '$lib/payments/stripe-sdk.svelte';
  import { getItems, getCartHash, getCheckoutCacheKey } from '$lib/cart/cart.svelte';
  import type { 
    LoadActionsSuccess, Appearance, StripeCheckout 
  } from '@stripe/stripe-js';
  import { isDark } from '$lib/toggle.svelte';
  import { browser } from '$app/environment';

  let { stripeTotal = $bindable("") }: { stripeTotal?: string } = $props();

  let actions: LoadActionsSuccess | null = null;
  let checkout: StripeCheckout | null = null;
  let errorMessage = $state('');
  let email: string = $state("");
  let paymentStatus: string = $state("Payment Method Loading");
  let buttonStatus: string = $state("Pay Now");
  let buttonDisabled: boolean = $state(false);
  let lineItemMapping: Record<number, string> = {};

  let validateTimeout: ReturnType<typeof setTimeout>;

  function getAppearance(): Appearance {
    return {
      theme: isDark() ? 'night' : 'stripe',
    };
  }

  interface CheckoutCache {
    clientSecret: string;
    cartHash: string;
    lineItemMapping: Record<number, string>; 
  }

  async function validateLocation(address: any) {
    var previousMsg = buttonStatus;
    buttonStatus = "Validating Location...";
    try {
      const response = await fetch('/api/location-check', {
        method: 'POST',
        body: JSON.stringify(address),
        headers: { 'content-type': 'application/json' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        errorMessage = data.message ?? "Location not supported";
        buttonDisabled = true;
      } else {
        errorMessage = '';
        buttonDisabled = false;
      }
    } catch (e) {
      errorMessage = "Failed to validate location";
    } finally {
      buttonStatus = previousMsg;
    }
  }

  async function fetchClientSecret(): Promise<string> {
    const currentHash = getCartHash();
    const cacheKey = getCheckoutCacheKey();

    // Check cache first
    if (browser) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { 
            clientSecret, cartHash,
          } = JSON.parse(cached) as CheckoutCache;
          if (cartHash === currentHash) {
            console.debug('[StripeGwy] Using cached checkout session');
            return clientSecret;
          }
        } catch (e) {
          console.debug('[StripeGwy] Invalid cache, fetching new session');
        }
      }
    }

    // Fetch new session
    const response = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      body: JSON.stringify({ items: getItems() }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message ?? `Checkout failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.clientSecret || typeof data.clientSecret !== "string") {
      throw new Error("Invalid client secret received");
    }

    // Capture current lineItemMap
    lineItemMapping = data.lineItemMapping;

    // Cache the new session
    if (browser) {
      localStorage.setItem(cacheKey, JSON.stringify({
        clientSecret: data.clientSecret,
        cartHash: currentHash,
        lineItemMapping: data.lineItemMapping,
      }));
      console.debug('[StripeGwy] Cached new checkout session');
    }

    return data.clientSecret;
  }

  async function initStripeCheckout(retried = false) {
    try {
      const stripe = await loadStripeInstance();
      console.debug("[StripeGwy] Attempting to initiate checkout session")
      checkout = await stripe.initCheckout({
        clientSecret: fetchClientSecret(),
        elementsOptions: {
          appearance: getAppearance()
        }
      });

      const paymentElement = checkout.createPaymentElement({
        layout: "tabs",
        // https://docs.stripe.com/api/payment_methods/object#payment_method_object-type
        paymentMethodOrder: [
          'apple_pay', 'google_pay', 'amazon_pay',
          'card', 'cashapp', 'klarna',
        ],
        wallets: {
          applePay: 'auto',
          googlePay: 'auto',
          link: 'auto'
        }
      });
      paymentElement.mount('#payment-element');

      // https://docs.stripe.com/js/custom_checkout/create_billing_address_element
      const billingElement = checkout.createBillingAddressElement();
      billingElement.mount('#billing-element');
      billingElement.on('change', (event: any) => {
        if (event.complete) {
          clearTimeout(validateTimeout);
          validateTimeout = setTimeout(() => validateLocation(event.value.address), 300);
        }
        if (event.error) {
          errorMessage = event.error.message;
        }
      });

      // the clover API method isn't typed in @stripe/stripe-js
      const emailElement = (checkout as any).createEmailElement();
      emailElement.mount('#email-element');
      emailElement.on('change', (event: any) => {
        // The element might auto-sync, but capture the value if needed
        if (event.value?.email) {
          email = event.value.email;
        }
        if (event.error) {
          errorMessage = event.error.message;
        }
      });

      // https://docs.stripe.com/js/custom_checkout/session_object
      const result = await checkout.loadActions();
      if (result.type === 'success') {
        // Use the actions object to interact with the Checkout Session
        actions = result.actions;
        const session = actions?.getSession();
        if (session != undefined) {
          stripeTotal = session.total.total.amount;
        } else {
          console.error("[StripeGwy] Session was undefined")
          stripeTotal = "undefined"
        }
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      // Clear stale cached session
      if (browser) {
        localStorage.removeItem(getCheckoutCacheKey());
      }

      if (!retried) {
        console.debug('[StripeGwy] Retrying with fresh session');
        return initStripeCheckout(true);
      }

      errorMessage = error instanceof Error ? error.message : "Failed to load checkout";
      console.error("[StripeGwy] Checkout init failed after retry:", error);
    }
  }

  console.debug(`[StripeGwy] Component instantiated; is browser: ${browser}`);
  onMount(() => {
    console.debug('[StripeGwy] onMount called');
    initStripeCheckout();

    return () => {
      console.debug('[StripeGwy] Component unmounting');
    };
  });

  async function handlePayment() {
    buttonDisabled = true;
    if (!actions) {
      buttonStatus = "Stripe actions is invalid";
      return;
    }
    buttonStatus = 'Processing...';

    // https://docs.stripe.com/js/custom_checkout/session_object
    var session = actions.getSession();
    if (!session.email && email) {
      await actions.updateEmail(email);
      console.debug('Session email updated to:', session.email);
    }

    if (session.billingAddress) {
      console.debug(`here is the billing address: ${session.billingAddress}`);
    } else {
      console.error('there was no billing address');
    }

    // https://docs.stripe.com/js/custom_checkout/update_line_item_quantity
    // Update all line items in parallel
    const updatePromises = getItems().map(item => {
      const stripeLineItemId = lineItemMapping[item.id];
      if (!stripeLineItemId) {
        console.error(`No Stripe lineItem found for OrderItem ${item.id}`);
        return null;
      }
      return actions?.updateLineItemQuantity({
        lineItem: stripeLineItemId,
        quantity: item.quantity
      });
    }).filter(Boolean);
    const results = await Promise.all(updatePromises);
  
    // Check for any errors
    const errorResult = results.find(r => r?.type === 'error');
    if (errorResult) {
      console.error(`[StripeGwy] Could not update line items(${errorResult.error.code}): ${errorResult.error.message}`)
      errorMessage = errorResult.error.message;
      buttonStatus = "Pay Now";
      buttonDisabled = false;
      return;
    }
  
    errorMessage = '';
    const result = await actions.confirm();
    if (result.type === 'error') {
      errorMessage = result.error.message;
      buttonStatus = "Pay Now";
    } else {
      buttonStatus = 'Success!';
    }
    buttonDisabled = false;
  }
</script>

{#if errorMessage}
  <div class="payment-message">{errorMessage}</div>
{/if}

<form id="payment-form">
  <!--Stripe.js injects the Elements-->
  <div id="payment-method">{paymentStatus}</div>
  <div id="payment-element"></div>
  <div id="email-element"></div>
  <div id="billing-element"></div>

  <!-- the Pay Now button -->
  <button id="submit" onclick={handlePayment} disabled={buttonDisabled}>
    <div class="spinner hidden" id="spinner"></div>
    <span id="button-text">{buttonStatus}</span>
  </button>
</form>

<style>
  .payment-message {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  #payment-method {
    padding-top: 1em;
    padding-bottom: 1em;
  }

  #submit {
    padding: 1em;
    margin-top: 1rem;
    display: block;
    margin-left: auto;
  }

  #submit:disabled {
    color: #6b7280;
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>
