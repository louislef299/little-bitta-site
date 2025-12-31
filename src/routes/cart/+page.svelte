<script>
    import { cart, clearCart } from '$lib/cart.svelte';
</script>

<div>Cart has {cart.items.length} items</div>

<button type="button" onclick={clearCart}>Clear Cart</button>