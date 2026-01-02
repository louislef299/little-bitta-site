// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { PayPalNamespace } from "@paypal/paypal-js";

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  // Window augmentation for PayPal SDK
  interface Window {
    paypal?: PayPalNamespace;
  }
}

export {};
