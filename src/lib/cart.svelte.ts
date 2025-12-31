import { browser } from '$app/environment';

// Define your cart item type
type CartItem = {
	id: string;
	name: string;
	price: number;
	quantity: number;
};

// Create the cart state
export const cart = $state({
	items: loadCart()
});

// Load initial cart from localStorage (only in browser)
function loadCart(): CartItem[] {
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

// Save cart to localStorage
function saveCart(items: CartItem[]) {
	if (browser) {
		localStorage.setItem('cart', JSON.stringify(items));
	}
}

// Helper to add item to cart
export function addToCart(item: Omit<CartItem, 'quantity'>) {
	const existing = cart.items.find((i) => i.id === item.id);
	if (existing) {
		existing.quantity++;
	} else {
		cart.items.push({ ...item, quantity: 1 });
	}
	saveCart(cart.items);
}

// Helper to remove item from cart
export function removeFromCart(itemId: string) {
	cart.items = cart.items.filter((i) => i.id !== itemId);
	saveCart(cart.items);
}

// Helper to update quantity
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

// Helper to clear the cart
export function clearCart() {
	cart.items = []
	localStorage.removeItem('cart');
}

// Helper to get cart total
export function getCartTotal() {
	return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
