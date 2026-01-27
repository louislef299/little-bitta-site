<script lang="ts">
  import { page } from '$app/state';
  import { emptyCart } from '$lib/cart/cart.svelte';
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';

  const orderID = $derived(page.url.searchParams.get('session_id') || '');
  let { data }: PageProps = $props();

  onMount(() => {
    emptyCart();
    // Clean up the URL (remove session_id query param)
    if (page.url.searchParams.has('session_id')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('session_id');
      history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search);
    }
  })
</script>

<div class="order-success">
  <div class="success-icon">😊</div>
  <h1>Payment Successful!</h1>

  <h2>Order Details</h2>
  {#if orderID}
    <div class="order-details">
      <p>
        <strong>Order ID:</strong> <br />
        {orderID}
      </p>
      <p class="info">
        A confirmation email will be sent to {data.customerEmail}. Thank you for
        your order.
      </p>
    </div>
  {:else}
    <p>
      There was an issue gathering your orderID, sorry. You should get an email
      receipt to {data.customerEmail} for your order, but if you have any
      issues, reach out to us over email!
    </p>
  {/if}
  <b>TODO: PROVIDE EMAIL ON FAILED ORDERID</b>

  <div class="actions">
    <a href="/shop" class="button primary">Continue Shopping</a>
  </div>
</div>

<style>
  .order-success {
    max-width: 600px;
    margin: 1rem auto;
    padding: 1rem;
    text-align: center;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    font-size: 4rem;
    line-height: 80px;
    margin: 0 auto 1rem;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  .order-details {
    border-radius: 8px;
    padding: 1rem;
    margin: 2rem 0;
    text-align: left;
  }

  .order-details p {
    margin: 0.5rem 0;
  }

  .info {
    font-size: 0.9rem;
    font-style: italic;
    margin-top: 1rem;
  }

  .actions {
    margin-top: 2rem;
  }
</style>
