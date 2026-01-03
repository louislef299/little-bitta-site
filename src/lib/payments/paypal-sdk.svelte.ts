import { PUBLIC_PAYPAL_CLIENT_ID } from '$env/static/public';
import { loadScript } from "@paypal/paypal-js";
import type { PayPalNamespace } from "@paypal/paypal-js";

let paypalInstance = $state<PayPalNamespace | null>(null);
export function getPayPalInstance() {
  return paypalInstance;
}

export function isPayPalSDKLoaded(): boolean {
  return paypalInstance != null;
}

export async function loadPayPalSDK() {
  if (paypalInstance) return paypalInstance;

  try {
    const paypal = await loadScript({
      clientId: PUBLIC_PAYPAL_CLIENT_ID,
      components: "buttons",
      currency: "USD",
      enableFunding: "venmo",
      disableFunding: "paylater"
    });
    paypalInstance = paypal;
    return paypal;
  } catch (error) {
    console.error('Failed to load PayPal SDK:', error);
    throw error;
  }
}
