<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import { getTotalForItem, removeFromCart, updateQuantity } from '$lib/cart/cart.svelte'
    import type { Drop } from '$lib/db/drop';

	type Props = {
		id: number;
		name: string;
		quantity: number;
		price: number;
		drop: Drop;
	};
	let { id, name, quantity, price, drop }: Props = $props();

	let itemTotal = $derived((price * quantity).toFixed(2));

	function reduceByOne(id: number) {
        updateQuantity(id, (getTotalForItem(id)-1));
    }
</script>

<div class="cart-item">
	<div class="item-info">
		<span class="item-name">{name}</span>
		<span class="item-subheader">Quantity: {quantity}</span>
		<span class="item-subheader">Drop: {drop.display_name}</span>
	</div>
	<div class="item-price">
		${itemTotal}
	</div>
	<div class="remove">
		<button type="button" onclick={() => removeFromCart(id)}>
			<Trash2 size={18} />
		</button>

		<button type="button" onclick={() => reduceByOne(id)}>
			-1
		</button>
	</div>
</div>

<style>
	.cart-item {
		border: 1px dotted var(--accent-color);
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

	.item-subheader {
		color: var(--color-text-secondary, #666);
		font-size: 0.9rem;
	}

	.item-price {
		font-weight: 500;
		margin-right: 0.5rem;
	}

	.remove {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;  /* optional: adds spacing between buttons */
	}

	.remove button {
		border: none;
		background: transparent;
		padding: 0.25rem;
		color: #dc2626;
		transition: transform 0.2s ease, color 0.2s ease;
	}

	.remove button:hover {
		background: transparent;
		color: #991b1b;
		border: 1px solid #991b1b;
	}

	.remove button:active {
		transform: translateY(1px);
	}
</style>
