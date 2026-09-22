# Product

ORA is a multi-tenant voice AI agent that businesses embed on their own website,
so a visitor can speak to it and get answers drawn from that business's own
material.

## Platform

Web. A merchant-facing dashboard and a public marketing site, plus an embeddable
widget script that runs on the customer's own storefront or site.

## Stack

pnpm workspace. Next.js 16 / React 19 / Tailwind 4 / shadcn / Base UI on the
client; NestJS and MongoDB on the server; Redis for sessions, caching and
webhook dedupe. Real-time voice runs over a raw WebSocket at `/ws/voice`.

## Users

Four deliberately distinct actor types: SuperAdmin, AdminUser (merchant staff),
Business (the tenant, holds keys), and Customer (the end visitor, session token
only, never a password).

The landing page's primary audience is narrower than the product's: **service
businesses — clinics, agencies and consultancies.** These are the archetypes
where a missed enquiry is lost revenue directly and there is no cart to recover,
and they are the ones the current e-commerce framing serves worst.

## Product Purpose

A business connects its material, embeds one script, and its website visitors
can hold a spoken conversation with an agent that answers from that business's
own knowledge rather than from general world knowledge.

## Positioning

**ORA is a voice AI agent for any business with a website. It is not an
e-commerce product.**

This is architectural fact, not aspiration. `server/src/common/constants/archetypes.ts`
defines seven archetypes — `ecommerce`, `saas`, `agency_services`, `consulting`,
`clinic_appointments`, `portfolio`, `general` — and `general` is the default.
Only `ecommerce` enables catalogue, cart and checkout behaviour. E-commerce is
one profile of seven, and not the one a new tenant starts in.

The marketing site as it stands contradicts this throughout, describing ORA as a
merchant and cart-recovery product. Correcting that is a requirement of the
current redesign, not an optional improvement.

## Operating Context

Visitors speak to ORA in whatever room they happen to be in, frequently on a
phone, frequently with background noise. Merchants train it by talking, often
from their own place of business. Neither party is at a desk in a quiet office,
and the interface cannot assume they are.

Payments run through Stripe and bKash, the latter indicating Bangladesh as a
served market.

## Capabilities and Constraints

What ORA does, as four capabilities that operate together rather than one
headline feature:

- **Trained by speaking.** A business owner talks; the transcript is split by
  topic and each topic filed on its own into a categorised knowledge base. No
  forms, no document upload, no prompt authoring.
- **Real-time spoken conversation.** Sub-second voice with interrupts and
  barge-in, on the business's own site. Not a text chat widget.
- **Answers only from that business.** Retrieval runs over the tenant's own
  catalogue and knowledge base under strict tenant isolation, so the agent
  cannot invent facts about the business.
- **One agent that reshapes per business type.** Each archetype carries its own
  persona, prompt, voice, playbook and knowledge. Switching archetypes switches
  profiles; nothing is overwritten, so switching back restores the previous
  setup intact.

Constraints that bind every surface:

- Tenant scoping is absolute. Every query touching tenant data filters by
  `businessId`.
- Three distinct credential types — publishable key, secret API key, OAuth
  machine token — which are not interchangeable.
- A new Business defaults to `status: 'pending'`, and a pending tenant's API
  calls fail.

## Brand Commitments

- **Never name the underlying model vendor in public-facing material.** The
  voice provider is an implementation detail; the product is ORA. This was
  stated directly by the product owner and applies to all marketing copy, page
  content and public documentation.
- Positioning is business-agnostic, per `## Positioning` above.
- **The marketing surface follows the category convention, played straight.**
  Offered the choice between an invented visual world and the category
  standard, the product owner chose the standard. Convention is therefore the
  commitment: it is executed at full fidelity, without irony and without
  smuggled quirk.
- **Craft bar: Linear, Vercel, Stripe.** Named by the product owner. Their
  level of typographic discipline, spacing rhythm, restraint in motion and
  precision in small detail is the standard the marketing surface is built and
  reviewed against. A page that would look unfinished beside those three is
  not done.
- **The lime accent is retained.** The open question of whether `#C8F031` was
  brand equity or part of what read as generic resolves in favour of equity:
  playing the convention straight means keeping ORA's own mark rather than
  replacing it.

## Evidence on Hand

**A live voice demo on the page is the only proof this product currently has,
and it is the strongest one available to it.** A visitor speaks to ORA in the
hero and hears it answer. It is not a claim about the product; it is the
product. `HeroVoiceCta` and `floating-orb-widget` already ship.

Explicitly unavailable, and therefore not to be used:

- **No customer count, conversation volume, recovery rate or revenue figure.**
  The values currently on the landing page (`8K+ merchants`, `1.2M+
  conversations`, `92.4% cart recovery`, `$6.8M recovered`) are fabricated.
- **No testimonial.** The quote attributed to "Rania Sultana, Head of
  E-commerce, FashionBD" is fabricated.
- **No customer logos.** The trust bar presents Shopify, WooCommerce, Stripe,
  Vercel, Notion and Slack under "Trusted by teams at". Shopify, WooCommerce
  and Stripe are genuine integrations and may be shown as such, clearly
  labelled. Vercel, Notion and Slack are neither integrations nor customers.

Open decision: whether measured latency figures are published. They exist in the
voice service as replay-measured values but have not been confirmed for public
use.

## Product Principles

- Claims come from supplied truth. Illustrative values are labelled as such or
  not shown.
- Knowledge entering the system is categorised automatically, never stored as
  one undifferentiated blob.
- The four capabilities are presented together as one mechanism, not ranked
  against each other.
