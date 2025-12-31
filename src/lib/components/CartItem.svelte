<script lang="ts">
	type Props = {
		name: string;
		quantity: number;
		price: number;
	};

	let { name, quantity, price }: Props = $props();

	let itemTotal = $derived((price * quantity).toFixed(2));
</script>

<style>
	.cart-item {
		border: 1px dotted rgb(170, 3, 248);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: border-width 0.2s ease;
	}

	.cart-item:hover {
		border-width: 2px;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-name {
		font-weight: 500;
		font-size: 1.1rem;
	}

	.item-quantity {
		color: var(--color-text-secondary, #666);
		font-size: 0.9rem;
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
</div>
