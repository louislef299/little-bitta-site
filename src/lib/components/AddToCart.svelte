<script lang="ts">
    import {
        addToCart, getTotalForItem, updateQuantity
    } from '$lib/cart/cart.svelte';
    import type { Drop, DropCapacity } from '$lib/server/db/drop';

    type Props = {
		id: number;
		name: string;
		price: number;
		drop: Drop;
		capacity: DropCapacity | null;
	};
	let { id, name, price, drop, capacity }: Props = $props();

    let isCurrentDropAvailable = $derived(capacity ? capacity.available > 0 : false);

    function reduceByOne(id: number) {
        updateQuantity(id, (getTotalForItem(id)-1));
    }
</script>

<div class="button-group">
    <button
        type="button"
        disabled={!isCurrentDropAvailable}
        onclick={() => {
            addToCart({
                id: id,
                name: name,
                price: price,
                drop: drop,
            })
        }}>
        +Cart {#if getTotalForItem(id) > 0}{getTotalForItem(id)}{/if}
    </button>
    <button type="button" onclick={() => reduceByOne(id)}>
        -Cart
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