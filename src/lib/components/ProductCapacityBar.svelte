<script lang="ts">
    import { getTotalForItem } from '$lib/cart/cart.svelte'
    import type { ProductCapacity } from '$lib/server/db/drop-product';

    type Props = {
        pcap: ProductCapacity;
        productId: number;
    };
    let { pcap, productId }: Props = $props();

    // Get quantity of this specific product in cart
    const cartQuantity = $derived(getTotalForItem(productId));

    const percentage = $derived(
        ((cartQuantity + pcap.sold) / pcap.max) * 100
    );

    var availableForItem = $derived(pcap.max - (getTotalForItem(productId) + pcap.sold));
    const isSoldOut = $derived(availableForItem === 0);
</script>

<div class="capacity-bar">
    <div class="progress-container" class:sold-out={isSoldOut}>
        <div class="progress" style="width: {percentage}%;"></div>
    </div>
    <div class="capacity" class:sold-out={isSoldOut}>
        {#if isSoldOut}
            Sold Out
        {:else}
            {cartQuantity + pcap.sold}/{pcap.max}
            {#if availableForItem <= 3}
                <span class="low-stock">({availableForItem} left!)</span>
            {/if}
        {/if}
    </div>
</div>

<style>
    .capacity-bar {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .progress-container {
        width: 100%;
        max-width: 400px;
        height: 12px;
        background: var(--bg-progress);
        border-radius: 8px;
        overflow: hidden;
        transform: translateZ(0);
    }

    .progress-container.sold-out {
        background: #fee2e2;
    }

    .progress {
        height: 100%;
        background: linear-gradient(to right, #0ea5e9, #aa03f8);
        border-radius: 8px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateZ(0);
        will-change: width;
    }

    .progress-container.sold-out .progress {
        background: #dc2626;
    }

    .capacity {
        font-size: 0.85rem;
        color: var(--color-text-secondary, #666);
    }

    .capacity.sold-out {
        color: #dc2626;
        font-weight: 600;
    }

    .low-stock {
        color: var(--accent-color);
        font-weight: 500;
    }
</style>
