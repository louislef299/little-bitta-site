<!--
  Stripe Payment Integration
  Supports: Cards, Cash App, Apple Pay, Google Pay
  https://docs.stripe.com/payments/accept-a-payment
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Elements, PaymentElement } from 'svelte-stripe';
  import { getItems, emptyCart } from '$lib/cart.svelte';
  import { loadStripeSDK } from '$lib/payments/stripe-sdk.svelte';
  import type { Stripe, StripeElements } from '@stripe/stripe-js';

  let stripe: Stripe | null = null;
  let elements: StripeElements;
  let clientSecret: string = '';
  let errorMessage = '';
  let processing = false;

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

  // Handle payment submission
  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe not initialized');
      return;
    }

    if (processing) return;

    try {
      processing = true;
      errorMessage = '';

      // Confirm the payment
      const { error: submitError } = await elements.submit();
      if (submitError) {
        errorMessage = submitError.message || 'Payment submission failed';
        processing = false;
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
        redirect: 'if_required', // Only redirect if needed (e.g., 3D Secure)
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        errorMessage = error.message || 'Payment failed';
        processing = false;
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('Payment succeeded!');
        emptyCart();
        window.location.href = `/order-success?id=${paymentIntent.id}`;
      } else if (paymentIntent?.status === 'requires_action') {
        // This shouldn't happen with redirect: 'if_required', but handle it anyway
        errorMessage = 'Payment requires additional authentication';
        processing = false;
      } else {
        errorMessage = `Unexpected payment status: ${paymentIntent?.status}`;
        processing = false;
      }
    } catch (error) {
      console.error('Payment error:', error);
      errorMessage = error instanceof Error ? error.message : 'Payment failed';
      processing = false;
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

      // Create payment intent for this session
      clientSecret = await createPaymentIntent();
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

{#if stripe && clientSecret}
  <div class="payment-container">
    <form on:submit={handleSubmit}>
      <Elements
        {stripe}
        {clientSecret}
        bind:elements
        theme="stripe"
        variables={{ colorPrimary: '#aa03f8' }}
        rules={{ '.Input': { border: '1px solid #e0e0e0' } }}
      >
        <PaymentElement
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </Elements>

      <button type="submit" disabled={processing} class="pay-button">
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  </div>
{:else if !errorMessage}
  <div class="loading-message">
    Loading payment options...
  </div>
{/if}

<style>
  .payment-container {
    position: relative;
    z-index: 1;
  }

  .payment-container :global(*) {
    z-index: 1 !important;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .error-message {
    color: #dc3545;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid #dc3545;
    border-radius: 4px;
    background-color: #f8d7da;
  }

  .loading-message {
    color: #666;
    padding: 1rem;
    text-align: center;
    font-style: italic;
  }

  .pay-button {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background-color: #aa03f8;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 0.5rem;
  }

  .pay-button:hover:not(:disabled) {
    background-color: #8c02c9;
  }

  .pay-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
</style>
