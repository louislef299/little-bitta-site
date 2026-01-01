<script lang="ts">
    import { addToCart, getTotalForItem, updateQuantity } from '$lib/cart.svelte';

    var items = [
        { id: "1", name: "Peanut Butter Nutella", price: 10, img: "/images/granola-generic.jpg"},
        { id: "2", name: "Pistachio", price: 10, img: "/images/granola-generic.jpg"},
        { id: "3", name: "Peanut Butter Chocolate Chip", price: 10, img: "/images/granola-generic.jpg"},
        { id: "4", name: "Honey Bear", price: 10, img: "/images/granola-generic.jpg"}
    ]

    function reduceByOne(id: string) {
        updateQuantity(id, (getTotalForItem(id)-1));
    }
</script>

<h1>Granola Available</h1>
<ul>
	{#each items as item}
		<li>
            <img class="shop" alt="{item.name} image" src={item.img} />
            <br />
            {item.name} @ ${item.price}/lb
            <br />
            <button type="button" onclick={() => addToCart(item)}>
                +Cart {#if getTotalForItem(item.id) > 0 }{getTotalForItem(item.id)}{/if}
            </button>
            <button type="button" onclick={() => reduceByOne(item.id)}>-Cart</button>
        </li>
	{/each}
</ul>

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
