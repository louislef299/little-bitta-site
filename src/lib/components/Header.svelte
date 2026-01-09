<script lang="ts">
	import logo from '$lib/assets/purple-elephant.png';
	import ToggleTheme from '$lib/components/Toggle.svelte'
	import { getItemTotal } from '$lib/cart/cart.svelte'
	import { ShoppingCart } from '@lucide/svelte';

	let itemTotal = $derived(getItemTotal());
</script>

<header>
	<h1><a href="/">
		<img class="logo" alt="Little Bitta Elephant" src={logo} />
		<span class="lbg-text">Little Bitta Granola</span>
	</a></h1>

	<nav class="navigation">
		<a href="/about">about</a>
		<a href="/shop">shop</a>
		<a href="/cart"><ShoppingCart />{#if itemTotal > 0}({itemTotal}){/if}</a>
		<ToggleTheme />
	</nav>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		position: sticky;
		top: 0;
		z-index: 100;
      	background-color: var(--bg-color);
		/* Performance: GPU acceleration for smooth sticky positioning */
		transform: translateZ(0);
		will-change: transform;
		/* Performance: Isolate rendering calculations */
		contain: layout style paint;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}

	nav {
		display: flex;
		gap: 0.1rem;
		padding: 0.25rem;
	}

	.navigation a {
		font-weight: 500;
		padding: 0.5rem;
		border-radius: 4px;
		border: 1px dotted transparent;
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}

	.navigation a:hover {
		border-color: rgb(170, 3, 248);
	}

	.navigation a:active {
		transform: translateY(1px);
	}

	img.logo {
		height: 2.5rem;
		width: 3rem;
	}

	/* layer header & nav if small enough(tablets & phones) */
	@media (max-width: 768px) {
		header {
			flex-direction: column;
			gap: 1rem;
		}

		h1 {
			text-align: center;
		}

		nav {
			justify-content: center;
		}
	}

	/* remove header text if on phone */
	@media (max-width: 640px) {
		.lbg-text {
			display: none;
		}
	}

</style>
