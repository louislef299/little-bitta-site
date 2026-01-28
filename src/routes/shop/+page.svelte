<script lang="ts">
    import { browser } from '$app/environment';
    import { loadStripeInstance } from '$lib/payments/stripe-sdk.svelte';
    import type { PageProps } from './$types';
    import type { ProductCapacity } from '$lib/server/db/drop-product';
    import ShopProduct from '$lib/components/ShopProduct.svelte';

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
    Granola Shop
</h1>

<div>
    <h2>{drop.display_name} {drop.year} Drop</h2>
    <a href="/#Limited-Drop-Availability">how it works</a>
</div>

<ul>
	{#each products as item}
    {@const capacity=getCapacity(item.id)}
		<li>
      <ShopProduct product={item} pcap={capacity} drop={drop} />
    </li>
	{/each}
</ul>

<style>
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
