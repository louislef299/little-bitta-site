import { browser } from '$app/environment';
import { type OrderItem } from '$lib/database';

export const cart = $state({
	items: loadCart()
});

// Load initial cart from localStorage (only in browser)
function loadCart(): OrderItem[] {
	if (browser) {
		const saved = localStorage.getItem('cart');
		if (saved) {
			try {
				return JSON.parse(saved);
			} catch (e) {
				console.error('Failed to parse cart from localStorage', e);
			}
		}
	}
	return [];
}

function saveCart(items: OrderItem[]) {
	if (browser) {
		localStorage.setItem('cart', JSON.stringify(items));
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

export function removeFromCart(itemId: string) {
	cart.items = cart.items.filter((i) => i.id !== itemId);
	saveCart(cart.items);
}

export function emptyCart() {
	cart.items = [];
	localStorage.clear();
}

export function updateQuantity(itemId: string, quantity: number) {
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

export function getCartTotal() {
	return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getItems(): OrderItem[] {
	return cart.items
}

export function getItemTotal() {
	let total = 0;
	for (let i of cart.items) {
		total += i.quantity;
	}
	return total;
}

// Default return of 0 if item is not found
export function getTotalForItem(id: string) {
	for (let i of cart.items) {
		if (i.id === id) {
			return i.quantity;
		}
	}
	return 0;
}
