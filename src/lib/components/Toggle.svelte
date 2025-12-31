<!--
    A generic name like Toggle requires a description... this is just a theme
    toggle component. I'll need it to actually toggle off of a button with an
    icon if possible, but I need to focus on other aspects of the site first.
-->
<script lang="ts">
    import { onMount } from 'svelte';

    onMount(() => {
        const detectColorScheme = () => {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                console.log('User prefers dark mode');
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                console.log('User prefers light mode');
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', detectColorScheme);

        detectColorScheme();
    });

    function updateColorScheme() {
        var scheme = document.documentElement.getAttribute('data-theme')
        if (scheme === null) {
            console.log("got null scheme")
        }

        if (scheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
</script>

<!--
    Will need to come back and fix this, for now I'm just going to default to
    the system theme for my needs lol. Don't want to sear my eyeballs while
    working on this...

    <button onclick={updateColorScheme}>Theme Toggle</button>
-->