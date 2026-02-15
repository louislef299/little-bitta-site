<!--
  PayPal/Venmo Payment Integration

  Resources:
  - https://developer.paypal.com/sdk/js/
  - https://developer.paypal.com/docs/api/orders/v2/
  - https://developer.paypal.com/sdk/js/performance/

  is there a way to smart cache these libs?
  The script "https://www.paypal.com/sdk/js?client-id=AaVahctsdoWll9kbLmqaj3pCtOXdjUgLUGWk2NMYaZWZe778sbAZ23FY3m0ZxIysxYsGaPXSwiW3dZQx&components=buttons&currency=USD&enable-funding=venmo&disable-funding=paylater,card,credit" failed to load. Check the HTTP status code and response body in DevTools to learn more.
-->
<script lang="ts">
  import { loadScript, type PayPalNamespace } from '@paypal/paypal-js';
  import { onMount } from 'svelte';
  import { getItems, emptyCart } from '$lib/cart/cart.svelte';
  import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';

  let errorMessage = $state('');
  let loading = $state(true);

  onMount(async () => {
    try {
      const paypal: PayPalNamespace | null = await loadScript({
        clientId: PUBLIC_PAYPAL_CLIENT_ID,
        components: 'buttons',
        currency: 'USD',
        enableFunding: ['venmo'],
        disableFunding: ['paylater', 'card', 'credit'],
      });

      if (!paypal?.Buttons) {
        errorMessage = 'Failed to load PayPal SDK';
        loading = false;
        return;
      }

      await paypal.Buttons({
        createOrder: async () => {
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            body: JSON.stringify({ items: getItems() }),
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message ?? `Order creation failed: ${response.status}`);
          }

          const order = await response.json();
          return order.id;
        },
        onApprove: async (data) => {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            body: JSON.stringify({ orderID: data.orderID }),
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            errorMessage = data.message ?? 'Payment capture failed';
            return;
          }

          const result = await response.json();
          if (result.status === 'COMPLETED') {
            emptyCart();
            window.location.href = `/order-success?paypal_order_id=${data.orderID}`;
          } else {
            errorMessage = `Payment status: ${result.status}`;
          }
        },
        onError: (err) => {
          console.error('[PayPalGwy] Button error:', err);
          const msg = err instanceof Error ? err.message : String(err);
          errorMessage = `PayPal error: ${msg}`;
        },
        onCancel: () => {
          errorMessage = '';
        },
        style: {
          layout: 'vertical',
          color: 'blue',
          tagline: false,
        },
      }).render('#paypal-button-container');

      loading = false;
    } catch (error) {
      console.error('[PayPalGwy] Failed to load PayPal SDK:', error);
      errorMessage = error instanceof Error ? error.message : 'Failed to load PayPal';
      loading = false;
    }
  });
</script>

<div class="paypal-checkout">
  {#if errorMessage}
    <div class="payment-message">{errorMessage}</div>
  {/if}
  {#if loading}
    <p>Loading PayPal...</p>
  {/if}
  <div id="paypal-button-container"></div>
</div>

<style>
  .paypal-checkout {
    width: 100%;
    z-index: 50;
  }

  .payment-message {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  #paypal-button-container {
    min-height: 45px;
  }
</style>
