<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import logo from '$lib/assets/purple-elephant.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<style>
	:global(body) {
		font-family:Verdana,sans-serif;
		margin:auto;
		padding:1rem;
		max-width:720px;
		text-align:left;
		background-color:rgb(250, 249, 246);
		word-wrap:break-word;
		overflow-wrap:break-word;
		line-height:1.5;
	}
</style>

<!-- "Perfection is achieved not when there is nothing more to add, but when
there is nothing left to take away." - Antoine de Saint-Exupéry -->

<Header />

{@render children()}
