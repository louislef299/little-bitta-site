<script lang="ts">
    import AddToCart from '$lib/components/AddToCart.svelte';
    import CapacityBar from '$lib/components/CapacityBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { product, drop, capacity } = $derived(data);
</script>

<article class="granola-detail">
	<img src={product.image_url} alt={product.name} class="granola-image" />

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
		<AddToCart id={product.id} name={product.name} price={product.price} {drop} {capacity}/>
	</section>

	<section class="capacity">
		<CapacityBar {capacity} />
	</section>
</article>

<style>
	.granola-detail {
		max-width: 600px;
		margin: 0 auto;
	}

	.granola-image {
		width: 100%;
		max-height: 400px;
		object-fit: cover;
		border-radius: 8px;
	}

	.price {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--accent-color, #2563eb);
	}

	.description {
		margin: 1.5rem 0;
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