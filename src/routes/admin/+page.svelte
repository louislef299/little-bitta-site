<script lang="ts">
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    const { products, drops, dropProducts, orders, orderItems } = $derived(data);

    // Group order items by order_id for display
    function getOrderItems(orderId: number) {
        return orderItems.filter((item: any) => item.order_id === orderId);
    }
</script>

<svelte:head>
    <title>Admin - Dev Only</title>
</svelte:head>

<div class="admin">
    <h1>Admin Dashboard (Dev Only)</h1>
    <p class="warning">This page is only accessible in development mode.</p>

    <section>
        <h2>Drops</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Capacity</th>
                    <th>Sold</th>
                    <th>Available</th>
                </tr>
            </thead>
            <tbody>
                {#each drops as drop}
                    <tr class:active={drop.status === 'active'} class:sold-out={drop.status === 'sold_out'}>
                        <td>{drop.id}</td>
                        <td>{drop.display_name}</td>
                        <td>{drop.year}</td>
                        <td><span class="status {drop.status}">{drop.status}</span></td>
                        <td>{drop.max_capacity}</td>
                        <td>{drop.sold_count}</td>
                        <td>{drop.max_capacity - drop.sold_count}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>

    <section>
        <h2>Products</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Slug</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                {#each products as product}
                    <tr>
                        <td>{product.id}</td>
                        <td><code>{product.slug}</code></td>
                        <td>{product.name}</td>
                        <td>${product.price}</td>
                        <td>{product.product_type}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>

    <section>
        <h2>Drop Products (Per-Product Capacity)</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Drop</th>
                    <th>Product</th>
                    <th>Max</th>
                    <th>Sold</th>
                    <th>Available</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {#each dropProducts as dp}
                    {@const available = dp.max_capacity - dp.sold_count}
                    <tr class:sold-out={available === 0} class:low-stock={available > 0 && available <= 3}>
                        <td>{dp.id}</td>
                        <td>{dp.drop_name}</td>
                        <td>{dp.product_name}</td>
                        <td>{dp.max_capacity}</td>
                        <td>{dp.sold_count}</td>
                        <td>{available}</td>
                        <td>
                            {#if available === 0}
                                <span class="status sold_out">Sold Out</span>
                            {:else if available <= 3}
                                <span class="status low">Low Stock</span>
                            {:else}
                                <span class="status active">Available</span>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>

    <section>
        <h2>Orders</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Total</th>
                    <th>Items</th>
                    <th>Stripe Session</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                {#each orders as order}
                    <tr class:confirmed={order.status === 'confirmed'} class:pending={order.status === 'pending'} class:cancelled={order.status === 'cancelled'}>
                        <td>{order.id}</td>
                        <td><span class="status {order.status}">{order.status}</span></td>
                        <td>{order.customer_email || '-'}</td>
                        <td>${order.total_amount}</td>
                        <td>{order.item_count}</td>
                        <td><code class="truncate">{order.stripe_session_id || '-'}</code></td>
                        <td>{order.created_at}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>

    <section>
        <h2>Order Items</h2>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Drop</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                {#each orderItems as item}
                    <tr>
                        <td>{item.id}</td>
                        <td>{item.order_id}</td>
                        <td>{item.product_name}</td>
                        <td>{item.drop_name}</td>
                        <td>{item.quantity}</td>
                        <td>${item.unit_price}</td>
                        <td>${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>
</div>

<style>
    .admin {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
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

    section {
        margin-bottom: 2rem;
    }

    h2 {
        border-bottom: 2px solid var(--accent-color, #aa03f8);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    th, td {
        text-align: left;
        padding: 0.5rem;
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

    .status.confirmed {
        background: #d1fae5;
        color: #065f46;
    }

    .status.pending {
        background: #fef3c7;
        color: #92400e;
    }

    .status.cancelled {
        background: #fee2e2;
        color: #991b1b;
    }

    .status.low {
        background: #fef3c7;
        color: #92400e;
    }

    code {
        font-family: monospace;
        background: var(--bg-progress, rgba(0,0,0,0.05));
        padding: 0.1rem 0.3rem;
        border-radius: 2px;
        font-size: 0.8rem;
    }

    .truncate {
        max-width: 150px;
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: middle;
    }
</style>
