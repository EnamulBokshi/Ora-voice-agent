# Project Architecture & Always-On Coding Rules

This repository enforces strict architectural and coding standards. All AI agents and developers working on this codebase MUST follow these rules at all times.

---

## 🚫 Non-Negotiable Directives

1. **Next.js 16+ Framework Basis**
   - Use Next.js 16+ modern features and conventions.
   - Verify official online documentation for modern Next.js 16+ APIs when implementing complex features.
   - **`middleware.ts` is DEPRECATED in Next.js 16+**: Never create or use `middleware.ts` / `middleware.js`. All authentication, session verification, request proxying, and accessibility rewrite rules MUST reside exclusively in `proxy.ts`.

2. **Server Components First (No `"use client"` in `page.tsx`)**
   - **`page.tsx` files MUST remain React Server Components (RSC)**.
   - **NEVER** place `"use client"` in any `page.tsx` file.
   - Delegate all client-side state (`useState`, `useEffect`), event handlers, and browser hooks (`useRouter`, `useSearchParams`) to reusable client sub-components inside `components/`.

3. **Component-Based Architecture & File Separation**
   - **ALWAYS** break down pages and features into small, single-responsibility components.
   - **NEVER** write monolithic single-file code. Separate UI presentation (`components/`), business logic (hooks/services), server operations (`actions/`), and type models (`types/`).

4. **Service & Action Organization (`services/` & `actions/`)**
   - **Server Actions**: All Server Actions (marked with `"use server"`) MUST be placed inside the `actions/` directory (e.g., `actions/bus-actions.ts`). Do not inline Server Actions inside components.
   - **API & Data Layer**: All external API integrations, HTTP requests, and data fetching services MUST reside in `services/` (e.g., `services/api.ts`, `services/bus-service.ts`).
   - UI components must never perform raw fetch calls directly.

5. **Reusability & Code Quality**
   - Follow the DRY (Don't Repeat Yourself) principle.
   - **Strict TypeScript**: Prohibit explicit or implicit `any` types. Define explicit types for props, API responses, and state objects.
   - Keep UI clean, responsive, and aligned with design tokens.

---

## 🎨 Design System — ORA Violet / Cyan Palette

The canonical color palette is defined in `client/app/globals.css`. **All components MUST consume CSS custom properties — never hardcode hex values.**

### Color Tokens

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--background` | `#12121A` | `#F7F7FB` | Page canvas (deepest layer) |
| `--card` / `--color-surface` | `#1B1C27` | `#FFFFFF` | Card / elevated surface |
| `--foreground` | `#EDEEF4` | `#15151F` | Primary readable text |
| `--border` | `#2A2C3A` | `#E4E4EE` | Structural borders |
| `--primary` | `#6C5CE7` | `#5645C7` | Electric Violet — primary actions, CTAs |
| `--secondary` | `#2DD4C8` | `#129E93` | Cyan Teal — accents, success states |
| `--muted-foreground` | `#8B8BA8` | `#6B6B8A` | Secondary text, labels |
| `--ora-success` | `#2DD4C8` | `#129E93` | Positive / growth / online |
| `--ora-warning` | `#FBBF24` | `#F59E0B` | Needs attention / caution |
| `--ora-error` | `#F87171` | `#DC2626` | System error / critical |
| `--ora-info` | `#818CF8` | `#5645C7` | Informational |

### Surface Elevation Scale (Dark Mode)

```
--surface-lowest:     #0D0D14   ← Sidebar / deepest UI layer
--surface-low:        #151620
--surface-container:  #1B1C27   ← Cards, panels (= --card)
--surface-high:       #22233A
--surface-highest:    #2A2C3A   ← Elevated interactive elements
--surface-bright:     #32334A   ← Tooltips, popovers
```

### Palette Usage Rules

- **Primary (`#6C5CE7`)**: Buttons, active nav indicators, focus rings, CTA gradients.
- **Secondary (`#2DD4C8`)**: Success states, "ORA Online" indicator, chart accent, hover glows.
- **Glassmorphism cards**: Use `background: rgba(255,255,255,0.03)` + `border: 1px solid rgba(255,255,255,0.08)` + `backdrop-filter: blur(16px)` — do NOT use flat solid background colors for dashboard cards.
- **Gradients**: Primary CTAs use `linear-gradient(135deg, #6C5CE7, #2DD4C8)`.
- **Glow effects**: Use `box-shadow: 0 0 24px rgba(108,92,231,0.35)` for primary glow, `0 0 24px rgba(45,212,200,0.25)` for secondary glow.
- **Never** use the old ORA forest-green (`#2C5745`, `#3d7a60`) or amber-orange (`#EB7D00`) values anywhere in the codebase.
