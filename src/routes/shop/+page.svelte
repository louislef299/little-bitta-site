<script lang="ts">
    import { addToCart, getItemTotal, updateQuantity } from '$lib/cart.svelte';

    var items = [
        { id: "1", name: "Peanut Butter Nutella", price: 10, img: "/images/granola-generic.jpg"},
        { id: "2", name: "Pistachio", price: 10, img: "/images/granola-generic.jpg"},
        { id: "3", name: "Peanut Butter Chocolate Chip", price: 10, img: "/images/granola-generic.jpg"},
        { id: "4", name: "Honey Bear", price: 10, img: "/images/granola-generic.jpg"}
    ]

    function reduceByOne(id: string) {
        updateQuantity(id, (getItemTotal(id)-1));
    }
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

    button {
        padding: 0.5rem 0.5rem;
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
            <button type="button" onclick={() => addToCart(item)}>
                +Cart {#if getItemTotal(item.id) > 0 }{getItemTotal(item.id)}{/if}
            </button>
            <button type="button" onclick={() => reduceByOne(item.id)}>-Cart</button>
        </li>
	{/each}
</ul>