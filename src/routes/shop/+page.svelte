<script lang="ts">
    import { addToCart, getTotalForItem, updateQuantity } from '$lib/cart.svelte';
    import { browser } from '$app/environment';
    import { loadPayPalSDK } from '$lib/payments/paypal-sdk.svelte';

    var items = [
        { id: "1", name: "Peanut Butter Nutella", price: 12, img: "/images/granola-generic.jpg"},
        { id: "2", name: "Pistachio", price: 12, img: "/images/granola-generic.jpg"},
        { id: "3", name: "Peanut Butter Chocolate Chip", price: 12, img: "/images/granola-generic.jpg"},
        { id: "4", name: "Honey Bear", price: 12, img: "/images/granola-generic.jpg"}
    ]

    function reduceByOne(id: string) {
        updateQuantity(id, (getTotalForItem(id)-1));
    }

    // Opportunistically load PayPal SDK when browser is idle
    if (browser) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadPayPalSDK(), { timeout: 5000 });
      } else {
        setTimeout(() => loadPayPalSDK(), 1000);
      }
    }
</script>

<h1>Granola Available</h1>
<ul>
	{#each items as item}
		<li>
            <img class="shop" alt="{item.name} image" src={item.img} />
            <div class="item-name">
                <strong>{item.name}</strong>
            </div>
            
            <div class="item-footer">
                <div class="item-info">
                    ${item.price}/lb
                </div>
                <div class="button-group">
                    <button type="button" onclick={() => addToCart(item)}>
                        +Cart {#if getTotalForItem(item.id) > 0}{getTotalForItem(item.id)}{/if}
                    </button>
                    <button type="button" onclick={() => reduceByOne(item.id)}>
                        -Cart
                    </button>
                </div>
            </div>
        </li>
	{/each}
</ul>

<style>
    .shop {
        width: 10rem;
        height: 14rem;
    }

    .item-name {
        text-align: center;
    }

    .item-footer {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        text-align: center;
    }

    .button-group {
        display: flex;
        gap: 0.5rem;
    }

    ul {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      grid-auto-rows: 1fr;
      gap: 1rem;
    }

    li {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
    }

    button {
        padding: 0.5rem 0.5rem;
    }
</style>
