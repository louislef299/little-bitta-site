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
    import type { LoadActionsSuccess } from '@stripe/stripe-js';

    let actions: LoadActionsSuccess | null = null;
    let errorMessage = $state('');
    let stripeTotal: string = $state("");
    let email: string = $state("");

    async function fetchClientSecret() {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        body: JSON.stringify({ items: getItems() }),
        headers: { "Content-Type": "application/json" }
      });
      const { clientSecret } = await response.json();
      return clientSecret;
    }

    onMount(async () => {
      // Access the global Stripe loaded from script tag
      const stripe = await loadStripeInstance();
      const checkout = await stripe.initCheckout({ 
        clientSecret: fetchClientSecret(),
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
          var session = actions.getSession();
          stripeTotal = session.total.total.amount;
        }
      })
    });

    async function handlePayment() {
      if (!actions) return;
      
      const session = actions.getSession();
      console.debug('Session email:', session.email);
      if (!session.email && email) {
        await actions.updateEmail(email);
      }
    
      errorMessage = '';
      const result = await actions.confirm();
      if (result.type === 'error') {
        errorMessage = result.error.message;
      }
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
    <div id="payment-method">Payment Method</div>
    <div id="payment-element">
      <!--Stripe.js injects the Payment Element-->
    </div>
    <button id="submit" onclick={handlePayment}>
      <div class="spinner hidden" id="spinner"></div>
      <span id="button-text">Pay now</span>
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
