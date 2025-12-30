<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import logo from '$lib/assets/purple-elephant.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<!-- "Perfection is achieved not when there is nothing more to add, but when
there is nothing left to take away." - Antoine de Saint-Exupéry -->

<Header />

{@render children()}
