<script lang="ts">
    import AddToCart from '$lib/components/AddToCart.svelte';
    import ProductCapacityBar from '$lib/components/ProductCapacityBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { product, drop, capacity } = $derived(data);

	const isSoldOut = $derived(capacity.available === 0);
</script>

<article class="granola-detail">
	<div class="image-container">
		<img src={product.image_url} alt={product.name} class="granola-image" />
		{#if isSoldOut}
			<div class="sold-out-banner">Sold Out</div>
		{/if}
	</div>

	<h1>{product.name}</h1>
	<p class="price">${product.price}/lb</p>

	<section class="description">
		<p>{product.description}</p>
	</section>

	<section class="ingredients">
		<h2>Ingredients</h2>
		<p>{product.ingredients}</p>
	</section>

	<section class="cart">
		<AddToCart {product} {drop} {capacity}/>
	</section>

	<section class="capacity">
		<ProductCapacityBar {capacity} productId={product.id} />
	</section>
</article>

<style>
	h1 {
		text-align: center;
	}

	.granola-detail {
		max-width: 600px;
		margin: 0 auto;
	}

	.image-container {
		position: relative;
		overflow: hidden;
		border-radius: 8px;
	}

	.granola-image {
		width: 100%;
		max-height: 400px;
		object-fit: cover;
		border-radius: 8px;
	}

	.sold-out-banner {
		position: absolute;
		top: 30px;
		right: -50px;
		width: 200px;
		background: #dc2626;
		color: white;
		text-align: center;
		font-weight: bold;
		font-size: 1rem;
		padding: 8px 0;
		transform: rotate(45deg);
		box-shadow: 0 2px 4px rgba(0,0,0,0.2);
	}

	.price {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--accent-color, --text-color);
		text-align: center;
	}

	.description {
		margin: 1.5rem 0;
		text-align: center;
	}

	.ingredients {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.ingredients h2 {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.cart {
		padding-top: 1em;
	}

	.capacity {
		padding-top: 1em;
		padding-bottom: 1em;
	}
</style>