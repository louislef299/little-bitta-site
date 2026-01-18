<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<article class="granola-detail">
	<img src={data.granola.image_url} alt={data.granola.name} class="granola-image" />

	<h1>{data.granola.name}</h1>
	<p class="price">${data.granola.price}/lb</p>

	<section class="description">
		<p>{data.granola.description}</p>
	</section>

	<section class="ingredients">
		<h2>Ingredients</h2>
		<p>{data.granola.ingredients}</p>
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
</style>