<script lang="ts">
    import type { Drop } from '$lib/cart/drops.svelte';
    import { getCurrentDrop, getDropCapacity } from '$lib/cart/drops.svelte';

    type DropWithCapacity = Drop & {
        current: number;
        max: number;
    };

    const dropCapacity = $state(getDropCapacity(getCurrentDrop().id));
    const dropPercentage: number = $derived((dropCapacity.current/dropCapacity.max) * 100);
    const dropPercentageCSS: string = $derived(dropPercentage + "%")
</script>

<div class="capacity-bar">
    <div class="progress-container">
        <div class="progress" style="width: {dropPercentageCSS};"></div>
    </div>
    <div class="capacity">{dropCapacity.current}/{dropCapacity.max}</div>
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
        height: 100%;
        background: linear-gradient(to right, #aa03f8, #0ea5e9);
        border-radius: 8px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateZ(0);
        will-change: width;
    }
</style>
