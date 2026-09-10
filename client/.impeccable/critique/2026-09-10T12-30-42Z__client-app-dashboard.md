---
target: dashboard all pages
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
target_identity: "file:C:\\Users\\SHAMIM\\Documents\\GitHub\\ora\\client\\client\\app\\(dashboard)"
timestamp: 2026-09-10T12-30-42Z
slug: client-app-dashboard
---
Method: dual-agent (A: a2823392db24720e8 · B: ab4b2ce4b148369dc)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | `overview-client.tsx:69-70` discards both state setters (`const [, setLoading]`, `const [, setError]`), so the main dashboard has no loading and no error UI; on fetch failure it renders $0 / 0 orders as if real. Live Desk has no loading, empty or error state. |
| 2 | Match System / Real World | 2 | Strong domain vocabulary ("products indexed", "Assisted Orders", bKash) undercut by invented jargon: "archetype" as the first word a merchant reads (`setup-guide-client.tsx:113`), "Simulation Lab", "ORA Neural Voice Gateway" (`voice-test-modal.tsx:168`), "ORA Active Operations". |
| 3 | User Control and Freedom | 1 | No undo on any destructive path. `setup-guide-client.tsx:395` marks a step complete on "Next Step" regardless of whether the work was done; `:285` marks the voice test complete merely on opening the modal. |
| 4 | Consistency and Standards | 1 | 176 raw `<button>` against exactly 1 import of `components/ui/button`; 52 raw `<input>/<select>/<textarea>` against 0 uses of the `ui/` equivalents. Radius mixes `rounded-none`, `rounded-[2px]`, `rounded-sm/md/xl/2xl` with no rule. Four different page-header systems. |
| 5 | Error Prevention | 1 | All three destructive actions use a browser `confirm()` (`current-plan-card.tsx:18`, `knowledge-feed-list.tsx:64`, `product-catalog-table.tsx:141`); none state the consequence. `setup-guide-client.tsx:266` defaults `publishableKey` to the literal `'biz_live_demo'`, so a merchant whose `/me` fails copies a dead embed snippet. |
| 6 | Recognition Rather Than Recall | 2 | Sidebar reflects archetype/role/step context well, but the setup flow reports three different totals: "Step 1 of 2" (`setup-guide-client.tsx:110`), "Step N of 4" (`:340`), "N of 4 steps completed" (`overview-client.tsx:293`). |
| 7 | Flexibility and Efficiency | 2 | Genuinely good URL-as-state (`?role=`, `?view=`, `?archetype=`, `?step=`) makes sub-views deep-linkable. But 0 `onKeyDown` handlers, no shortcuts, no command palette, no bulk actions anywhere in the dashboard. |
| 8 | Aesthetic and Minimalist Design | 3 | The strongest dimension: hairline borders, transparent surfaces, restrained palette, serif tabular numerals. Held back by a triple-label stack (icon chip + mono eyebrow + h1 + description) on every page and five fully-built, unreachable panels. |
| 9 | Error Recovery | 0 | Failures are systematically swallowed. `current-plan-card.tsx:23-25` catches a failed subscription cancellation with `// silent`. The `if (error)` branches at `billing-client.tsx:64` and `usage-client.tsx:54` are dead code — `setError` is only ever called with `null`. Notifications and conversations use `.catch(console.error)`. |
| 10 | Help and Documentation | 3 | Real strength: four substantive FAQ accordions (`setup-guide-client.tsx:84-102`) and KPI tooltips that actually define the attribution window (`overview-client.tsx:200`). Gap: no help for the widget-embed failure mode. |
| **Total** | | **17/40** | **Poor — major UX work required; the visual layer is not the problem** |

### Design Specificity Verdict

**Split verdict: the visual language is genuinely authored. The labeling layer and the data layer are the slop.**

**LLM assessment.** The composition is *not* the SaaS-card kit, and that is a deliberate, structural decision. `app/globals.css:22-29` overrides Tailwind's entire radius scale into a 2–8px range (`--radius-2xl: 0.375rem` = 6px, not 16px), so the standard AI reflex of reaching for `rounded-2xl` *cannot* produce a pillowy card in this codebase. Cards are `bg-transparent` with `border-border/50` hairlines and `divide-y` rather than drop-shadowed tiles (`kpi-strip.tsx:24`, `quick-actions-bar.tsx:29`). Only 7 gradient references and 17 `backdrop-blur` uses across 79 dashboard files. Metrics use `font-serif tabular-nums` (`kpi-strip.tsx:77`) — a real editorial choice.

