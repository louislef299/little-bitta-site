<script lang="ts">
    import type { Product } from '$lib/server/db/product';
    import type { ProductCapacity } from '$lib/server/db/drop-product';

    type Props = {
		product: Product;
        productCapacity: ProductCapacity;
	};
	let { product, productCapacity }: Props = $props();
</script>

<div class="image-container">
    <img class="shop" alt="{product.name} image" src={product.image_url} />
    {#if productCapacity.available === 0}
        <div class="sold-out-banner">Sold Out</div>
    {/if}
    {#if productCapacity.available > 0 && productCapacity.available <= 3}
        <div class="availability-badge">{productCapacity.available} Left!</div>
    {/if}
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
        background: #f59e0b;
        color: white;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
</style>
