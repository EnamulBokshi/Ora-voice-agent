# Client Engineering Standards & AI Coding Rules (`client/`)

This document governs frontend development in the `client/` package (Next.js Dashboard & UI). All AI coding assistants and developers MUST follow these guidelines, aligned with [ORA-Final-Architecture.md (v5)](file:///home/nullpointer/Documents/work/hype_corporation/ORA/ORA-Final-Architecture.md).

---

## 🚫 Non-Negotiable Directives

### 1. Next.js 16+ Architecture Basis (`proxy.ts` mandatory)
- **Use Next.js 16+ conventions.** Verify modern Next.js APIs before implementation.
- **`middleware.ts` is DEPRECATED in Next.js 16+:** Never create or use `middleware.ts` / `middleware.js`. All authentication verification, session handling, request proxying, and route rewrite rules MUST reside exclusively in `proxy.ts`.

### 2. Server Components First (No `"use client"` in `page.tsx`)
- **`page.tsx` files MUST remain React Server Components (RSC).**
- **NEVER** place `"use client"` directive inside any `page.tsx` file.
- Delegate interactivity (`useState`, `useEffect`), event handlers, and browser hooks (`useRouter`, `useSearchParams`) to client sub-components inside `components/`.

### 3. Component-Based Architecture & File Separation
- Keep components focused, single-responsibility, and reusable.
- **NEVER** write monolithic single-file components.
- Enforce clean separation:
  - UI Presentation → `components/`
  - Business Logic & API Calls → `services/`
  - Server Actions → `actions/`
  - Types & Models → `types/` (or shared types package)

### 4. Service & Action Organization
- **Server Actions:** All Server Actions (marked with `"use server"`) MUST reside inside `actions/` (e.g., `actions/auth-actions.ts`, `actions/billing-actions.ts`). Do not inline Server Actions inside components.
- **API & Data Fetching:** External API integrations and HTTP requests belong in `services/` (e.g., `services/api.ts`, `services/business-service.ts`).
- UI components must **NEVER** perform raw `fetch` calls directly against external APIs. Use the centralized API client wrapper (`lib/api-client.ts`).

### 5. API Response Handling & Envelope Unwrapping
- The NestJS backend returns standardized envelopes:
  - Success: `{ success: true, data: T }`
  - Error: `{ success: false, error: { code, message, correlationId } }`
- `lib/api-client.ts` unwraps successful payloads directly and throws domain errors on `{ success: false, error }`.
- Client components and RTK slices interact with unwrapped typed data.

### 6. Client State vs Server State
- RTK (Redux Toolkit) is used for reactive client state (e.g., cart, active drawer state, live session UI).
- RTK is **never** the single source of truth for persisted data; full state must re-hydrate via server calls on mount.

### 7. Widget Embed & Delivery Architecture (v5 Section 11)
- The merchant embed code uses a two-stage loader pattern:
  ```html
  <script>
    (function(w,d,s,id){
      if (w.ORA) return;
      w.ORA = w.ORA || function(){ (w.ORA.q = w.ORA.q || []).push(arguments); };
      var js = d.createElement(s); js.id = id; js.async = true;
      js.src = "https://cdn.ora.ai/widget/v2/loader.js";
      d.body.appendChild(js);
    })(window, document, "script", "ora-widget");
    ORA('init', { apiKey: 'biz_live_xxxx' });
  </script>
  ```
- **Publishable Key (`biz_live_xxxx`):** Public tenant identifier, safe to display in merchant dashboard.
- **Shadow DOM Mount:** The widget mounts inside a Shadow DOM root to prevent host page CSS pollution.

---

## 🎨 UI & Aesthetics Baseline

- **Modern Typography & Glassmorphism:** Maintain clean, accessible typography (Inter / Roboto) and rich dark/light theme options.
- **Micro-Animations:** Use smooth CSS transitions and subtle hover effects for interactive elements.
- **No Direct Placeholders:** Use generated image assets or proper SVG icons rather than raw broken image links or generic text placeholders.
- **Strict TypeScript:** Prohibit `any` types. Explicitly type component props, server action responses, and form state.

---

## 8. Marketing / Landing Page Conventions

The public marketing site lives in the `(marketing)` Next.js route group. These rules govern all work in that area.

### Route Structure
```
app/
├── (marketing)/
│   ├── layout.tsx         ← Imports marketing.css; wraps with .lp-root
│   ├── marketing.css      ← Stitch "Lumina" design tokens (--lp-* prefix)
│   └── page.tsx           ← RSC landing page, assembles section components
└── (dashboard)/
    ├── layout.tsx          ← Dashboard sidebar layout (unaffected)
    └── dashboard/page.tsx  ← /dashboard — authenticated overview
```

### Component Folder
All marketing UI components live in `components/marketing/`:
- `navbar.tsx` — Scroll-aware fixed navbar (client component)
- `hero-section.tsx` — Hero with announcement pill, headline, dashboard preview card
- `trust-bar.tsx` — Brand logos row
- `features-section.tsx` — Bento grid feature cards
- `stats-section.tsx` — Dark gradient stats container
- `testimonial-section.tsx` — Pull-quote with attribution
- `cta-section.tsx` — Final CTA dark section
- `footer.tsx` — 4-column footer

### CSS Scoping Rules
- `marketing.css` uses the `.lp-root` class scope — tokens do **not** leak into the dashboard.
- All landing page tokens use the `--lp-*` prefix.
- **Never import `marketing.css` from dashboard layouts.**
- **Never use Tailwind `bg-primary` / `text-secondary` etc. inside marketing components** — use `--lp-*` CSS tokens directly.

### Auth Flow
- `/` → Public landing page (unauthenticated allowed)
- `/auth` → Login (unauthenticated only; redirects to `/dashboard` if already authenticated)
- `/dashboard` → Protected; redirects to `/auth?from=/dashboard` if not authenticated