Product-specific character is built, not implied. `globals.css:417-445` hand-builds a 7-bar waveform equalizer with per-bar resting heights and staggered delays, with `-secondary` and `-success` variants. `status-strip.tsx:26-55` puts a live dot, "Voice Agent Online/Paused", and a one-click storefront pause in one 40px row — answering the only question a voice-commerce merchant has on open. `sales-funnel.tsx:11-14` names the funnel in the product's own terms (Shopper Inquiries → Products Recommended → Items Added to Cart → Orders Completed), and its `01/02/03` markers are legitimate because a funnel genuinely is a sequence.

**But the page furniture is machine-generated.** One class string — `text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground` — is the standard label across the dashboard (97 `uppercase`, 238 `font-mono` occurrences), applied to contentless eyebrows above headings that already say what the page is. The tell is that the *same* eyebrow appears verbatim on two different pages: **"ORA Active Operations"** sits above both "Invoices & Subscription" (`billing-client.tsx:83`) and "Usage & Quota Limits" (`usage-client.tsx:73`). Others: "ORA Telemetry Feed" above "Notifications & Alerts", "ORA Active Intelligence", "Agent Capabilities · All Roles" (middle-dot meta join, 20 instances of `·`). Meanwhile `globals.css:487-493` defines `.ora-eyebrow` — the design system's own sanctioned utility — and **zero files use it**, while ~40 sites hand-copy an equivalent.

Type scale is per-component nudging rather than a scale: `text-[10.5px]`, `[11px]`, `[11.5px]`, `[12px]`, `[12.5px]`, `[13.5px]`, `[14.5px]`. And marketing copy has leaked into product UI, including a fabricated latency figure repeated five times: **"sub-85ms"** (`agent-client.tsx:170`, `agent-get-started-page.tsx:193`, `setup-arch-intro-page.tsx:290,300`, `setup-guide-client.tsx:52`), plus "ORA Neural Voice Gateway" and "eliminating hallucinations".

Could an unrelated SaaS use this unchanged? The chrome, no — the waveform, the widget pause, the attribution vocabulary are ORA's. The page furniture, yes — swap two words in those eyebrows and the billing/usage/notifications headers fit any product.

**Deterministic scan.** `impeccable detect` returned **12 findings, all `warning`/`slop`**, in only 3 files: `side-tab` ×10 (`components/dashboard/sidebar.tsx` ×9, `nav-item.tsx:80`), `gradient-text` ×1 and `bounce-easing` ×1 (both `components/orb/floating-orb-widget.css:385,137`). `app/(dashboard)` itself scanned **clean** (exit 0) — legitimate, since all 13 files there are 10–34 line wrappers. Zero findings in overview, agent, billing, conversations, customers, live-desk, notifications, profile, setup.

**The detector and the design review disagree, and that is the headline.** Assessment B judged all 10 `side-tab` hits false positives with a sound argument: every one is a sidebar nav active-state indicator using `border-l-2 pl-[calc(0.75rem-2px)]` with the colour applied only in the active branch and padding pre-compensated so layout does not shift — a left rail marking the current route is a navigation convention, and the rule's own text scopes it to cards. I agree. The 2 orb findings are real (`background-clip: text` over a gradient; a `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot). So the automated slop scan is effectively **2 real findings**, both in the floating-orb widget CSS, neither on a dashboard page.

Net: this dashboard does not have a visual-slop problem. It has an **honesty and consistency** problem that no detector rule catches — invented data presented as the merchant's own, falsified progress, swallowed errors, and a design system that was built and then bypassed 176 times.

**Visual overlays.** Not available. No browser automation tool is exposed in this session, so live-server, browser presentation and script injection were all skipped. Fallback signal: `browser automation unavailable: no browser tool exposed in session`. No user-visible overlay exists.

### Overall Impression

Someone with real taste set up the foundation, and then eleven pages were filled in without it. The token layer is disciplined and the voice-specific moments are genuinely well-observed — the waveform, the one-click storefront pause, the bKash activation screen. But the dashboard tells the merchant things that are not true: fake customers named "Nadia Rahman" in a live account, a setup checklist that pre-congratulates you for embedding a widget you have never touched, `$0` revenue that means "the API failed", and three KPI cards that link to a page which is only a `redirect()`.

The single biggest opportunity is not visual. **Adopt `components/ui/` and make the dashboard refuse to render a number it cannot vouch for.** Those two changes fix the consistency, focus-visibility, error-state, and trust findings simultaneously.

