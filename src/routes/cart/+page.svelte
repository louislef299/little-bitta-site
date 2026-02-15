<script>
	import { cart, getCartHash } from '$lib/cart/cart.svelte';
	import CartItem from '$lib/components/CartItem.svelte';
	import StripeGwy from '$lib/components/StripeGwy.svelte';
	import PayPalGwy from '$lib/components/PayPalGwy.svelte';

	var cartHash = $derived(getCartHash());
	let stripeTotal = $state("");
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
			<div class="total">
				<div class="calculated-total">
					{#if stripeTotal !== ""}
						<h4>Total: {stripeTotal}</h4>
					{:else}
						<h4>Calculating...</h4>
					{/if}
				</div>
			</div>

			<div class="payment">
				{#key cartHash}
					<PayPalGwy />
					<div class="divider">
						<i>or checkout with Stripe</i>
					</div>
					<StripeGwy bind:stripeTotal />
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
		gap: 2rem;
	}

	.total {
		flex-shrink: 0;
		position: sticky;
		top: 5rem;
		z-index: 10;
		background-color: var(--bg-color);
		padding: 0.5rem 0;
	}

	.calculated-total {
		font-size: 1.5rem;
		font-weight: 600;
	}

	.payment {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		max-width: 20rem;
		margin-left: auto;
		padding-left: 2rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1rem 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary, #666);
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	.empty-cart {
		text-align: center;
		padding: 3rem;
		color: var(--color-text-secondary, #666);
	}
</style>
