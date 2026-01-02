// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import { PayPalV6Namespace } from "@paypal/paypal-js/sdk-v6";

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	
	// Window augmentation goes OUTSIDE the App namespace
	interface Window {
		paypal: PayPalV6Namespace;
	}
}

export {};
