<script lang="ts">
    import { enhance } from '$app/forms';
    import type { PageProps } from './$types';

    let { data, form }: PageProps = $props();
    const { drops, products, dropProducts } = $derived(data);

    // Build a lookup: dropId -> productId -> { max_capacity, sold_count }
    const capacityMap = $derived(() => {
        const map = new Map<number, Map<number, { max_capacity: number; sold_count: number }>>();
        for (const dp of dropProducts) {
            if (!map.has(dp.drop_id)) map.set(dp.drop_id, new Map());
            map.get(dp.drop_id)!.set(dp.product_id, {
                max_capacity: dp.max_capacity,
                sold_count: dp.sold_count,
            });
        }
        return map;
    });

    function getCapacity(dropId: number, productId: number) {
        return capacityMap().get(dropId)?.get(productId) ?? null;
    }
</script>

<div class="admin-drops">
    <h1><a href="/admin">&larr; Admin</a> / Drop Management</h1>
    <p class="warning">This page is only accessible in development mode.</p>

    {#if form?.error}
        <p class="error-msg">{form.error}</p>
    {/if}
    {#if form?.message}
        <p class="success-msg">{form.message}</p>
    {/if}

    <!-- Create New Drop -->
    <section>
        <h2>Create New Drop</h2>
        <form method="POST" action="?/createDrop" use:enhance>
            <div class="form-grid">
                <label>
                    <span>Name</span>
                    <input type="text" name="display_name" placeholder="e.g. March" required />
                </label>
                <label>
                    <span>Year</span>
                    <input type="number" name="year" value={new Date().getFullYear()} min="2024" max="2100" required />
                </label>
                <label>
                    <span>Start Date</span>
                    <input type="date" name="start_date" />
                </label>
                <label>
                    <span>End Date</span>
                    <input type="date" name="end_date" />
                </label>
                <label>
                    <span>Prep Date</span>
                    <input type="date" name="prep_date" />
                </label>
                <label class="full-width">
                    <span>Description</span>
                    <input type="text" name="description" placeholder="Optional description" />
                </label>
            </div>
            <button type="submit">Create Drop</button>
        </form>
    </section>

    <!-- Per-Drop Product Capacity -->
    <section>
        <h2>Product Capacity by Drop</h2>

        {#each drops as drop (drop.id)}
            <details open={drop.status === 'active' || drop.status === 'upcoming' || drop.status === 'in_the_oven'}>
                <summary>
                    <strong>{drop.display_name} {drop.year}</strong>
                    <span class="status {drop.status}">{drop.status}</span>
                    {#if drop.start_date}
                        <span class="date-range">{drop.start_date} &rarr; {drop.end_date ?? '?'}</span>
                    {/if}
                </summary>

                <div class="drop-actions">
                    <form method="POST" action="?/updateStatus" use:enhance class="inline-form">
                        <input type="hidden" name="drop_id" value={drop.id} />
                        <label class="status-label">
                            Status:
                            <select name="status" class="status-select">
                                <option value="upcoming" selected={drop.status === 'upcoming'}>Upcoming</option>
                                <option value="in_the_oven" selected={drop.status === 'in_the_oven'}>In the Oven</option>
                                <option value="active" selected={drop.status === 'active'}>Active</option>
                                <option value="sold_out" selected={drop.status === 'sold_out'}>Sold Out</option>
                                <option value="ended" selected={drop.status === 'ended'}>Ended</option>
                            </select>
                        </label>
                        <button type="submit" class="save-btn">Update</button>
                    </form>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Max Capacity</th>
                            <th>Sold</th>
                            <th>Available</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each products as product (product.id)}
                            {@const cap = getCapacity(drop.id, product.id)}
                            {@const sold = cap?.sold_count ?? 0}
                            {@const max = cap?.max_capacity ?? 0}
                            {@const available = max - sold}
                            <tr class:sold-out={cap && available === 0} class:low-stock={cap !== null && available > 0 && available <= 3}>
                                <td>{product.name}</td>
                                <td>
                                    <form method="POST" action="?/setCapacity" use:enhance class="inline-form">
                                        <input type="hidden" name="drop_id" value={drop.id} />
                                        <input type="hidden" name="product_id" value={product.id} />
                                        <input
                                            type="number"
                                            name="max_capacity"
                                            value={cap?.max_capacity ?? ''}
                                            placeholder="0"
                                            min="0"
                                            class="capacity-input"
                                        />
                                        <button type="submit" class="save-btn">Set</button>
                                    </form>
                                </td>
                                <td>{cap ? sold : '-'}</td>
                                <td>
                                    {#if cap}
                                        {available}
                                    {:else}
                                        <span class="not-assigned">Not assigned</span>
                                    {/if}
                                </td>
                                <td>
                                    {#if cap && available === 0}
                                        <span class="status sold_out">Sold Out</span>
                                    {:else if cap && available <= 3}
                                        <span class="status low">Low</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </details>
        {/each}

        {#if drops.length === 0}
            <p>No drops yet. Create one above.</p>
        {/if}
    </section>
</div>

<style>
    .admin-drops {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    h1 a {
        text-decoration: none;
        color: var(--accent-color, #aa03f8);
    }

    .warning {
        background: #fef3c7;
        color: #92400e;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
    }

    :global([data-theme="dark"]) .warning {
        background: #78350f;
        color: #fef3c7;
    }

    .error-msg {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }

    .success-msg {
        background: #d1fae5;
        color: #065f46;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }

    section {
        margin-bottom: 2rem;
    }

    h2 {
        border-bottom: 2px solid var(--accent-color, #aa03f8);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }

    /* Create Drop Form */
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .form-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .form-grid label span {
        font-size: 0.85rem;
        font-weight: 600;
    }

    .form-grid .full-width {
        grid-column: 1 / -1;
    }

    .form-grid input {
        padding: 0.5rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 4px;
        font-size: 0.9rem;
    }

    button[type="submit"] {
        padding: 0.5rem 1.5rem;
        background: var(--accent-color, #aa03f8);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
    }

    button[type="submit"]:hover {
        opacity: 0.9;
    }

    /* Drop Capacity Sections */
    details {
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 6px;
        margin-bottom: 1rem;
        overflow: hidden;
    }

    summary {
        padding: 0.75rem 1rem;
        background: var(--bg-progress, rgba(0,0,0,0.03));
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .date-range {
        font-size: 0.8rem;
        color: #6b7280;
    }

    .drop-actions {
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        background: var(--bg-progress, rgba(0,0,0,0.02));
    }

    .status-label {
        font-size: 0.85rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .status-select {
        padding: 0.3rem 0.4rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 4px;
        font-size: 0.85rem;
    }

    .status.in_the_oven {
        background: #fef3c7;
        color: #92400e;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    th, td {
        text-align: left;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    th {
        background: var(--bg-progress, rgba(0,0,0,0.05));
        font-weight: 600;
    }

    tr.sold-out {
        background: #fee2e2;
    }

    tr.low-stock {
        background: #fef3c7;
    }

    :global([data-theme="dark"]) tr.sold-out {
        background: #450a0a;
    }

    :global([data-theme="dark"]) tr.low-stock {
        background: #451a03;
    }

    .inline-form {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .capacity-input {
        width: 5rem;
        padding: 0.3rem 0.4rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 4px;
        font-size: 0.85rem;
    }

    .save-btn {
        padding: 0.3rem 0.6rem;
        font-size: 0.8rem;
    }

    .not-assigned {
        color: #9ca3af;
        font-style: italic;
        font-size: 0.85rem;
    }

    .status {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .status.active {
        background: #d1fae5;
        color: #065f46;
    }

    .status.upcoming {
        background: #dbeafe;
        color: #1e40af;
    }

    .status.sold_out {
        background: #fee2e2;
        color: #991b1b;
    }

    .status.ended {
        background: #e5e7eb;
        color: #374151;
    }

    .status.low {
        background: #fef3c7;
        color: #92400e;
    }

    @media (max-width: 640px) {
        .form-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
