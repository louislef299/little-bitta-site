<script lang="ts">
    import { cart } from '$lib/cart/cart.svelte'
    import type { DropCapacity } from '$lib/server/db/drop';

    type Props = {
        capacity: DropCapacity | null;
    };
    let { capacity }: Props = $props();

    const cartItemCount = $derived.by(() => {
        let count = 0;
        cart.items.forEach(item => {
            count += item.quantity;
        });
        return count;
    });

    const dropPercentage = $derived(
        capacity ? ((cartItemCount + capacity.current) / capacity.max) * 100 : 0
    );
</script>

<div class="capacity-bar">
    <div class="progress-container">
        <div class="progress" style="width: {dropPercentage}%;"></div>
    </div>
    {#if capacity}
        <div class="capacity">{cartItemCount + capacity.current}/{capacity.max}</div>
    {/if}
</div>

<style>
    .progress-container {
        width: 100%;
        max-width: 400px;
        height: 12px;
        background: var(--bg-progress);
        border-radius: 8px;
        overflow: hidden;
        transform: translateZ(0);
    }

    .progress {
        height: 100%;
        background: linear-gradient(to right, #0ea5e9, #aa03f8);
        border-radius: 8px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateZ(0);
        will-change: width;
    }
</style>
