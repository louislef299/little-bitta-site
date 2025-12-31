<script>
	import { cart, clearCart, getCartTotal } from '$lib/cart.svelte';
	import CartItem from '$lib/components/CartItem.svelte';

	let total = $derived(getCartTotal());
</script>

<style>
	.cart-container {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.cart-items {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.cart-footer {
		border-top: 2px dotted rgb(170, 3, 248);
		padding-top: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.total {
		font-size: 1.5rem;
		font-weight: 600;
	}

	.empty-cart {
		text-align: center;
		padding: 3rem;
		color: var(--color-text-secondary, #666);
	}
</style>

<div class="cart-container">
	<p>
        Your Cart has {cart.items.length} {cart.items.length === 1 ? 'item' :
        'items'}
    </p>

	{#if cart.items.length > 0}
		<div class="cart-items">
			{#each cart.items as item}
				<CartItem id={item.id} name={item.name} quantity={item.quantity} price={item.price} />
			{/each}
		</div>

		<div class="cart-footer">
			<span class="total">Total: ${total.toFixed(2)}</span>
			<button type="button" onclick={clearCart}>Clear Cart</button>
		</div>
	{:else}
		<div class="empty-cart">
			<p>Your cart is empty, buy granola at the <a href="/shop">shop</a>!</p>
		</div>
	{/if}
</div>