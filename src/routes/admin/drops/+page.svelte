<script lang="ts">
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    const { drop } = $derived(data);
</script>

<h1>Drops</h1>
<p>Current drop: {JSON.stringify(drop)}</p>