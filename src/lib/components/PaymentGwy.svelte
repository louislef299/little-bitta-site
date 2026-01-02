<!--
  TODO: Ensure performance optimization is done before deployment
  https://developer.paypal.com/sdk/js/performance/
-->
<svelte:head>
  {#if browser}
    <script async src="https://www.sandbox.paypal.com/web-sdk/v6/core" 
      onload={() => { 
        window.dispatchEvent(new Event('paypal-sdk-loaded'));
      }}></script>
  {/if}
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { setUpPayPalButton, captureOrder } from '$lib/paypal-ui.svelte'
  import { browser } from '$app/environment';

  let isPayPalLoaded = false;

  // browser-side only
  async function onPayPalLoaded() {
    // Prevent multiple initializations
    if (isPayPalLoaded) {
      console.log('PayPal SDK already loaded, skipping...');
      return;
    }
    
    try {
      isPayPalLoaded = true;
      
      // Fetch client token from our API endpoint
      const response = await fetch('/api/paypal-client-token');
      if (!response.ok) {
        throw new Error(`Failed to fetch client token: ${response.status}`);
      }
      
      const { accessToken } = await response.json();
      
      if (!accessToken) {
        throw new Error('Client token is missing from response');
      }

      const sdkInstance = await window.paypal.createInstance({
        clientToken: accessToken,
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
      isPayPalLoaded = false; // Reset on error so retry is possible
      console.error("Failed to load PayPal SDK:", error);
    }
  }

  // Wait for component to mount before loading PayPal
  onMount(() => {
    if (browser && window.paypal) {
      onPayPalLoaded();
    } else if (browser) {
      // PayPal SDK hasn't loaded yet, set up listener
      window.addEventListener('paypal-sdk-loaded', onPayPalLoaded);
      return () => {
        window.removeEventListener('paypal-sdk-loaded', onPayPalLoaded);
      };
    }
  });
</script>

<div id="paypal-button-container"></div>
