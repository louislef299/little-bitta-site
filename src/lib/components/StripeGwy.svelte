<!--
  Stripe Payment Integration
  Supports: Apple Pay, Google Pay
  https://docs.stripe.com/payments/accept-a-payment
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Elements, PaymentRequestButton } from 'svelte-stripe';
  import { getItems, emptyCart, getCartTotalInCents } from '$lib/cart.svelte';
  import { loadStripeSDK } from '$lib/payments/stripe-sdk.svelte';
  import type { Stripe, PaymentRequest, PaymentRequestOptions } from '@stripe/stripe-js';

  let stripe: Stripe | null = null;
  let paymentRequest: PaymentRequest | null = null;
  let paymentRequestOptions: PaymentRequestOptions | null = null;
  let canMakePayment = false;
  let errorMessage = '';

  // Create payment intent on backend
  async function createPaymentIntent() {
    const response = await fetch("/api/stripe/payment-intent", {
      method: "POST",
      body: JSON.stringify({ items: getItems() }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    console.log('Payment intent created:', data.clientSecret);
    return data.clientSecret;
  }

  // Handle payment method (Apple Pay, Google Pay, etc.)
  async function handlePaymentMethod(event: CustomEvent) {
    try {
      errorMessage = '';
      const { paymentMethod, complete } = event.detail;
      console.log('Payment method selected:', paymentMethod.type);

      // Create payment intent
      const clientSecret = await createPaymentIntent();

      // Confirm the payment
      if (!stripe) throw new Error('Stripe not loaded');

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        complete('fail');
        errorMessage = confirmError.message || 'Payment failed';
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('Payment succeeded!');
        complete('success');
        emptyCart();
        window.location.href = `/order-success?id=${paymentIntent.id}`;
      } else if (paymentIntent?.status === 'requires_action') {
        // Handle 3D Secure or other actions
        complete('fail');
        errorMessage = 'Payment requires additional authentication';
      } else {
        complete('fail');
        errorMessage = `Payment status: ${paymentIntent?.status}`;
      }
    } catch (error) {
      console.error('Payment error:', error);
      errorMessage = error instanceof Error ? error.message : 'Payment failed';
      event.detail.complete('fail');
    }
  }

  onMount(async () => {
    if (!browser) return;

    try {
      // Load Stripe SDK (may already be loaded)
      stripe = await loadStripeSDK();
      if (!stripe) {
        throw new Error('Stripe SDK not available');
      }

      // Create payment request for digital wallets
      const total = getCartTotalInCents();
      paymentRequestOptions = {
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Little Bitta Granola',
          amount: total,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      };
      paymentRequest = stripe.paymentRequest(paymentRequestOptions);

      // Check if Apple Pay, Google Pay, etc. are available
      const result = await paymentRequest.canMakePayment();
      canMakePayment = !!result;

      if (canMakePayment) {
        console.log('Digital wallet available:', result);
      } else {
        console.log('No digital wallets available on this device');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe payment:', error);
      errorMessage = 'Failed to initialize payment method';
    }
  });
</script>

{#if errorMessage}
  <div class="error-message">
    {errorMessage}
  </div>
{/if}

{#if stripe && paymentRequest && paymentRequestOptions && canMakePayment}
  <Elements {stripe}>
    <PaymentRequestButton
      paymentRequest={paymentRequestOptions}
      on:paymentmethod={handlePaymentMethod}
    />
  </Elements>
{:else if stripe && !canMakePayment}
  <div class="no-wallet-message">
    Apple Pay / Google Pay not available on this device
  </div>
{/if}

<style>
  .error-message {
    color: #dc3545;
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid #dc3545;
    border-radius: 4px;
    background-color: #f8d7da;
  }

  .no-wallet-message {
    color: #856404;
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    background-color: #fff3cd;
    text-align: center;
  }
</style>
