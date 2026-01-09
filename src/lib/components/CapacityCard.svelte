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

    function getStatusInfo(current: number, max: number) {
        const percentage = (current / max) * 100;
        const remaining = max - current;
        
        if (percentage >= 100) {
            return { status: 'sold-out', icon: '✗', label: 'Sold Out', color: '#dc2626' };
        } else if (percentage >= 80) {
            return { status: 'limited', icon: '⚠️', label: `${remaining} left`, color: '#f59e0b' };
        } else {
            return { status: 'available', icon: '✓', label: 'Available', color: '#16a34a' };
        }
    }

    let dropsWithCapacity = getDropsWithCapacity();
</script>

<div class="capacity-card">
    <div class="drops-list">
        {#each dropsWithCapacity as drop}
            {@const statusInfo = getStatusInfo(drop.current, drop.max)}
            <div class="drop-item" data-status={statusInfo.status}>
                <div class="drop-header">
                    <span class="drop-name">{drop.long}</span>
                    <span class="status-badge" style="color: {statusInfo.color}">
                        {statusInfo.icon} {statusInfo.label}
                    </span>
                </div>
                <div class="progress-bar">
                    <div 
                        class="progress-fill" 
                        style="width: {Math.min((drop.current / drop.max) * 100, 100)}%; background-color: {statusInfo.color};"
                    ></div>
                </div>
                <div class="capacity-text">
                    {drop.current}/{drop.max} bags sold
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .capacity-card {
        background: var(--bg-color);
        padding: 1.5rem;
        margin-bottom: 2rem;
        /* Performance: Isolate layout calculations */
        contain: content;
    }

    .drops-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .drop-item {
        padding: 0.75rem;
        border-radius: 8px;
        background: rgba(170, 3, 248, 0.03);
        /* Removed hover transition for performance */
    }

    .drop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .drop-name {
        font-weight: 500;
        font-size: 1rem;
    }

    .status-badge {
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .progress-bar {
        height: 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
        /* Performance: GPU acceleration for animations */
        transform: translateZ(0);
    }

    .progress-fill {
        height: 100%;
        /* Optimized: Use transform instead of width for better performance */
        /* Keep width transition but make it faster and remove background-color
        transition */
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 4px;
        /* Performance: Promote to own layer */
        will-change: width;
        transform: translateZ(0);
    }

    .capacity-text {
        font-size: 0.75rem;
        color: var(--color-text-secondary, #666);
        text-align: right;
    }

    @media (max-width: 640px) {
        .capacity-card {
            padding: 1rem;
        }

        .drop-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }

        .status-badge {
            font-size: 0.8rem;
        }
    }
</style>
