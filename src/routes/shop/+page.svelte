<script>
    var items = [
        { name: "one", qty: 3, img: "/images/granola-generic.jpg"},
        { name: "two", qty: 3, img: "/images/granola-generic.jpg"},
        { name: "three", qty: 3, img: "/images/granola-generic.jpg"},
        { name: "four", qty: 3, img: "/images/granola-generic.jpg"},
        { name: "five", qty: 3, img: "/images/granola-generic.jpg"},
        { name: "six", qty: 3, img: "/images/granola-generic.jpg"}
    ]
</script>

<style>
    .shop {
        width: 10rem;
        height: 14rem;
    }

    ul {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 1rem;
    }
</style>

<h1>Granola Available</h1>
<ul>
	{#each items as item}
		<li>
            <img class="shop" alt="{item.name} image" src={item.img} />
            <br />
            {item.name} x {item.qty}
        </li>
	{/each}
</ul>