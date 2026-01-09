<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import { removeFromCart } from '$lib/cart/cart.svelte'

	type Props = {
		id: string;
		name: string;
		quantity: number;
		price: number;
	};

	let { id, name, quantity, price }: Props = $props();

	let itemTotal = $derived((price * quantity).toFixed(2));
</script>

<style>
	.cart-item {
		border: 1px dotted rgb(170, 3, 248);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: border-width 0.2s ease;
	}

	.cart-item:hover {
		border-width: 2px;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.item-name {
		font-weight: 500;
		font-size: 1.1rem;
	}

	.item-quantity {
		color: var(--color-text-secondary, #666);
		font-size: 0.9rem;
	}

	.item-price {
		font-weight: 500;
		margin-right: 0.5rem;
	}

	.cart-remove button {
		border: none;
		background: transparent;
		padding: 0.25rem;
		color: #dc2626;
		transition: transform 0.2s ease, color 0.2s ease;
	}

	.cart-remove button:hover {
		background: transparent;
		color: #991b1b;
	}

	.cart-remove button:active {
		transform: translateY(1px);
	}
</style>

<div class="cart-item">
	<div class="item-info">
		<span class="item-name">{name}</span>
		<span class="item-quantity">Quantity: {quantity}</span>
	</div>
	<div class="item-price">
		${itemTotal}
	</div>
	<div class="cart-remove">
		<button type="button" onclick={() => removeFromCart(id)}>
			<Trash2 size={18} />
		</button>
	</div>
</div>
