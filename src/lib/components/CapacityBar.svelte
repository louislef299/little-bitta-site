<script lang="ts">
    import type { Drop } from '$lib/cart/drops.svelte';
    import { getDrops } from '$lib/cart/drops.svelte';

    type DropWithCapacity = Drop & {
        current: number;
        max: number;
    };

    // For now, using mock data - you can replace this with real capacity data from your backend
    function getDropsWithCapacity(): DropWithCapacity[] {
        const drops = getDrops();
        // Mock capacity data - replace with actual data source
        const capacityData: Record<string, { current: number; max: number }> = {
            jan: { current: 45, max: 50 },
            fed: { current: 12, max: 50 },
            mar: { current: 50, max: 50 },
            apr: { current: 0, max: 50 },
        };

        return drops.map(drop => ({
            ...drop,
            ...capacityData[drop.id]
        }));
    }
</script>

<div class="capacity-bar">
    <div class="progress-container">
        <div class="progress"></div>
    </div>
</div>

<style>
    .progress-container {
        width: 100%;
        max-width: 400px;
        height: 12px;
        background: rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        overflow: hidden;
        transform: translateZ(0);
    }

    .progress {
        width: 75%;
        height: 100%;
        background: linear-gradient(to right, #aa03f8, #0ea5e9);
        border-radius: 8px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateZ(0);
        will-change: width;
    }
</style>
