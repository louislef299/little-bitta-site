<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import logo from '$lib/assets/purple-elephant.png';

	let { children } = $props();
</script>

<style>
	img.logo {
		height: 2.5rem;
		width: 3rem;
	}
</style>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<!-- "Perfection is achieved not when there is nothing more to add, but when
there is nothing left to take away." - Antoine de Saint-Exupéry -->

<h1>
	<img class="logo" alt="Little Bitta Elephant" src={logo} />
	Little Bitta Granola
</h1>

<Nav />

{@render children()}
