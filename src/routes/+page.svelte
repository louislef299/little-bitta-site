<script lang="ts">
    import CapacityBar from '$lib/components/CapacityBar.svelte';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    const { drop, capacity } = $derived(data);
</script>

<h2>Granola Made <i>Right</i></h2>
<p>
    Minneapolis based, homemade, small-batch granola. You can order granola
    online, but we currently don't support delivery, so it is your
    responsibility to pick it up yourself.
</p>

<h2>How It Works</h2>

<!-- TODO clean this up -->
<ul>
    <li>Buy Granola</li>
    <li>Receive Email</li>
    <li>Pick Up Granola</li>
    <li>Consume Granola</li>
    <li>Buy Again for Next Drop</li>
</ul>

<h3>Current Drop is for {drop.display_name} {drop.year}</h3>
<CapacityBar {capacity} />

<p>
    We operate on a limited drop-based system. This means that every month, we
    have a limited capacity of granola we can sell before we would get
    overwhelmed. Once we sell out for a drop period(typically one month), you
    have to wait until the next drop period opens. We hope to improve this user
    experience in the future. Thanks for understanding!
</p>