### What's Working

**1. The radius/surface system is an anti-slop decision enforced at the token layer.** `globals.css:22-29` caps `--radius-2xl`/`--radius-3xl` at 6px/8px, so the reflexive `rounded-2xl` renders tight. With `bg-transparent` cards, `border-border/50` hairlines and `divide-y` separators, the result reads as a dense operator tool. It works because the constraint is structural, not stylistic — it survives future contributors who don't know the rule.

**2. Voice affordances are built, not implied.** The 7-bar equalizer in `globals.css:423-445` gives each `nth-child` its own resting height and delay. `status-strip.tsx` answers "is my agent talking to customers right now, and can I stop it?" in one glance and one click — and the pause control's `title` says "*Temporarily* pause voice agent on your storefront", where one word does real emotional work on a scary control.

**3. URL-as-state makes deep surfaces addressable.** `agent-client.tsx:30-48` and `setup-guide-client.tsx:246-256` derive every sub-view from query params, validate against an allowlist, fall back gracefully, and even keep a legacy `?tab=` alias working. A merchant can paste "the persona screen" to a staff member as a link and the sidebar reflects that state on arrival. Most dashboards at this stage lose sub-view state in `useState`.

### Priority Issues

**[P0] The three headline KPIs drill down to a page that does not exist**
- **Why it matters:** "Attributed Revenue", "Assisted Orders" and "Conversion Rate" are the numbers that justify ORA's cost. All three are `<Link href="/orders">` (`overview-client.tsx:201,211,230`), and `app/(dashboard)/orders/page.tsx` is nothing but `redirect('/live-desk')`. A merchant clicking their revenue to ask "which orders?" lands on a real-time monitoring console with no order list in it. The click works, the page changes, the answer isn't there. `recent-activity-panel.tsx:59` shares the dead link.
- **Fix:** Build `/orders` as a real order list — `components/overview/recent-orders-table.tsx` is already written and orphaned — or repoint the three `href`s at `/conversations` where assisted-order evidence lives, and delete the redirect stub. Also drop `cards.slice(0, 4)` in `kpi-strip.tsx:28`, which silently discards the fifth KPI (Catalog Items) after computing and styling it.
- **Suggested command:** `$impeccable shape`

**[P0] Fabricated data is presented as the merchant's own, with demo mode off**
- **Why it matters:** `DEMO_MODE_ENABLED = false` (`lib/demo-config.ts:12`), but three paths bypass the flag. `customers-client.tsx:21` runs `setCustomers(res && res.length > 0 ? res : demoCustomers)` unconditionally — a new merchant sees "Nadia Rahman / nadia@example.com" and "Sarah Chen" with fake order counts as their customer list, and the genuinely good empty state at `customers-table.tsx:52` is unreachable because the array is never empty. `live-desk-client.tsx:140,144` render `{stats?.activeVoiceCalls ?? 2}` and `{?? 5}`, so a telemetry failure asserts "2 live voice calls · 5 orders assisted" on a real-time surface. `setup-guide-client.tsx:266` defaults the publishable key to `'biz_live_demo'`.
- **Fix:** One rule: no value renders without known provenance; unknown renders as `—`. Change the customers fallback to `setCustomers(res ?? [])`, replace `?? 2`/`?? 5` with `?? '—'`, initialise `publishableKey` to `null` and disable the copy-snippet CTA until a real key loads.
- **Suggested command:** `$impeccable harden`

**[P0] Setup progress is falsified, and the falsified step is the one that matters**
- **Why it matters:** `hooks/use-setup-progress.ts:106-108` marks the "Widget embed" step complete whenever `/me` returns a `publishableKey` — which every business has from signup. The one action that puts ORA on the merchant's storefront is pre-checked before they open their theme editor, so the overview banner reports "1 of 4 steps completed" on day zero. `setup-guide-client.tsx:395` marks steps complete on the "Next Step" click regardless of action, and `:285` marks the voice test complete on modal *open*. Progress lives in `localStorage` (`use-setup-progress.ts:18`), so a merchant who finished setup is nagged again on a new device. Net effect: the merchant believes they are live, they are not, and shoppers hit a store with no agent.
- **Fix:** Derive `integration` from evidence the widget actually loaded — the first widget telemetry/session event for that `businessId` — not from key existence. Remove the `markStepComplete` calls at `:395` and `:285`; mark the voice test complete on a completed session. Persist progress server-side so it survives a device change.
- **Suggested command:** `$impeccable onboard`

