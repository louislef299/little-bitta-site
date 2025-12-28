# HAMMER & ANVIL: Resilient Web Design Consulting

**Business Plan & Service Offering**

> Building websites that work like appliances, not like cars.

## Executive Summary

**What We Do:**
Deliver fast, secure, resilient websites to small businesses using modern web development principles (progressive enhancement, server-side rendering, static generation) without the complexity, cost, and maintenance burden of traditional solutions.

**Why It Works:**
- Small businesses overpay for slow, complex WordPress sites that require constant maintenance
- Modern tooling (SvelteKit, Netlify, Turso) enables dramatically lower costs
- Resilient Web Design principles create sites that actually work and stay working
- Case study: Little Bitta Granola (see [Customer-Facing Site](customer-facing.md))

**Target Market:**
Local small businesses (10-50 employees) currently spending $5k-$20k on websites that don't deliver value.

## The Problem

### What Small Businesses Face Today

**Expensive Agency Sites:**
- $8,000-$15,000 initial cost
- $100-$200/month maintenance
- Slow to update (wait for agency)
- Vendor lock-in

**WordPress DIY:**
- $500-$2,000 setup
- $50-$100/month (hosting + plugins)
- Constant security updates
- Sites break with plugin updates
- Hacking target (public admin panels)

**Wix/Squarespace:**
- $30-$100/month forever
- Slow page loads (bad SEO)
- Can't export/own your site
- Limited customization
- Death by a thousand add-on charges

**Common Pain Points:**
- "My site is slow and I don't know why"
- "It costs $200 every time I want to change my hours"
- "The plugin update broke my checkout"
- "My site got hacked and now I'm on a blacklist"
- "I'm paying $150/month and don't know what for"

## Our Solution

### Resilient Web Design Principles

Following the philosophies outlined in [our architecture docs](cloud-arch.md):

1. **HTML Foundation** - Content accessible without JavaScript
2. **Progressive Enhancement** - CSS adds style, JavaScript adds interactivity
3. **Server-Side Rendering** - Fast initial page loads, SEO-friendly
4. **Static + Serverless** - Pennies for hosting, zero maintenance

### Technology Stack

- **Frontend:** SvelteKit (SSR/SSG)
- **Hosting:** Netlify/Vercel (edge CDN)
- **Database:** Turso (when needed)
- **Payments:** Square/Stripe
- **Images:** Cloudinary or static assets

