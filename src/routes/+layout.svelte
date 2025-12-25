<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Nav from '$lib/components/Nav.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- "Perfection is achieved not when there is nothing more to add, but when
there is nothing left to take away." - Antoine de Saint-Exupéry -->

<Nav />

{@render children()}