**[P1] `components/ui/` is built and bypassed — 176 hand-rolled buttons against 1 primitive import**
- **Why it matters:** This is the root cause of most other findings. `components/ui/button.tsx` ships correct `focus-visible:ring-3`, disabled and `aria-invalid` handling; the dashboard imports it **once**. Instead: 176 raw `<button className>` and 52 raw `<input>/<select>/<textarea>` with **0** imports of `ui/input`, `ui/select`, `ui/textarea`, `ui/card`, `ui/badge` or `ui/skeleton`. Consequences are measurable: `focus-visible` appears **3** times against **54** uses of `outline-none`/`outline-hidden`, so keyboard focus is largely invisible; `ui/skeleton.tsx` exists while every page shows a centred `Loader2`; and each button re-invents its height, radius and padding, which is why there are seven near-identical body sizes and six radius values.
- **Fix:** Adopt `ui/button` across the 176 call sites (mechanical — most map to `variant="ghost" size="sm"` or `variant="outline"`) and the `ui/` form controls for the 52 inputs, then delete the 54 `outline-none` overrides. This fixes focus visibility, disabled states and size/radius consistency across all 11 pages at once.
- **Suggested command:** `$impeccable polish`

**[P1] Every failure is swallowed; two error branches are provably dead code**
- **Why it matters:** The merchant is never told anything went wrong. `overview-client.tsx:69-70` discards both setters, so when `getDashboardStatsApi()` fails the dashboard shows **$0 revenue, 0 orders, 0 conversations** with no indication of failure — read as a catastrophic sales day, not a fetch error. In `billing-client.tsx:64` and `usage-client.tsx:54` the `if (error)` blocks are unreachable because `setError` is only ever called with `null`, so both pages silently render "Free Tier" and zero usage when the subscription API fails — factually wrong about the merchant's money. `current-plan-card.tsx:23-25` swallows a failed cancellation with `// silent`: the spinner stops and the merchant has no idea whether their agent is still paid for.
- **Fix:** Render the discarded state in `overview-client.tsx` — `ui/skeleton` while loading, inline retry banner on error — so zeros are never ambiguous. Actually call `setError(...)` in the billing/usage catch paths. Give cancel-subscription a real success and failure result.
- **Suggested command:** `$impeccable harden`

### Persona Red Flags

**Alex (impatient power user)** — running an apparel store, checking between customer calls.
- Clicks **Attributed Revenue** to see which orders drove it → Live Desk. Clicks **Assisted Orders** → Live Desk. **Conversion Rate** → Live Desk. Three attempts, zero answers, no error to explain it.
- Wants to look up a shopper who called yesterday. There is **no Customers entry in the sidebar** (`sidebar.tsx` has nine items, none of them customers) — yet `/customers` exists fully built. He cannot reach it without typing the URL.
- **0** `onKeyDown` handlers exist in the entire dashboard. No shortcuts, no command palette, no bulk select. Every action is a mouse trip to the sidebar.
- Live Desk re-polls five endpoints every 4 seconds (`live-desk-client.tsx:119`) with no refresh indicator, so rows shift under his cursor mid-click.

**Sam (screen reader + keyboard only)** — a merchant's ops hire.
- **Focus is invisible:** 54 `outline-none`/`outline-hidden` against 3 `focus-visible`. `kpi-strip.tsx:52` sets `outline-hidden` on a `tabIndex={0}` element.
- **Onboarding is unreachable by keyboard.** The 5 archetype tiles are `<div onClick>` with no `role`, no `tabIndex`, no key handler (`setup-guide-client.tsx:134-138`); the 4 agent role tiles are the same (`agent-hub.tsx:129-132`). `tabIndex` appears exactly **once** in the whole dashboard. Sam cannot choose an archetype or a role — that is the entire onboarding flow.
- Customer rows are `<tr onClick>` (`customers-table.tsx:70-76`) — mouse only.
- The revenue chart's SVG is `aria-hidden` (`revenue-chart.tsx:125`) with only `aria-label="Revenue performance chart"` on the wrapper. Sam is told a chart exists and given none of its data — no table alternative, no summary.
- Modals are inconsistent: `voice-test-modal.tsx:321` and `detail-drawer.tsx:76` have `aria-modal` and Escape; `product-upload-modal`, `knowledge-edit-modal`, `product-override-modal` and `knowledge-chunk-modal` have neither. No modal implements focus trap or focus restore.

