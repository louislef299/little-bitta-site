<!--
  Stripe Payment Integration
  Supports: Cards, Cash App, Apple Pay, Google Pay
  https://docs.stripe.com/payments/accept-a-payment

  https://docs.stripe.com/payments/elements

  https://docs.stripe.com/elements/express-checkout-element#supported-browsers
-->
<script lang="ts">
  import { PUBLIC_STRIPE_KEY } from '$env/static/public';
  import { getItems } from '$lib/cart/cart.svelte';

  // Create payment intent on backend
  async function createPaymentIntent() {
    const response = await fetch("/api/stripe/checkout-session", {
      method: "POST",
      body: JSON.stringify({ items: getItems() }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();
    console.log('Checkout session created:', data.clientSecret);
    return data.clientSecret;
  }
</script>

<div class="stripe-checkout">
  <form id="payment-form">
    <label>
      Email
      <input type="email" id="email"
    /></label>
    <div id="email-errors"></div>
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
