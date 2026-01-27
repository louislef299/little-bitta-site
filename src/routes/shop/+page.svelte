<script lang="ts">
    import { browser } from '$app/environment';
    import { loadStripeInstance } from '$lib/payments/stripe-sdk.svelte';
    import type { PageProps } from './$types';
    import AddToCart from '$lib/components/AddToCart.svelte';
    import type { ProductCapacity } from '$lib/server/db/drop-product';

	let { data }: PageProps = $props();

    const { drop, products, productCapacities } = $derived(data);

    // Helper to get capacity for a product, with default fallback
    function getCapacity(productId: number): ProductCapacity {
        return productCapacities[productId] ?? {
            product_id: productId,
            max: 10,
            sold: 0,
            available: 10
        };
    }

    // Opportunistically load payment SDKs when browser is idle
    if (browser) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          loadStripeInstance();
        }, { timeout: 5000 });
      } else {
        setTimeout(() => {
          loadStripeInstance();
        }, 2000);
      }
    }
</script>

<h1>
    Granola {#if isCurrentDropAvailable} Available {:else} Unavailable {/if}
</h1>

<div>
    <h2>{drop.display_name} {drop.year} Drop</h2>

    {#if !isCurrentDropAvailable}
        <p class="capacity-warning">
            This drop is at capacity.
        </p>
    {/if}
    <a href="/#Limited-Drop-Availability">how it works</a>
</div>

<ul>
	{#each products as item}
        {@const capacity = getCapacity(item.id)}
		<li>
            <div class="image-container">
                <img class="shop" alt="{item.name} image" src={item.image_url} />
                {#if capacity.available === 0}
                    <div class="sold-out-banner">Sold Out</div>
                {/if}
                {#if capacity.available > 0 && capacity.available <= 3}
                    <div class="availability-badge">{capacity.available} Left!</div>
                {/if}
            </div>
            <div class="item-name">
                <a href="/product/{item.slug}">
                    <strong>{item.name}</strong>
                </a>
            </div>

            <div class="item-footer">
                <div class="item-info">
                    <i>${item.price}/lb</i>
                </div>
                <AddToCart id={item.id} name={item.name} price={item.price} {drop} {capacity}/>
            </div>
        </li>
	{/each}
</ul>

<style>
    .image-container {
        position: relative;
        overflow: hidden;
    }

    .shop {
        width: 10rem;
        height: 14rem;
    }

    .sold-out-banner {
        position: absolute;
        top: 18px;
        right: -35px;
        width: 130px;
        background: #dc2626;
        color: white;
        text-align: center;
        font-weight: bold;
        font-size: 0.8rem;
        padding: 5px 0;
        transform: rotate(45deg);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .availability-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #f59e0b;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
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
</style>
