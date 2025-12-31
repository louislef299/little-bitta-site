<script>
    import { addToCart } from '$lib/cart.svelte';

    var items = [
        { id: "1", name: "one", price: 3, img: "/images/granola-generic.jpg"},
        { id: "2", name: "two", price: 3, img: "/images/granola-generic.jpg"},
        { id: "3", name: "three", price: 3, img: "/images/granola-generic.jpg"},
        { id: "4", name: "four", price: 3, img: "/images/granola-generic.jpg"},
        { id: "5", name: "five", price: 3, img: "/images/granola-generic.jpg"},
        { id: "6", name: "six", price: 3, img: "/images/granola-generic.jpg"}
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
            {item.name} x {item.price}
            <button type="button" onclick={() => addToCart(item)}>Add 2 Cart</button>
        </li>
	{/each}
</ul>