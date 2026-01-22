<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import logo from '$lib/assets/purple-elephant.png';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<Header />

{@render children()}

<Footer />

<style>
	:global(:root) {
		--bg-color: rgb(250, 249, 246);
		--text-color: #333;
		--bg-progress: rgba(0, 0, 0, 0.08);
	}

	:global([data-theme="dark"]) {
		--bg-color: #1a1a1a;
		--text-color: #e0e0e0;
		--bg-progress: rgb(242, 241, 238);
	}

	:global(a) {
		text-decoration: none;
		color: var(--text-color);
	}

	:global(a:hover) {
		color: rgb(170, 3, 248);
	}

	:global(button) {
		padding: 0.5rem 1rem;
		border: 1px dotted rgb(170, 3, 248);
		border-radius: 4px;
		background: transparent;
		color: var(--text-color);
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	:global(button:hover) {
		background: rgb(170, 3, 248);
		color: white;
	}

	:global(button:active) {
		transform: translateY(1px);
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
