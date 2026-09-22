---
version: 1
slug: "client-app-marketing-page-tsx"
primary_target: "client/app/(marketing)/page.tsx"
related_targets: []
---

# Surface brief — marketing landing page

## Scope

`client/app/(marketing)/page.tsx` and the nine section components it composes.

`MarketingNavbar` and `MarketingFooter` are shared with `/pricing`, `/solutions`
and `/docs`. Whether they are redesigned with this page or held back is an
unresolved decision below.

## Visitor mode

**Persuade.** The visitor decides and acts; design is the product here.

## Audience

Owners and operators of service businesses — clinics, agencies, consultancies.
Non-technical. They have a website that currently does nothing when someone
arrives with a question.

Deliberately not the primary audience, though still served by the product:
e-commerce merchants. The page must not read as written for them.

## Job

The visitor arrives wondering whether an AI agent on their own site would
actually be useful, and expecting either a chatbot they have already dismissed
or an enterprise product priced beyond them. They leave having heard ORA answer
them out loud, understanding that they train it by talking rather than by
configuring it.

## Action

Primary: **speak to ORA on the page.** This is both the conversion action and
the proof, which is unusual and is the page's main structural advantage.

Secondary: start for free.

## Proof and content

One source of proof: **the live voice demo.** The visitor talks; ORA answers.
Everything else on the page explains what they just experienced.

The hero is an **interactive, high-fidelity animated sequence that presents
ORA's capabilities one at a time**, automatically, with the live voice demo
available within it. Not a static screenshot, and not a fabricated metrics
dashboard.

Four capabilities, presented as one connected mechanism rather than a ranked
feature list:

1. Trained by speaking — talk, and it files what you said by topic.
2. Real-time spoken conversation — sub-second, interruptible, on your own site.
3. Answers only from your business — it cannot invent facts about you.
4. One agent that reshapes per business type — seven archetypes, switchable
   without losing prior setup.

The animated sequence is the natural carrier for these four: four beats, one
capability each, arriving in order.

## Constraints

- **Never name the model vendor.** Product owner instruction. No exceptions in
  any visible copy, alt text, metadata or structured data.
- **No fabricated proof.** The stats band and the testimonial section are cut.
  The product owner instructed deletion rather than commenting out for this
  redesign, overriding the project's usual disable-in-place rule.
- **Trust bar, if retained, is integrations and is labelled as integrations.**
  Shopify, WooCommerce and Stripe only. Vercel, Notion and Slack are removed —
  they are neither integrations nor customers.
- **Positioning is business-agnostic.** No "merchant", no "cart", no
  "e-commerce" as the framing of what ORA is. Cart recovery may appear as one
  archetype's capability, never as the product's definition.
- The animated hero must respect `prefers-reduced-motion`, must not autoplay
  audio, and must degrade to a usable static state.
- Accessibility floor: contrast 4.5:1 body, visible focus, keyboard operable,
  no horizontal scroll at 375px.

## Memorable moment

The visitor hears their own website's agent speak to them before they have
signed up for anything. Candidate for the signature interaction, to be settled
with the direction contract.

## Unresolved decisions

- Navbar and footer: redesigned now across all four marketing routes, or scoped
  to `/` with brief inconsistency accepted.
- Whether measured latency figures are published as supporting evidence.
- Whether the lime `#C8F031` is retained as brand equity or treated as part of
  what currently reads as generic. Belongs to the visual world decision.
- Whether marketing `--lp-*` tokens and dashboard `--surface-*` tokens converge.

## Direction contract

**THESIS.** The page proves instead of claiming: the visitor talks to ORA
before signing up for anything, and every number that cannot be backed is
gone. It refuses the arrangement this category usually ships not by inventing
a world, but by removing the fabricated proof that arrangement is normally
padded with.

**OWN-WORLD.** The category standard, played straight and at full fidelity.
Near-black canvas, the lime `#C8F031` as the single accent, real interface
imagery, hairline borders, one radius scale, restrained motion. Craft bar:
Linear, Vercel, Stripe. Authority comes from typographic discipline and
spacing rhythm, never from effects.

**STORY.** The visitor understands their site lets enquiries fall on the
floor. They believe ORA catches them, in their words, about their business
only. They speak to it on the page.

**FIRST VIEWPORT.** Headline and sub left or centred at a controlled measure,
two actions with the voice demo primary. Directly beneath, a single framed
product surface that cycles the four capabilities one at a time, automatically,
on a steady interval with a visible progress rail and manual tabs.

**FORM.** The canon, played straight. The standing exit, taken by the user
against assigned index 4 and against Impeccable's Pick. Seed key 27cf4a01.

**GUARD — no fabricated proof.** No customer counts, conversation volumes,
recovery rates, revenue figures, testimonials, customer logos or review
markup. The live demo is the only evidence, and it is the product itself.

**GUARD — full fidelity, no smuggled quirk.** Taking the canon means executing
it properly, not decorating it. No invented motif, no ironic distance, no
signature flourish imported from a direction that was not chosen.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Build path

Code-led. No image generation in this environment and no recorded `buildPath`.

## Directions not taken

The Switchboard, the Professional Threshold, the Night Flight Six-Pack, the
darkroom exposure record and the sewing pattern envelope all remain adoptable.
A full Switchboard implementation was built and reverted; the patch is
recoverable if the canon later proves too familiar.
