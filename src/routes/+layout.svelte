<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import logo from '$lib/assets/purple-elephant.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<style>
	:global(:root) {
		--bg-color: rgb(250, 249, 246);
		--text-color: #333;
	}

	:global([data-theme="dark"]) {
		--bg-color: #1a1a1a;
		--text-color: #e0e0e0;
	}

	:global(body) {
		font-family:Verdana,sans-serif;
		margin:auto;
		padding:1rem;
		max-width:720px;
		text-align:left;
		background-color: var(--bg-color);
    	color: var(--text-color);
		word-wrap:break-word;
		overflow-wrap:break-word;
		line-height:1.5;
	}
</style>

<!-- "Perfection is achieved not when there is nothing more to add, but when
there is nothing left to take away." - Antoine de Saint-Exupéry -->

<Header />

{@render children()}
