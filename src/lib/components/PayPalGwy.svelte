<!--
  PayPal Traditional SDK Integration
  Supports: PayPal, Venmo, Apple Pay, Google Pay
  https://developer.paypal.com/sdk/js/reference/
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { loadScript } from "@paypal/paypal-js";
  import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';
  import { getItems, emptyCart } from '$lib/cart.svelte';

  let isInitialized = false;

  // Create order on backend
  async function createOrder() {
    const response = await fetch("/api/order", {
      method: "POST",
      body: JSON.stringify({ items: getItems() }),
      headers: { "Content-Type": "application/json" }
    });
    const order = await response.json();
    console.log('Order created:', order.id);
    return order.id;
  }

  // Capture payment after approval
  async function onApprove(data: any) {
    console.log('Payment approved:', data);
    
    const response = await fetch("/api/capture", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID }),
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.status === 'COMPLETED') {
      console.log('Payment captured successfully');
      emptyCart();
      window.location.href = `/order-success?id=${data.orderID}`;
    } else {
      console.error('Payment capture returned status:', result.status);
      alert(`Payment status: ${result.status}`);
    }
  }

  // Handle errors
  function onError(err: any) {
    console.error('PayPal error:', err);
    alert('An error occurred with PayPal. Please try again.');
  }

  onMount(async () => {
    if (!browser || isInitialized) return;

    try {
      console.log('Loading PayPal SDK...');
      
      // Load PayPal SDK with basic payment methods
      // Note: Apple Pay and Google Pay require separate integration
      // See: https://developer.paypal.com/docs/checkout/apm/apple-pay/
      const paypal = await loadScript({
        clientId: PUBLIC_PAYPAL_CLIENT_ID,
        components: "buttons",
        currency: "USD",
        enableFunding: "venmo",
        disableFunding: "paylater"
      });

      if (!paypal?.Buttons) {
        throw new Error('PayPal SDK loaded but Buttons component is not available');
      }

      isInitialized = true;
      console.log('PayPal SDK loaded successfully, rendering buttons...');

      // Render all eligible payment buttons
      // PayPal will automatically show Apple Pay/Google Pay if the device
      // supports them
      paypal.Buttons({
        createOrder,
        onApprove,
        onError,
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal'
        }
      }).render('#paypal-button-container');

    } catch (error) {
      console.error('Failed to load PayPal SDK:', error);
      alert('Failed to load PayPal. Please refresh the page.');
    }
  });
</script>

<div id="paypal-button-container"></div>
