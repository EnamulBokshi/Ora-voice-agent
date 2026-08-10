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
