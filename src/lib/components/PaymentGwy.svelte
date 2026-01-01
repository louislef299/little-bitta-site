<script lang="ts">
  import { loadScript } from "@paypal/paypal-js";
  import { onMount } from "svelte";

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
            // Create order on your server
            const response = await fetch("/api/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            });
            const order = await response.json();
            return order.id;
          },
          onApprove: async function(data) {
            // Capture payment on your server
            console.log("Payment approved:", data);
          }
        }).render('#paypal-button-container');
      }
    } catch (error) {
      console.error("Failed to load PayPal SDK:", error);
    }
  });
</script>

<!-- Set up a container element for the button -->
<div id="paypal-button-container"></div>
