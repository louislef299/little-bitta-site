<script>
	import { cart, getCartHash } from '$lib/cart/cart.svelte';
	import CartItem from '$lib/components/CartItem.svelte';
    import StripeGwy from '$lib/components/StripeGwy.svelte';

	var cartHash = $derived(getCartHash());
</script>

<div class="cart-container">
	{#if cart.items.length > 0}
		<div class="cart-items">
			{#each cart.items as item}
				<CartItem id={item.id} name={item.name} 
					quantity={item.quantity} price={item.price} drop={item.drop} />
			{/each}
		</div>

		<div class="cart-footer">
			<div class="payment">
				{#key cartHash}
					<StripeGwy />
				{/key}
			</div>
		</div>
	{:else}
		<div class="empty-cart">
			<p>Your cart is empty, buy granola at the <a href="/shop">shop</a>!</p>
		</div>
	{/if}
</div>

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
		align-items: flex-start;
        gap: 0.5rem;
        margin-right: 0.5rem;
	}

	.payment {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.empty-cart {
		text-align: center;
		padding: 3rem;
		color: var(--color-text-secondary, #666);
	}
</style>
