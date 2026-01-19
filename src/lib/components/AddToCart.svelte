<script lang="ts">
    import { 
        addToCart, getTotalForItem, updateQuantity 
    } from '$lib/cart/cart.svelte';
    import { 
        getCurrentDrop, isDropAvailable
    } from '$lib/cart/drops.svelte';

    type Props = {
		id: number;
		name: string;
		price: number;
	};
	let { id, name, price }: Props = $props();

    let currentDrop = getCurrentDrop();
    let isCurrentDropAvailable = $derived(isDropAvailable(currentDrop.id));

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
                drop: currentDrop,
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