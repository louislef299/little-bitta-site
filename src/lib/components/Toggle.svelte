<!--
    A generic name like Toggle requires a description... this is just a theme
    toggle component. I'll need it to actually toggle off of a button with an
    icon if possible, but I need to focus on other aspects of the site first.
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import { Moon, Sun } from '@lucide/svelte';
    import { isDark, setTheme } from '$lib/toggle.svelte';

    const THEME_KEY = 'theme-preference';
    let mounted = $state(false);

	function changeTheme() {
		setTheme(isDark() ? 'light' : 'dark');
    }

    onMount(() => {
        // Check localStorage first
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
            console.debug('[Toggle] Using stored preference:', stored);
            setTheme(stored);
        } else {
            // Fall back to system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                console.debug('[Toggle] User prefers dark mode');
                setTheme('dark');
            } else {
                console.debug('[Toggle] User prefers light mode');
                setTheme('light');
            }
        }

        // Listen for system preference changes (only if no stored preference)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(THEME_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });

        mounted = true;
    });
</script>

<button type="button" onclick={changeTheme} class="theme-toggle">
    {#if mounted}
        {#if !isDark()}
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
