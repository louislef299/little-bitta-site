<script lang="ts">
    import { 
        addToCart, getTotalForItem, updateQuantity, getItems 
    } from '$lib/cart/cart.svelte';
    import { 
        getCurrentDrop, isDropAvailable, getDropCapacity
    } from '$lib/cart/drops.svelte'
    import { browser } from '$app/environment';
    import { loadStripeSDK } from '$lib/payments/stripe-sdk.svelte';
    import CapacityBar from '$lib/components/CapacityBar.svelte';

    let currentDrop = getCurrentDrop();
    let isCurrentDropAvailable = $derived(isDropAvailable(currentDrop.id));
    const dropCapacity = $derived(getDropCapacity(currentDrop.id));

    var items = [
        { id: "1", name: "Peanut Butter Chocolate Chip", price: 12, img: "/images/granola-generic.jpg"},
        { id: "2", name: "Peanut Butter Nutella", price: 12, img: "/images/granola-generic.jpg"},
        { id: "3", name: "Honey Bear", price: 12, img: "/images/granola-generic.jpg"},
        { id: "4", name: "Pistachio", price: 12, img: "/images/granola-generic.jpg"},
    ]

    function reduceByOne(id: string) {
        updateQuantity(id, (getTotalForItem(id)-1));
    }

    // Opportunistically load payment SDKs when browser is idle
    if (browser) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          loadStripeSDK();
        }, { timeout: 5000 });
      } else {
        setTimeout(() => {
          loadStripeSDK();
        }, 2000);
      }
    }
</script>

<h1>Granola Available</h1>

<div>
    <h3>Currently shopping for drop: {currentDrop.long} {currentDrop.year}</h3>
    <CapacityBar capacity={dropCapacity} />

    {#if !isCurrentDropAvailable}
        <p class="capacity-warning">
            ⚠️ This drop is at capacity. Please select another drop date.
        </p>
    {/if}
</div> 

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
                    <button 
                        type="button" 
                        disabled={!isCurrentDropAvailable}
                        onclick={() => {
                            addToCart({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                drop: currentDrop,
                            })
                        }}>
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

    .capacity-warning {
        color: #f59e0b;
        font-weight: 500;
        margin-top: 0.5rem;
        font-size: 0.9rem;
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

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: #666;
    }

    button:disabled:hover {
        background: #666;
    }
</style>
