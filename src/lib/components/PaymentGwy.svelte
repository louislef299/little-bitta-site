<!--
  TODO: Ensure performance optimization is done before deployment
  https://developer.paypal.com/sdk/js/performance/
-->

<script lang="ts">
  import { loadScript } from "@paypal/paypal-js";
  import { onMount } from "svelte";
  import { getItems } from '$lib/cart.svelte';

  onMount(async () => {
    try {
      const paypal = await loadScript({
        clientId: "AaVahctsdoWll9kbLmqaj3pCtOXdjUgLUGWk2NMYaZWZe778sbAZ23FY3m0ZxIysxYsGaPXSwiW3dZQx",
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
              body: JSON.stringify({ orders: getItems() }),
              headers: { "Content-Type": "application/json" }
            });
            const order = await response.json();
            return order.id;
          },
          onApprove: async function(data) {
            alert(`Transaction completed for order ${data.orderID}`);
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
