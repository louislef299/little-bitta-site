<script lang="ts">
    import { Mail } from '@lucide/svelte';
</script>

<footer>
    <div class="footer-left">
        © 2026 <a href="https://hammer-anvil.com">Hammer & Anvil.</a>
    </div>
    <div class="footer-right">
        <a href="mailto:llefebvre@hammer-anvil.com">
            <Mail />
        </a>
    </div>
</footer>

<style>
    footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 3rem;
        padding-top: 1.5rem;
        padding-bottom: 0.5rem;
        color: #888;
        font-size: 0.9rem;
    }

    footer a {
        color: #888;
    }

    footer a:hover {
        color: var(--accent-color);
    }

    .footer-left {
        text-align: left;
    }

    .footer-right {
        text-align: right;
    }
</style>