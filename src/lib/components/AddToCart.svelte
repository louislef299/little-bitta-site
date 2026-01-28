<script lang="ts">
    import {
        addToCart, getTotalForItem
    } from '$lib/cart/cart.svelte';
    import type { Drop } from '$lib/server/db/drop';
    import type { ProductCapacity } from '$lib/server/db/drop-product';
    import type { Product } from '$lib/server/db/product';

    type Props = {
		product: Product
		drop: Drop;
		pcap: ProductCapacity;
	};
	let { product, drop, pcap }: Props = $props();

    let isAvailable = $derived( pcap.max > pcap.sold + getTotalForItem(product.id) );
</script>

<div class="button-group">
    <button
        type="button"
        disabled={!isAvailable}
        onclick={() => {
            addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                drop: drop,
            })
        }}>
        Add To Cart {#if getTotalForItem(product.id) > 0}({getTotalForItem(product.id)}){/if}
    </button>
</div>

<style>
    .button-group {
        display: flex;
        gap: 0.5rem;
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