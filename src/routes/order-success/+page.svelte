<script lang="ts">
  import { page } from '$app/state';
  import { emptyCart } from '$lib/cart/cart.svelte';
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';

  const orderID = $derived(
    page.url.searchParams.get('session_id')
    || page.url.searchParams.get('paypal_order_id')
    || ''
  );
  let { data }: PageProps = $props();

  onMount(() => {
    // Only empty cart on successful payment
    if (data.success) {
      emptyCart();
    }
    // Clean up the URL (remove order query params)
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('session_id');
    cleanUrl.searchParams.delete('paypal_order_id');
    if (cleanUrl.href !== window.location.href) {
      history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search);
    }
  })
</script>

{#if data.success}
  <!-- Success UI -->
  <div class="order-result success">
    <div class="icon">😊</div>
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
        issues, reach out to us at <a href="mailto:contact@example.com">contact@example.com</a>.
      </p>
    {/if}

    <div class="actions">
      <a href="/shop" class="button primary">Continue Shopping</a>
    </div>
  </div>
{:else}
  <!-- Failure UI -->
  <div class="order-result failure">
    <div class="icon">😞</div>
    <h1>Payment Failed</h1>

    <div class="error-details">
      <p class="error-message">
        {data.error || 'An error occurred while processing your payment.'}
      </p>

      <p class="info">
        Your payment could not be completed. This could happen for several reasons:
      </p>
      <ul class="reasons">
        <li>Insufficient funds</li>
        <li>Card declined by your bank</li>
        <li>Payment session expired</li>
        <li>Technical issue with payment processing</li>
      </ul>
    </div>

    <div class="actions">
      <a href="/cart" class="button primary">Return to Cart</a>
      <p class="contact-info">
        <!-- TODO: Update email with little bitta email -->
        Need help? Contact us at <a href="mailto:llefebvre@hammer-anvil.com">llefebvre@hammer-anvil.com</a>
      </p>
    </div>
  </div>
{/if}

<style>
  .order-result {
    max-width: 600px;
    margin: 1rem auto;
    padding: 1rem;
    text-align: center;
  }

  .icon {
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

  .order-details,
  .error-details {
    border-radius: 8px;
    padding: 1rem;
    margin: 2rem 0;
    text-align: left;
  }

  .order-details p,
  .error-details p {
    margin: 0.5rem 0;
  }

  .error-message {
    font-weight: 600;
    color: var(--color-error, #dc2626);
    margin-bottom: 1rem;
  }

  .reasons {
    text-align: left;
    margin: 1rem auto;
    max-width: 400px;
  }

  .reasons li {
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

  .contact-info {
    margin-top: 1rem;
    font-size: 0.9rem;
  }

  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
  }

  .button.primary {
    background-color: var(--color-primary, #5469d4);
    color: white;
  }

  .button.primary:hover {
    background-color: var(--color-primary-hover, #4051b5);
  }

  a {
    color: var(--color-link, #5469d4);
  }
</style>
