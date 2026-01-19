# little-bitta-site

Little Bitta Granola e-commerce website built with SvelteKit, Netlify, and Turso,
following resilient web design principles.

## Design Philosophy

This project follows the principles of [Resilient Web Design][]:

1. **HTML Foundation** - Content is served as semantic HTML, accessible without
   JavaScript
2. **Progressive Enhancement** - CSS adds presentation, JavaScript adds
   interactivity
3. **Server-Side Rendering** - Pages render on the server for fast, resilient
   delivery
4. **Graceful Degradation** - Core functionality works even when JavaScript
   fails to load

Everyone is a non-JavaScript user until the JavaScript finishes loading. This
site works without JavaScript and gets better with it.

## Architecture

This project uses a serverless cloud-native architecture with progressive
enhancement:

- **Frontend:** SvelteKit with SSR/SSG (server-rendered HTML, client-side
  hydration)
- **Backend:** Netlify Functions + SvelteKit endpoints (serverless API)
- **Database:** Turso (cloud-hosted SQLite)
- **Payments:** Square
- **Hosting:** Netlify (static + edge functions)

See [docs/cloud-arch.md](docs/cloud-arch.md) for complete architecture details.

## Documentation

### Technical Documentation

- [Cloud Architecture](docs/cloud-arch.md) - Infrastructure, deployment, and
  scaling strategy
- [Customer-Facing Site](docs/customer-facing.md) - Public storefront
  implementation
- [Admin Panel](docs/admin-ui.md) - Product and order management interface
- [Local Development](docs/local-dev.md) - Development setup and workflow

### Business Documentation

- [HAMMER & ANVIL](docs/HAMMER_ANVIL.md) - Resilient Web Design consulting
  service offering and business plan

## Design Principles

**Three-Layer Enhancement:**

```
Layer 1 (HTML): Semantic markup, works everywhere
Layer 2 (CSS): Visual presentation, responsive design
Layer 3 (JavaScript): Interactivity, optimistic UI, transitions
```

**Core Functionality (HTML only):**

- View products and descriptions
- Add items to cart via POST forms
- Complete checkout and payment

**Enhanced Experience (+ JavaScript):**

- Smooth animations and transitions
- Optimistic UI updates
- Real-time cart preview
- Client-side form validation

Remember: Fundamentally, a SvelteKit app is a machine for turning a Request into
a Response. We render HTML on the server, then enhance it on the client.

[Resilient Web Design]: https://resilientwebdesign.com
