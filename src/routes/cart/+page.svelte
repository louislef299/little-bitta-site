<script>
    import { cart, clearCart, getCartTotal } from '$lib/cart.svelte';

    let total = $derived(getCartTotal());
</script>

<div>Cart has {cart.items.length} items</div>

<ul>
    {#each cart.items as item}
        <li>{item.name} x {item.quantity}</li>
    {/each}
</ul>
<h3>Total is ${total}</h3>

<button type="button" onclick={clearCart}>Clear Cart</button>