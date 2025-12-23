# little-bitta-site

Little Bitta Granola e-commerce website built with Bun, Svelte, Netlify
Functions, and Turso.

## Architecture

This project uses a serverless cloud-native architecture:

- **Frontend:** Svelte SPA(hosted on Netlify)
- **Backend:** Netlify Functions (serverless API)
- **Database:** Turso (cloud-hosted SQLite)
- **Payments:** Square

See [docs/cloud-arch.md](docs/cloud-arch.md) for complete architecture details.

## Documentation

- [Cloud Architecture](docs/cloud-arch.md) - Infrastructure, deployment, and
  scaling strategy
- [Customer-Facing Site](docs/customer-facing.md) - Public storefront
  implementation
- [Admin Panel](docs/admin-ui.md) - Product and order management interface

## Notes

Remember: Fundamentally, a SvelteKit app is a machine for turning a Request into
a Response.
