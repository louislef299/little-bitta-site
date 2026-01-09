<!--
    A generic name like Toggle requires a description... this is just a theme
    toggle component. I'll need it to actually toggle off of a button with an
    icon if possible, but I need to focus on other aspects of the site first.
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import { Moon, Sun } from '@lucide/svelte';

    let currentTheme = $state<boolean>(false);
    let mounted = $state(false);

    function isDark(): boolean {
        var scheme = document.documentElement.getAttribute('data-theme')
        return scheme === 'dark'
    }

	function changeTheme() {
		if (isDark()) {
			document.documentElement.setAttribute('data-theme', 'light');
            currentTheme = false;
		} else {
			document.documentElement.setAttribute('data-theme', 'dark');
            currentTheme = true;
		}
    }

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
        mounted = true;
    });
</script>

<button type="button" onclick={changeTheme} class="theme-toggle">
    {#if mounted}
        {#if currentTheme}
            <Sun />
        {:else}
            <Moon />
        {/if}
    {/if}
</button>

<style>
    .theme-toggle {
        border: none;
        padding: 0.5rem;
        background: transparent;
        color: var(--text-color);
        cursor: pointer;
        transition: color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .theme-toggle:hover {
        color: rgb(170, 3, 248);
        background: transparent;
    }

    .theme-toggle:active {
        transform: none;
    }
</style>
