<script>
    import { addToCart } from '$lib/cart.svelte';

    var items = [
        { id: "1", name: "Peanut Butter Nutella", price: 10, img: "/images/granola-generic.jpg"},
        { id: "2", name: "Pistachio", price: 10, img: "/images/granola-generic.jpg"},
        { id: "3", name: "Peanut Butter Chocolate Chip", price: 10, img: "/images/granola-generic.jpg"},
        { id: "4", name: "Honey Bear", price: 10, img: "/images/granola-generic.jpg"}
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
            {item.name} @ ${item.price}/lb
            <br />
            <button type="button" onclick={() => addToCart(item)}>+Cart</button>
        </li>
	{/each}
</ul>