<script lang="ts">
    import {
        addToCart, getTotalForItem
    } from '$lib/cart/cart.svelte';
    import type { Drop } from '$lib/server/db/drop';
    import type { ProductCapacity } from '$lib/server/db/drop-product';

    type Props = {
		id: number;
		name: string;
		price: number;
		drop: Drop;
		capacity: ProductCapacity | null;
	};
	let { id, name, price, drop, capacity }: Props = $props();

    let isAvailable = $derived(capacity ? capacity.available > 0 : false);
</script>

<div class="button-group">
    <button
        type="button"
        disabled={!isAvailable}
        onclick={() => {
            addToCart({
                id: id,
                name: name,
                price: price,
                drop: drop,
            })
        }}>
        Add To Cart {#if getTotalForItem(id) > 0}({getTotalForItem(id)}){/if}
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