**Benefits:**
- Sites load in under 2 seconds
- No security vulnerabilities (no WordPress admin to hack)
- No maintenance (static sites don't break)
- Scales automatically (CDN edge distribution)
- Costs $5-20/month to host (vs $100-200/month traditional)

## Competitive Advantage

### What Makes Us Different

**1. Cost Structure**

Traditional WordPress Site (3-year cost):
```
Year 1: $8,000 (build) + $1,800 (hosting/maintenance) = $9,800
Year 2: $1,800
Year 3: $1,800
Total: $13,400
```

Our Resilient Design Approach (3-year cost):
```
Year 1: $3,500 (build) + $60 (hosting) = $3,560
Year 2: $60
Year 3: $60
Total: $3,680
```

**Savings: $9,720 (72% less) over 3 years**

**2. Performance**

- WordPress: 5-8 second load times (mobile)
- Wix/Squarespace: 3-6 second load times
- Our sites: 1-2 second load times
- **Result:** Better SEO, better conversions, better user experience

**3. Security**

- WordPress: 90% of hacked websites (target for bots)
- Our approach: No admin panel = nothing to hack
- Local-only admin (see [Admin Architecture](admin-ui.md))
- Zero public attack surface

**4. Ownership**

- Clients own their code
- Can move hosts anytime
- No vendor lock-in
- Source code in git repository

**5. Maintenance**

- Traditional: $100-200/month for updates, security patches, plugin management
- Our sites: $0/month (static sites don't need maintenance)
- Optional: Content update service at $50/update or $200/month retainer

## Market Opportunity

### Target Market

**Primary: Local Small Businesses**
- 10-50 employees
- Annual revenue: $500k-$5M
- Current bad/slow/expensive website
- Need online presence but not full e-commerce platform

**Industries:**
- Restaurants & Food Service
- Retail (local shops)
- Professional Services (dentists, lawyers, accountants)
- Home Services (plumbers, electricians, contractors)
- Artisan/Craft Businesses (like Little Bitta Granola)

**Market Size (Local):**
- 500+ small businesses in service area
- Estimated 60% have websites
- Of those, 80% are unhappy with current solution
- **Addressable market:** ~240 businesses

**Customer Acquisition:**
- Start with father's business network (warm leads)
- Chamber of Commerce connections
- Local business groups
- Word of mouth (happy customers)

## Service Tiers

### Tier 1: Brochure Site
**Price: $2,500-$3,500**

**Includes:**
- 5-10 pages (Home, About, Services, Contact, etc.)
- Mobile-responsive design
- Contact form
- SEO optimization
- Fast load times (< 2 seconds)
- Secure hosting setup
- SSL certificate
- Custom domain

**Ideal For:**
- Restaurants (menu, hours, location)
- Service businesses (what we do, contact us)
- Consultants (portfolio, bio, services)
- Professional offices

**Timeline:** 2-3 weeks

### Tier 2: E-Commerce Site
**Price: $4,500-$6,500**

**Includes:**
- Everything in Tier 1, plus:
- Product catalog (up to 50 products)
- Shopping cart
- Payment processing (Square/Stripe)
- Order management
- Inventory tracking
- Local-only admin panel (secure by design)

**Ideal For:**
- Retail shops
- Artisan products (see [Little Bitta case study](README.md))
- Small online stores
- Local makers/crafters

**Timeline:** 3-5 weeks

### Tier 3: Custom Application
**Price: $8,000+**

**Includes:**
- Custom business logic
- Booking/scheduling systems
- Customer portals
- Membership sites
- Custom integrations (CRM, accounting, etc.)

**Ideal For:**
- Service businesses with complex scheduling
- Membership organizations
- Businesses with unique workflows

**Timeline:** 6-10 weeks

### Add-On Services

**Content Updates:**
- One-time: $50/update
- Monthly retainer: $200/month (up to 4 updates)

**Additional Pages:**
- $200-300/page after initial build

**Analytics & SEO:**
- Setup: $500
- Monthly reporting: $100/month

## AI Strategy

### Our Position on AI

**AI is a TOOL, not a FEATURE:**

✅ **How We Use AI:**
- Code assistance (Claude Code, GitHub Copilot)
- Content generation (initial drafts)
- Image optimization
- SEO suggestions
- Development speed improvements

❌ **What We Don't Do:**
- AI chatbots on client sites
- "AI-powered" features that add complexity
- Anything that requires API costs passed to clients
- Hallucination-prone customer service bots

### Why No AI Chatbots?

**Problem 1: Reliability**
- AI hallucinates incorrect information
- "Does your restaurant have vegan options?" → Wrong answer = angry customer
- Legal liability for incorrect business information

**Problem 2: Cost**
- OpenAI API: $0.01-0.03 per conversation
- 1,000 chats/month = $10-30/month (small business can't justify)
- Costs scale unpredictably

**Problem 3: Philosophy**
- If users need a chatbot to find your hours/menu/prices, your site is poorly designed
- Good information architecture > AI band-aid
- Resilient web design means intuitive navigation, not intelligent assistance

**Problem 4: Complexity**
- Another thing to maintain
- Another thing to break
- Another thing to secure
- Defeats our "sites that work like appliances" value prop

### The Right Pitch

"We use cutting-edge AI tools to build your site faster and cheaper. But we don't add AI features that make your site slower, more expensive, or less reliable. Our sites work without AI because they're designed right from the start."

## Go-To-Market Strategy

### Phase 1: Proof of Concept (Months 1-2)

**Little Bitta Granola Case Study**
- Complete migration to resilient design principles
- Document performance improvements
- Track cost savings
- Gather testimonial from business owner
- Use as primary sales/portfolio piece

**Success Metrics:**
- Site loads in < 2 seconds
- Hosting costs < $10/month
- Zero maintenance issues first 6 months
- Business owner satisfaction: 9/10+

### Phase 2: Beta Customers (Months 2-4)

**Target: 3 Beta Clients**
- Offer 30% discount ($2,500 → $1,750 for brochure sites)
- In exchange: testimonials, case studies, referrals
- Focus on businesses with BAD current websites (easy to show improvement)

**Outreach:**
- Father's business network (warm leads)
- Local businesses he knows personally
- Chamber of Commerce connections

**Success Metrics:**
- 3 completed projects
- 3 testimonials gathered
- At least 1 referral from beta customers

### Phase 3: Local Market Expansion (Months 4-12)

**Marketing Channels:**

1. **Content Marketing**
   - Blog: "Why Your Small Business Doesn't Need WordPress"
   - Video: Speed comparison of local competitors
   - Case studies with real numbers
   - Email newsletter

2. **Partnerships**
   - Local business consultants
   - Accountants/bookkeepers (they know lots of small businesses)
   - Marketing agencies (white-label web dev)
   - Chamber of Commerce

3. **Direct Outreach**
   - Identify 50 businesses with terrible websites
   - Personalized email: "Your site loads in 8 seconds on mobile. We can get you to 1.5 seconds for half what you paid originally."
   - Offer free website audit

4. **Referral Program**
   - Happy clients get $500 credit for each referral
   - Creates viral growth loop

**Success Metrics:**
- 10-15 total clients by end of year 1
- $40k-60k revenue year 1
- 70%+ gross margin
- Net Promoter Score > 50

### Phase 4: Regional Expansion (Year 2+)

**Scale Options:**
1. **Geographic expansion** - Adjacent markets
2. **Vertical specialization** - Focus on one industry (restaurants, retail, etc.)
3. **Platform play** - Productize common features, offer templated solutions
4. **Agency model** - Hire developers, scale delivery

## Financial Projections

### Year 1 Conservative Estimate

**Revenue:**
- 6 Brochure sites @ $3,000 avg = $18,000
- 4 E-commerce sites @ $5,500 avg = $22,000
- 3 Content retainers @ $200/month × 6 months avg = $3,600
- **Total: $43,600**

**Costs:**
- Development time (200 hours @ $50/hr opportunity cost) = $10,000
- Tools/Software (Netlify, domains, etc.) = $1,000
- Marketing/Sales = $2,000
- Business expenses (LLC, insurance, etc.) = $1,500
- **Total: $14,500**

**Profit: $29,100 (67% margin)**

### Year 2 Growth Scenario

**Revenue:**
- 15 Brochure sites @ $3,000 avg = $45,000
- 8 E-commerce sites @ $5,500 avg = $44,000
- 5 Content retainers @ $200/month × 12 months = $12,000
- 2 Custom projects @ $10,000 avg = $20,000
- **Total: $121,000**

**Costs:**
- Development time (400 hours) = $20,000
- Contractor help (100 hours @ $40/hr) = $4,000
- Tools/Software = $2,500
- Marketing/Sales = $5,000
- Business expenses = $3,000
- **Total: $34,500**

**Profit: $86,500 (71% margin)**

## Risks & Mitigations

### Risk 1: Market Education
**Risk:** Businesses don't understand why static sites are better
**Mitigation:** Lead with tangible benefits (speed, cost, security) not technology

### Risk 2: Competition from Agencies
**Risk:** Established agencies have relationships and reputation
**Mitigation:** Compete on price, speed, and results. Target underserved small businesses agencies ignore.

### Risk 3: DIY Platforms (Wix/Squarespace)
**Risk:** "Why not just use Wix for $30/month?"
**Mitigation:** Show total cost of ownership (3-year comparison), performance difference, ownership benefits

### Risk 4: Scope Creep
**Risk:** "Can you just add one more feature?" leads to unprofitable projects
**Mitigation:** Fixed-price packages with clear scope. Additional features are separate quotes.

### Risk 5: Scaling Delivery
**Risk:** Can't take on more clients without more developers
**Mitigation:** Build reusable components, template common features, eventually hire/outsource

## Success Criteria

### 6-Month Goals
- [ ] Complete Little Bitta Granola site (case study)
- [ ] 3 beta customer projects completed
- [ ] $10,000+ revenue
- [ ] 3+ testimonials gathered
- [ ] Decision point: Continue or pivot?

### 12-Month Goals
- [ ] 10-15 total clients
- [ ] $40,000+ revenue
- [ ] 2+ referrals from existing clients
- [ ] Establish repeatable sales process
- [ ] Net Promoter Score > 50

### 24-Month Goals
- [ ] 25-30 total clients
- [ ] $100,000+ revenue
- [ ] Hire first contractor/employee
- [ ] Productize common features (restaurant template, retail template, etc.)
- [ ] Regional recognition as "the resilient web design company"

## Next Steps

### Immediate (This Week)
1. **Complete Little Bitta site** - Finish implementation following [development docs](local-dev.md)
2. **Document case study** - Before/after metrics, cost analysis
3. **Market validation** - Father talks to 10 local businesses about their website pain points

### Short-Term (This Month)
1. **Create pitch deck** - Use this document as foundation
2. **Build basic marketing site** - Showcase services and Little Bitta case study
3. **Identify 3 beta customers** - Warm leads from father's network
4. **Set up business entity** - LLC formation, business bank account

### Medium-Term (Next Quarter)
1. **Complete 3 beta projects** - Build portfolio
2. **Gather testimonials** - Social proof for future sales
3. **Refine offering** - Learn what works, adjust pricing/packages
4. **Launch content marketing** - Blog, case studies, local SEO

## References

This business plan is built on the technical foundation documented in:
- [Cloud Architecture](cloud-arch.md) - Infrastructure and deployment strategy
- [Customer-Facing Site](customer-facing.md) - Progressive enhancement approach
- [Admin Panel](admin-ui.md) - Security-first local-only admin design
- [Local Development](local-dev.md) - Development workflow

The Little Bitta Granola e-commerce site serves as the proof of concept and primary case study for this service offering.

---

**Last Updated:** December 2025
**Document Owner:** Louis Lefkowitz
**Business Contact:** Little Bitta Granola (father's business)