**Casey (distracted mobile user)** — checking the store from a phone.
- **The dashboard has no mobile layout at all.** `sidebar.tsx:163` is `w-[240px]` with **no breakpoint**, no drawer, no overlay, and `app/(dashboard)/layout.tsx:26` hardcodes `style={{ marginLeft: collapsed ? 64 : 240 }}` with no media query. On a 390px phone the sidebar takes 62% of the viewport and content is squeezed into ~150px. The only escape is a collapse toggle inside the sidebar.
- Live Desk is three fixed columns — `w-[280px]`, `flex-1`, `w-[250px]` — 530px of fixed width before content, with no responsive class in the file. The centre transcript column collapses to nothing.
- Live Desk's metrics and Settings link are `hidden md:flex`, so on mobile Casey loses the live-call count and keeps an unlabelled Pause dot.
- Conversations is a two-panel `divide-x` split with no stacking.

### Minor Observations

- **Five fully-built, unreachable components:** `ora-attribution-panel.tsx` (135 lines), `recent-activity-panel.tsx`, `recent-orders-table.tsx`, `recent-conversations-table.tsx`, and `live-stats-bar.tsx` (97 lines). An entire "recent activity" layer was built and abandoned; `RecentOrdersTable` is exactly what P0-1 needs.
- **Contradictory status:** `overview-client.tsx:277` hardcodes a green-dot "Storefront Active" badge not bound to `isWidgetActive`, so it can read "Storefront Active" while `status-strip.tsx:38` says "Voice Agent Paused" 40px below. `live-desk-client.tsx:130` hardcodes a "Live" badge that never reflects the paused state.
- `sales-funnel.tsx:47` hardcodes the `0` prefix in `0{idx + 1}` — a 10-step funnel renders "010".
- `customers-table.tsx:15` initialises `selectedId` from `customers[0]?._id` in `useState`, so selection never updates when `onReload` brings new data.
- `ora-attribution-panel.tsx:69` uses the `Users` icon for "Products in Agent Catalog".
- `globals.css:199-259` scopes ~40 `--lp-*` landing-page tokens into `:root` where every dashboard component sees them; `current-plan-card.tsx:46`, `notifications-client.tsx:160` and `setup-guide-client.tsx:200` bypass tokens with the raw hex `dark:bg-[#C8F031]`.
- `top-header.tsx:32-36` hardcodes `toLocaleDateString('en-US')` on a product that explicitly serves Bangladesh with Bengali voice and BDT.
- `billing/bkash/callback/page.tsx:66` reaches for `rounded-2xl shadow-2xl` — the only soft-card look in the dashboard — and renders at 6px anyway because of the token override, so intent and result diverge.
- `overview-client.tsx:76` initialises `isWidgetActive` from `demoProfile` even with demo mode off; `:174` puts `stats.productTotal` in its own loader's dependency array.

### Questions to Consider

**1. What if the setup flow had exactly one archetype?** The FAQ at `setup-guide-client.tsx:91` states outright that all four config steps are identical across archetypes — the choice only swaps default prompt text. ORA is a voice sales agent for e-commerce merchants, yet four of the five options (SaaS, Agency, Creator & Portfolio, Enterprise & FAQ) describe businesses with no catalog to sync. Deleting the hub removes the largest decision point in the product, removes one of three conflicting step counts, and lets the merchant's first screen be the thing that matters: pasting the widget snippet.

**2. Should the dashboard be allowed to render a number it cannot vouch for?** Three mechanisms currently invent data — `?? 2` fallbacks, unconditional demo arrays, and `EMPTY_STATS` zeros on failure. All three exist because a blank dashboard looked bad in a demo. But a merchant deciding whether to keep paying is reading these as evidence. What would day one look like if it were honest, and is that emptiness actually a problem or a call to action?

**3. Is "setup progress" the wrong model for going live?** The four-step checklist is derived from proxies that don't mean what they claim: a key existing, a modal opening, a Next click. There is one fact that matters — *has a real shopper talked to my agent yet?* — and the backend can answer it from the first widget session event. Collapsing the apparatus into "Not yet live" / "Live, first conversation at 14:32" would make it unfalsifiable and kill the localStorage device-reset nag.

**4. Who is the Live Desk for, and can that person hold a phone?** It is the most differentiated surface in the product and the only page with literally zero responsive handling. A merchant getting notified that a shopper is asking about sizing is on a phone, not at a desk. Is a desktop-only three-column console the right form, or is the real product a single-column mobile stream of "shopper needs you now" with one-tap intervention?
