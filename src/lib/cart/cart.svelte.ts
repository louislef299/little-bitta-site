import { browser } from '$app/environment';
import type { Drop } from '$lib/cart/drops.svelte';

// Cart schema version - increment when OrderItem or Drop types change
const CART_SCHEMA_VERSION = '1.0.0';

// Product catalog type
export type Product = {
	id: number;
	name: string;
	price: number;
	image_path: string;
	description?: string;
	active?: boolean;
	stock_quantity?: number;
};

export type OrderItem = {
    id: number;
    name: string;
    quantity: number;
    price: number;
	drop: Drop;
	image_path?: string;
}

export const cart = $state({
	items: loadCart()
});

// Load initial cart from localStorage (only in browser)
function loadCart(): OrderItem[] {
	console.debug('[Cart] loadCart() called, browser:', browser);
	if (browser) {
		const savedVersion = localStorage.getItem('cart_version');
		const saved = localStorage.getItem('cart');
		console.debug('[Cart] Saved version:', savedVersion, 'Current:', CART_SCHEMA_VERSION);

		// Check version compatibility
		if (savedVersion !== CART_SCHEMA_VERSION) {
			if (savedVersion) {
				console.debug(`[Cart] Schema updated from v${savedVersion} to v${CART_SCHEMA_VERSION}, clearing cart`);
			} else {
				console.debug(`[Cart] No version found, initializing with v${CART_SCHEMA_VERSION}`);
			}
			localStorage.removeItem('cart');
			localStorage.setItem('cart_version', CART_SCHEMA_VERSION);
			return [];
		}

		if (!saved) return [];
		try {
			const items = JSON.parse(saved);
			if (!Array.isArray(items)) {
				console.warn('Cart data is not an array, clearing...');
				localStorage.removeItem('cart');
				return [];
			}

			return items;
		} catch (e) {
			console.error('Failed to parse cart from localStorage', e);
			localStorage.removeItem('cart');
			return [];
		}
	}
	return [];
}

function saveCart(items: OrderItem[]) {
	if (browser) {
		localStorage.setItem('cart', JSON.stringify(items));
		localStorage.setItem('cart_version', CART_SCHEMA_VERSION);
	}
}

export function addToCart(item: Omit<OrderItem, 'quantity'>) {
	const existing = cart.items.find((i) => i.id === item.id);
	if (existing) {
		existing.quantity++;
	} else {
		cart.items.push({ ...item, quantity: 1 });
	}
	saveCart(cart.items);
}

export function removeFromCart(itemId: number) {
	cart.items = cart.items.filter((i) => i.id !== itemId);
	saveCart(cart.items);
}

export function emptyCart() {
	cart.items = [];
	localStorage.clear();
}

export function updateQuantity(itemId: number, quantity: number) {
	const item = cart.items.find((i) => i.id === itemId);
	if (item) {
		if (quantity <= 0) {
			removeFromCart(itemId);
		} else {
			item.quantity = quantity;
			saveCart(cart.items);
		}
	}
}

export function getItems(): OrderItem[] {
	return cart.items
}

export function getItemTotal() {
	let total = 0;
	for (const i of cart.items) {
		total += i.quantity;
	}
	return total;
}

// Default return of 0 if item is not found
export function getTotalForItem(id: number) {
	for (const i of cart.items) {
		if (i.id === id) {
			return i.quantity;
		}
	}
	return 0;
}
