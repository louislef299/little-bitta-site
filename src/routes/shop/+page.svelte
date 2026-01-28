<script lang="ts">
    import { browser } from '$app/environment';
    import { loadStripeInstance } from '$lib/payments/stripe-sdk.svelte';
    import CapacityBar from '$lib/components/CapacityBar.svelte';
    import type { PageProps } from './$types';
    import AddToCart from '$lib/components/AddToCart.svelte';

	let { data }: PageProps = $props();

    const { drop, capacity } = $derived(data);
    let isCurrentDropAvailable = $derived(capacity ? capacity.available > 0 : false);

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
	{#each data.product as item}
		<li>
            <img class="shop" alt="{item.name} image" src={item.image_url} />
            <div class="item-name">
                <a href="/product/{item.slug}">
                    <strong>{item.name}</strong>
                </a>
            </div>

            <div class="item-footer">
                <div class="item-info">
                    <i>${item.price}/lb</i>s
                </div>
                <AddToCart id={item.id} name={item.name} price={item.price} {drop} {capacity}/>
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
</style>
