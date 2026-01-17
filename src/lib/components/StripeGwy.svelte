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
      const cs = await fetchClientSecret();
      const checkout = await stripe.initCheckout({ 
        clientSecret: cs,
      });
      const paymentElement = checkout.createPaymentElement({
        layout: "tabs",
        paymentMethodOrder: [
          'apple_pay', 'google_pay', 'amazon_pay', 
          'cash_app_pay', 'card', 'klarna',
        ]
      });
      paymentElement.mount('#payment-element');
    });
  </script>

<div class="stripe-checkout">
  <form id="payment-form">
    <h4>Payment</h4>
    <div id="payment-element">
      <!--Stripe.js injects the Payment Element-->
    </div>
    <button id="submit">
      <div class="spinner hidden" id="spinner"></div>
      <span id="button-text">Pay now</span>
    </button>
    <div id="payment-message" class="hidden"></div>
  </form>
</div>

<style>
  #submit {
    padding: 1em;
    margin-top: 1rem;
  }
</style>
