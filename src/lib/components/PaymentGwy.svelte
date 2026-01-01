<!--
  TODO: Ensure performance optimization is done before deployment
  https://developer.paypal.com/sdk/js/performance/
-->

<script lang="ts">
  import { loadScript } from "@paypal/paypal-js";
  import { onMount } from "svelte";
  import { getItems } from '$lib/cart.svelte';
  import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';

  onMount(async () => {
    try {
      const paypal = await loadScript({
        clientId: PUBLIC_PAYPAL_CLIENT_ID,
        components: "buttons",
        currency: "USD",
        enableFunding: ["venmo", "applepay"],
        disableFunding: "paylater"
      });

      if (paypal && paypal.Buttons) {
        await paypal.Buttons({
          createOrder: async function() {
            const response = await fetch("/api/order", {
              method: "POST",
              body: JSON.stringify({ items: getItems() }),
              headers: { "Content-Type": "application/json" }
            });
            const order = await response.json();
            return order.id;
          },
          onApprove: async function(data) {
            // Capture the payment
            const response = await fetch("/api/capture", {
              method: "POST",
              body: JSON.stringify({ orderID: data.orderID }),
              headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();

            if (result.status === 'COMPLETED') {
              alert(`Payment successful! Order ID: ${data.orderID}`);
              // TODO: Clear cart after successful payment
            } else {
              alert(`Payment status: ${result.status}`);
            }
          },
          style: {
            tagline: false,
            color: "blue",
          },
        }).render('#paypal-button-container');
      }
    } catch (error) {
      console.error("Failed to load PayPal SDK:", error);
    }
  });
</script>

<div id="paypal-button-container"></div>
