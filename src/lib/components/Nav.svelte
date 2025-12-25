<nav>
	<a href="/">home</a>
	<a href="/about">about</a>
</nav>

<style>
	nav {
		display: flex;
		gap: 1.5rem;
		padding: 1rem 2rem;
	}

	a {
		text-decoration: none;
		color: #333;
		font-weight: 500;
		padding: 0.5rem 1rem;
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
</style>
