<script lang="ts">
    import type { Product } from '$lib/server/db/product';
    import type { ProductCapacity } from '$lib/server/db/drop-product';
    import { getTotalForItem } from '$lib/cart/cart.svelte';
    import AddToCart from '$lib/components/AddToCart.svelte';
    import type { Drop } from '$lib/server/db/drop';

    type Props = {
		product: Product;
        pcap: ProductCapacity;
        drop: Drop;
	};
	let { product, pcap, drop }: Props = $props();

    var availableForItem = $derived(pcap.max - (getTotalForItem(product.id) + pcap.sold));
</script>

<div class="image-container">
    <img class="shop" alt="{product.name} image" src={product.image_url} />
    {#if availableForItem <= 0}
        <div class="sold-out-banner">Sold Out</div>
    {:else if availableForItem <= 3}
        <div class="availability-badge">{availableForItem} Left!</div>
    {/if}
</div>

<div class="item-name">
    <a href="/product/{product.slug}">
        <strong>{product.name}</strong>
    </a>
</div>

<div class="item-footer">
    <div class="item-info">
        <i>${product.price}/lb</i>
    </div>
    <AddToCart {product} {drop} capacity={pcap}/>
</div>

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
        background: var(--accent-color);
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
</style>
