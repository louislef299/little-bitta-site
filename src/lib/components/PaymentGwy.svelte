<!--
  TODO: Ensure performance optimization is done before deployment
  https://developer.paypal.com/sdk/js/performance/
-->
<svelte:head>
  {#if browser}
    <script async src="https://www.sandbox.paypal.com/web-sdk/v6/core" 
      onload={() => onPayPalLoaded()}></script>
  {/if}
</svelte:head>

<script lang="ts">
  import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';
  import { setUpPayPalButton, captureOrder } from '$lib/paypal-ui.svelte'
  import { browser } from '$app/environment';

  // browser-side only
  async function onPayPalLoaded() {
    try {
      const sdkInstance = await window.paypal.createInstance({
        clientToken: PUBLIC_PAYPAL_CLIENT_ID,
        components: ["paypal-payments", "venmo-payments"],
        pageType: "checkout",
      });

      const paymentMethods = await sdkInstance.findEligibleMethods({
        currencyCode: "USD",
      });

      // Set up PayPal button if eligible
      if (paymentMethods.isEligible("paypal")) {
        setUpPayPalButton(sdkInstance);
      }

      const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove: captureOrder,
      });
    } catch (error) {
      console.error("Failed to load PayPal SDK:", error);
    }
  }
</script>

<div id="paypal-button-container"></div>
