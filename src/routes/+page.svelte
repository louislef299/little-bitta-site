<script lang="ts">
    import CapacityCard from '$lib/components/CapacityBar.svelte';
    import { getCurrentDrop, getDropCapacity } from '$lib/cart/drops.svelte';
    import { cart } from '$lib/cart/cart.svelte';

    const currentDrop = getCurrentDrop();
    const dropCapacity = $derived(getDropCapacity(currentDrop.id));
</script>

<h2>Granola Made <i>Right</i></h2>
<p>
    Minnesota based, homemade, small-batch granola. With everything made
    locally, and by the pro herself, you can comfortably know that you will get
    the best taste and quality in your granola, every time. To learn more about
    our story, check out <a href="/about"><code>/about</code></a>.
</p>

<h2>Contact Michele Directly</h2>
<p>
    We are currently a small brand and only allow orders to run through email. If
    you would like to try out our granola, feel free to email us at
    littlebittagranola@gmail.com with your name, address and order request and we
    will get back to you as soon as possible. We currently only operate in the
    Minnesota metro area.
</p>

<h2>Limited Drop Availability</h2>

<h3>{currentDrop.long} {currentDrop.year}</h3>
<CapacityCard capacity={dropCapacity} />

<p>
    We operate on a limited drop-based system. This means that every month, we
    have a limited capacity of granola we can sell before we would get
    overwhelmed. Once we sell out for a drop period(typically one month), you
    have to wait until the next drop period opens. We hope to improve this user
    experience in the future. Thanks for understanding!
</p>
