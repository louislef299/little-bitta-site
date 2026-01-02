import type { 
    PayPalPaymentsInstance, 
    OnApproveDataOneTimePayments,
} from "@paypal/paypal-js/sdk-v6";
import { getItems, emptyCart } from '$lib/cart.svelte';

// Shared payment session options for all payment methods
const paymentSessionOptions = {
  // Called when user approves a payment 
  async onApprove(data: any) {
    console.log("Payment approved:", data);
    try {
      const orderData = await captureOrder({
        orderId: data.orderId,
      });
      console.log("Payment captured successfully:", orderData);
    } catch (error) {
      console.error("Payment capture failed:", error);
    }
  },
};

export async function setUpPayPalButton(sdkInstance: PayPalPaymentsInstance) {
    const paypalPaymentSession = sdkInstance.createPayPalOneTimePaymentSession(
        paymentSessionOptions,
    );

    const paypalButton = document.querySelector("#paypal-button-container");
    if (paypalButton) {
        paypalButton.removeAttribute("hidden");
        paypalButton.addEventListener("click", async () => {
            try {
                await paypalPaymentSession.start(
                    { presentationMode: "auto" }, // Auto-detects best presentation mode
                    createOrder(),
                );
            } catch (error) {
                console.error("PayPal payment start error:", error);
            }
        })
    } else {
        console.error("Could not find button with id 'paypal-button-container'") 
    }
}

async function createOrder() {
    const response = await fetch("/api/order", {
        method: "POST",
        body: JSON.stringify({ items: getItems() }),
        headers: { "Content-Type": "application/json" }
    });
    const order = await response.json();
    return order.id;
}

export async function captureOrder(data: OnApproveDataOneTimePayments) {
    // Capture the payment
    const response = await fetch("/api/capture", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderId }),
        headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.status === 'COMPLETED') {
        emptyCart();
        // Redirect to order summary page
        window.location.href = `/order-success?id=${data.orderId}`;
    } else {
        alert(`Payment status: ${result.status}`);
    }
}
