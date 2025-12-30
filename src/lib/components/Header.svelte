<script lang="ts">
	import logo from '$lib/assets/purple-elephant.png';
</script>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
	}

	h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
	}

	nav {
		display: flex;
		gap: 1.5rem;
		padding: 0.25rem;
	}

	a {
		text-decoration: none;
		color: #333;
		font-weight: 500;
		padding: 0.5rem;
		border-radius: 4px;
		border: 1px dotted transparent;
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
	}

	a:hover {
		border-color: rgb(170, 3, 248);
		color: rgb(170, 3, 248);
	}

	a:active {
		transform: translateY(1px);
	}

	img.logo {
		height: 2.5rem;
		width: 3rem;
	}
</style>

<header>
	<h1>
		<img class="logo" alt="Little Bitta Elephant" src={logo} />
		Little Bitta Granola
	</h1>

	<nav>
		<a href="/">home</a>
		<a href="/about">about</a>
	</nav>
</header>
