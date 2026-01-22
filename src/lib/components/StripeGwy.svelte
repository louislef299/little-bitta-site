<!--
  Stripe Payment Integration
  Supports: Cards, Cash App, Apple Pay, Google Pay
  https://docs.stripe.com/payments/accept-a-payment

  https://docs.stripe.com/payments/elements

  https://docs.stripe.com/elements/express-checkout-element#supported-browsers
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadStripeInstance } from '$lib/payments/stripe-sdk.svelte';
  import { getItems } from '$lib/cart/cart.svelte';
  import type { 
    LoadActionsSuccess, Appearance, StripeCheckout 
  } from '@stripe/stripe-js';
  import { isDark } from '$lib/toggle.svelte';
  import { browser } from '$app/environment';

  let actions: LoadActionsSuccess | null = null;
  let checkout: StripeCheckout | null = null;
  let errorMessage = $state('');
  let stripeTotal: string = $state("");
  let email: string = $state("");
  let paymentStatus: string = $state("Payment Method Loading");
  let buttonStatus: string = $state("Pay Now");
  let buttonDisabled: boolean = $state(false);

  function getAppearance(): Appearance {
    return {
      theme: isDark() ? 'night' : 'stripe',
    };
  }

  async function fetchClientSecret(): Promise<string> {
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

    return data.clientSecret;
  }

  console.debug(`[StripeGwy] Component instantiated; is browser: ${browser}`);
  onMount(() => {
    console.debug('[StripeGwy] onMount called');
    (async () => {
      // Access the global Stripe loaded from script tag
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
          // todo: https://docs.stripe.com/payments/paypal
          paymentMethodOrder: [
            'apple_pay', 'google_pay', 'amazon_pay',
            'card', 'cashapp', 'klarna',
          ]
        });
        paymentElement.mount('#payment-element');

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

        checkout.loadActions().then(function(result) {
          if (result.type === 'success') {
            // Use the actions object to interact with the Checkout Session
            actions = result.actions;
            var session = actions?.getSession();
            if (session != undefined) {
              stripeTotal = session.total.total.amount;
            } else {
              console.error("session was undefined")
              stripeTotal = "undefined"
            }
          } else {
            console.error(`[StripeGwy] Could not load checkout actions: ${result.error}`);
          }
        })
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Failed to load checkout";
        console.error("[StripeGwy] Checkout init failed:", error);
      }
    })();

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

    
    const session = actions.getSession();
    console.debug('Session email:', session.email);
    if (!session.email && email) {
      await actions.updateEmail(email);
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
    <div id="payment-method">{paymentStatus}</div>
    <div id="payment-element">
      <!--Stripe.js injects the Payment Element-->
    </div>
    <button id="submit" onclick={handlePayment} disabled={buttonDisabled}>
      <div class="spinner hidden" id="spinner"></div>
      <span id="button-text">{buttonStatus}</span>
    </button>
    {#if errorMessage}
      <div id="payment-message">{errorMessage}</div>
    {/if}
  </form>
</div>

<style>
  .stripe-checkout {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  #payment-form {
    margin-left: auto;
  }

  #payment-method {
    padding-top: 1em;
    padding-bottom: 1em;
  }

  #submit {
    padding: 1em;
    margin-top: 1rem;
  }

  #submit:disabled {
    color: #6b7280;
    cursor: not-allowed;
    opacity: 0.6;
  }

  #calculated-total {
		font-size: 1.5rem;
		font-weight: 600;
    flex: 1;
		position: sticky;
		top: 5rem;
		z-index: 10;
		background-color: var(--bg-color);
		padding: 0.5rem 0;
	}
</style>
