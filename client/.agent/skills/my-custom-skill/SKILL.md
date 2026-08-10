---
name: nextjs-best-practices
description: Core development rules and standards for Next.js 16+ applications, focusing on Server Components, clean architecture, reusability, proxy-based auth routing, services/actions separation, and industry best practices.
---

# Next.js 16+ Architecture & Coding Standards

This skill defines mandatory rules, patterns, and architectural constraints for development in this repository.

---

## 🚀 Core Directives & Standards

### 1. Next.js 16+ Modern Standards
- **Version Basis**: Always design and implement using **Next.js 16+** features, APIs, and modern paradigms.
- **Documentation Verification**: Always search and check official online documentation for up-to-date Next.js 16+ API specifications before implementing complex features.
- **Deprecated APIs**: Never use `middleware.ts` / `middleware.js` (deprecated in Next.js 16+). All routing guards, auth checks, and accessibility rewrite rules must reside in `proxy.ts`.

---

### 2. Strict Server Component Separation (No `"use client"` in `page.tsx`)
- **Server Components by Default**: **NEVER** mark any `page.tsx` file as a Client Component (`"use client"`). All `page.tsx` files MUST remain React Server Components (RSC).
- **Component Delegation**: Move all interactive state, event handlers, and browser hooks (`useState`, `useEffect`, `useRouter`, etc.) into dedicated client sub-components inside `components/` or local subfolders.
- **Data Fetching**: Perform async data fetching directly inside Server Components (`page.tsx` or layout components) and pass serializable data down to client sub-components.

---

### 3. Component-Based Architecture & Strict Code Separation
- **Modular Components First**: **ALWAYS** prefer a component-based architecture. Never write an entire page, feature, or complex UI in a single monolithic file.
- **File Separation**: Break down complex UI sections into smaller, single-responsibility components placed in `components/` or dedicated feature folders (e.g., `components/buses/BusTable.tsx`, `components/buses/BusMetricsCard.tsx`).
- **Clean Boundaries**: Keep visual presentation (components), business logic (custom hooks/services), server operations (`actions/`), and data structures (`types/`) in separate files.

---

### 4. Service & Action Organization (`services/` & `actions/`)
- **Server Actions (`actions/`)**: All Server Actions (functions annotated with `"use server"`) MUST be organized inside the `actions/` directory (e.g., `actions/bus-actions.ts`, `actions/auth-actions.ts`). Do not inline Server Actions inside page or component files.
- **API Services & Data Fetching (`services/`)**: All external API integrations, HTTP client callers, database layer queries, and data fetching services MUST reside inside the `services/` directory (e.g., `services/api.ts`, `services/bus-service.ts`).
- **Clean Separation**: UI components should never execute raw fetch requests or inline server database logic directly; they must import and call structured services or server actions.

---

### 5. Centralized Auth & Access Control (`proxy.ts`)
- **Single Source of Truth**: Define all authentication checks, route protection rules, session validation, and request proxying exclusively within `proxy.ts`.
- **Clean Routing**: Keep authentication logic decoupled from page components. Pages assuming access can safely execute knowing `proxy.ts` handles redirects and boundary checks.

---

### 6. Maximum Reusability & Clean Architecture
- **DRY Principle**: Avoid duplicating UI blocks, logic, or state handlers. Extract reusable primitives into component libraries (`components/ui/` or `components/shared/`).
- **Atomic & Modular Design**:
  - Keep components small, single-purpose, and focused.
  - Separate business logic (custom hooks) from visual presentation.
  - Group domain components logically by feature (e.g., `components/buses/`, `components/reports/`).
- **Design Tokens**: Standardize colors, spacing, and typography using CSS variables or central design tokens instead of ad-hoc arbitrary values.

---

### 7. Type Safety & Code Quality
- **Strict TypeScript**:
  - Prohibit explicit or implicit `any` types.
  - Define clear `interface` or `type` contracts for all component props, API payloads, and state models.
- **Clean Code Standards**:
  - Self-documenting, meaningful variable and function names.
  - Maintain low cognitive complexity and clean component trees.
  - Export utilities and components cleanly using index files or explicit module exports.

---

### 8. Performance & Security Best Practices
- **Optimal Image & Asset Loading**: Use `next/image` with proper width, height, and optimization attributes.
- **Dynamic Imports**: Lazily import heavy client-only dependencies using `next/dynamic`.
- **Security Baseline**: Sanitize user inputs, enforce HTTPS, and never expose sensitive keys or server secrets in client-facing components.

---

## 📋 Pre-Commit & Implementation Checklist

- [ ] Is `page.tsx` a Server Component without `"use client"`?
- [ ] Is the page broken down into small, modular components rather than a single file?
- [ ] Are all Server Actions in `actions/` and API integrations in `services/`?
- [ ] Are interactive elements properly isolated in reusable client components?
- [ ] Are authentication/routing policies handled in `proxy.ts` rather than `middleware.ts`?
- [ ] Are TypeScript types fully declared with zero `any` usages?
- [ ] Has modern Next.js 16+ API documentation been verified?
