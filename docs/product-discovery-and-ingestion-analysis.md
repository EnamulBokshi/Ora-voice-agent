 # ORA Product Discovery & Storefront Ingestion Deep-Dive Analysis
**Author:** ORA Engineering Team  
**Target Audience:** Engineering, Product, and Integration Teams  
**Date:** August 2026  
**Status:** Completed Analysis & Architecture Recommendation  

---

## 1. Executive Summary

When integrating ORA with custom e-commerce stores built on modern frameworks such as **Next.js** (React) and **Laravel** (PHP/Blade), merchants reported that:
1. **URL Injection / Store Crawling** (`POST /api/v1/ingestion/crawl-store` or "Sync from Website") fails to discover products and returns 0 catalog items.
2. **Storefront Embed Script** (`ora-widget.js`) fails to passively capture and index products when added to the host application.

Our deep architectural analysis reveals that the system currently relies on **rigid assumptions** that hold true for standard platforms like Shopify and WooCommerce, but **break down completely on custom Next.js and Laravel applications**. Specifically:

- **The crawler has a hard failure when XML sitemaps are absent:** If `/sitemap.xml` does not exist, the backend immediately stops without attempting a homepage fallback or crawling internal `<a>` links.
- **The product parser strictly requires Schema.org JSON-LD or OpenGraph price tags:** Standard HTML elements (`<h1>`, `<div class="price">`, `<button>Add to Cart</button>`) are ignored.
- **The storefront widget is unaware of Single Page Application (SPA) navigation:** In Next.js, client-side route changes (`<Link>`, `router.push`) do not trigger full page reloads, causing the widget's one-time load hook to miss all visited products.
- **Client-Side Rendered (CSR) Next.js apps send empty HTML to the crawler:** A standard `fetch()` request gets an empty `<div id="__next"></div>` shell before React hydration.

This document presents a comprehensive breakdown of all failure points across the stack and outlines an actionable architecture to guarantee **100% product discovery** on any platform.

---

## 2. Root Cause Analysis (Technical Breakdown)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│                                   INSPECTION & FAILURE PATHWAY                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ Merchant Input: Domain / URL ]
                  │
                  ▼
       PlatformSnifferService
        ├── Shopify Probe (/products.json) ─────────► [❌ Fails for Next.js / Laravel]
        └── WooCommerce Probe (/wp-json/wc/...) ────► [❌ Fails for Next.js / Laravel]
                  │
                  ▼ (Platform Classified as 'custom')
       SitemapDiscoveryService
        ├── Checks: /sitemap.xml, /sitemap_index.xml, /sitemap_products_1.xml, /sitemap_pages_1.xml
        │
        └── IF 404 / Missing:
                  │
                  ▼
             [ 💥 FATAL BLOCK: Returns [] ]
             SitemapCrawlerService aborts with:
             "No public sitemap detected. Ingestion stopped."
             (Zero HTML fetching, zero link crawling, zero products ingested)

────────────────────────────────────────────────────────────────────────────────────────────────────

   [ Merchant Embed: ora-widget.js in Next.js / Laravel ]
                  │
                  ▼
       1. On Window Load Only (No SPA pushState / popstate listener)
                  │
                  ▼
       2. extractPageContext() Checks JSON-LD / OpenGraph Meta Price
                  │
                  ▼
       IF page is Homepage / Catalog listing OR lacks Schema.org JSON-LD:
                  │
                  ▼
             [ 💥 FATAL BLOCK: ctx.product === null ]
             triggerPassiveStorefrontSync() exits immediately.
             Zero API requests sent to /api/v1/ingestion/passive.
```

---

### Root Cause 1: Hard Dependency on 4 Static Sitemap XML URLs

In `server/src/ingestion/services/sitemap-discovery.service.ts`:
```typescript
const candidateSitemaps = [
  `https://${normalizedDomain}/sitemap.xml`,
  `https://${normalizedDomain}/sitemap_index.xml`,
  `https://${normalizedDomain}/sitemap_products_1.xml`,
  `https://${normalizedDomain}/sitemap_pages_1.xml`,
];
```

#### The Problem:
1. **Missing Homepage Fallback:** When all four candidate URLs return 404, `discover()` logs `logger.warn('No valid sitemap discovered; crawler should use homepage fallback')` and returns an empty array `[]`.
2. **Immediate Abort in Service:** In `server/src/ingestion/services/sitemap-crawler.service.ts` (`runGenericCrawl`):
   ```typescript
   const discovered = await this.discovery.discover(domain);
   if (discovered.length === 0) {
     return {
       platform: 'custom',
       productsIngested: 0,
       knowledgeDocsIngested: 0,
       htmlCrawlJobsQueued: 0,
       message: `No public sitemap detected for ${domain}. Please verify the domain or upload a catalog file.`,
     };
   }
   ```
   Because `discovered` is empty, **zero BullMQ background crawl jobs are queued**.
3. **Real-World Reality:** Many Next.js and Laravel applications (especially internal, early-stage, headless, or staging deployments) do not generate an XML sitemap or place it at custom paths (e.g. `/server-sitemap.xml`, `/sitemap/sitemap.xml`, or referenced inside `/robots.txt`).

---

### Root Cause 2: Strict Regex Classification Diverts Products to Knowledge Base

In `server/src/ingestion/services/sitemap-discovery.service.ts`:
```typescript
const PRODUCT_PATTERNS = [
  /\/products?\//i,
  /\/product\//i,
  /\/shop\//i,
  /\/item\//i,
  /\/p\//i,
];
```

#### The Problem:
- In custom Next.js or Laravel e-commerce architectures, product URLs frequently do not follow these exact sub-paths. Common patterns include:
  - `https://mystore.com/catalog/ultra-boost-sneaker`
  - `https://mystore.com/shoes/running/air-max-270`
  - `https://mystore.com/buy/macbook-pro-m3`
  - `https://mystore.com/electronics/headphones-1234`
- Any URL that does not match `PRODUCT_PATTERNS` is classified as `'page'`.
- In `SitemapCrawlerProcessor.process()`:
  - URLs classified as `'page'` are passed to `ReadabilityExtractor` and saved as **Knowledge Markdown Documents** in `KnowledgeBase`, completely bypassing the **Product Catalog Mirror** (`productsService.batchSync`).
  - As a result, the AI Voice Assistant tools (`find_products`, `get_product_details`, `add_to_cart`) cannot query these items because they do not exist in the `products` collection.

---

### Root Cause 3: Strict Schema.org JSON-LD & OpenGraph Requirement

In `server/src/ingestion/extractors/json-ld.extractor.ts`:
- The extractor attempts to find `<script type="application/ld+json">` with `@type: 'Product'`.
- If missing, it checks `<meta property="og:price:amount">` or `<meta property="product:price:amount">`.
- **If neither exists, `extractProduct()` returns `null`.**

#### The Problem:
In standard custom Laravel and Next.js projects:
- Developers build standard HTML views:
  ```html
  <div class="product-details">
    <h1 class="text-2xl font-bold">Wireless Noise-Canceling Headphones</h1>
    <div class="price-tag text-green-600">$199.99</div>
    <p class="description">Premium high-fidelity audio with active noise cancellation...</p>
    <img src="/images/headphones.jpg" alt="Headphones" />
    <button class="btn-primary">Add to Cart</button>
  </div>
  ```
- Because this template does not include JSON-LD or meta OG price tags, `json-ld.extractor.ts` returns `null`.
- `SitemapCrawlerProcessor` logs:
  `[SitemapCrawlerWorker] No JSON-LD/OG product found at ${discovered.url}`
  and **drops the product completely**.

---

### Root Cause 4: Client-Side Rendering (CSR) vs. Static Fetch

In `server/src/ingestion/services/sitemap-crawler.processor.ts`:
```typescript
private async fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  return await res.text();
}
```

#### The Problem:
- `fetch()` performs a raw HTTP GET request without executing JavaScript.
- In Next.js applications configured with **Client-Side Rendering (CSR)** or SPAs fetching product details via client-side hooks (`useEffect`, React Query, SWR):
  - The server response is an unrendered HTML shell:
    ```html
    <div id="__next"></div>
    <script src="/_next/static/chunks/main.js"></script>
    ```
  - Without JS execution, no text, title, price, or product metadata is present in the initial HTML.

---

### Root Cause 5: Storefront Widget Embed Limitations (`ora-widget.js`)

When embedding the script into a Next.js or Laravel project:

#### 1. Next.js SPA Client-Side Routing Blackhole
- In `ora-widget.js`, `triggerPassiveStorefrontSync()` is called once on window load:
  ```javascript
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(function () { triggerPassiveStorefrontSync(); });
    } else {
      setTimeout(triggerPassiveStorefrontSync, 1500);
    }
  }
  ```
- In Next.js (App Router `next/navigation` or Pages Router `next/router`), page navigation happens via HTML5 History API without reloading the page.
- When a user lands on the homepage and then clicks on a product, **the widget never triggers passive capture for the product page**.

#### 2. Localhost & Custom Domain API Base Misconfiguration
- In `ora-widget.js`:
  ```javascript
  var apiBase = _cfg.api || (scriptEl && scriptEl.getAttribute('data-ora-api')) || null;
  if (!apiBase) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiBase = window.location.protocol + '//' + window.location.hostname + ':5000';
    } else {
      apiBase = window.location.origin;
    }
  }
  ```
- If a Laravel developer is developing locally at `http://127.0.0.1:8000` and does not supply `data-ora-api`:
  - `apiBase` resolves to `http://127.0.0.1:5000` (which may not be running ORA API or may be blocked by CORS).
  - On a production custom store without `data-ora-api`, `apiBase` defaults to `window.location.origin` (the merchant's own domain, e.g. `https://my-laravel-store.com`), sending requests to `https://my-laravel-store.com/api/v1/ingestion/passive` which returns a **404 Not Found**.

#### 3. Single-Page Scope
- The embed script only ever knows about the page currently open in the visitor's browser. It does not perform catalog-wide discovery or spidering.

---

## 3. Comparison Matrix: Platform Behaviors

| Feature / Scenario | Shopify Store | WooCommerce Store | Custom Next.js Store | Custom Laravel Store |
|---|---|---|---|---|
| **Platform Sniffer (`/products.json`)** | ✅ Detected automatically | ❌ | ❌ (Classified as `custom`) | ❌ (Classified as `custom`) |
| **Store REST Probe (`/wp-json/wc/...`)** | ❌ | ✅ Detected automatically | ❌ | ❌ |
| **XML Sitemap Availability** | ✅ Native (`/sitemap.xml`) | ✅ Native (Yoast/RankMath) | ⚠️ Often missing in dev/custom | ⚠️ Often missing in dev/custom |
| **Catalog Auto-Discovery** | ✅ High (via FastPath API) | ✅ High (via Store API) | ❌ **Fails (0 items found)** | ❌ **Fails (0 items found)** |
| **Schema.org JSON-LD** | ✅ Standard in themes | ✅ Standard in themes | ⚠️ Unreliable / Custom | ⚠️ Unreliable / Custom |
| **SPA Route Handling** | N/A (Multi-page) | N/A (Multi-page) | ❌ **Widget misses transitions** | ⚠️ Misses if Livewire / Inertia |
| **HTML Rendering** | Server-rendered liquid | Server-rendered PHP | ⚠️ Often Client-rendered (CSR) | Server-rendered (Blade) |

---

## 4. Architectural Blueprint: Guaranteed Product Discovery

To make ORA work seamlessly on **any** Next.js, Laravel, or custom storefront, we recommend implementing a 4-pillar discovery engine:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                GUARANTEED PRODUCT DISCOVERY ENGINE                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   ┌────────────────────────────────────────────────────────────────────────────────────────────┐
   │ 1. Multi-Stage Fallback Crawler (Backend Ingestion)                                       │
   │    Stage 1: Primary Sitemaps (/sitemap.xml, /sitemap_index.xml, /robots.txt lookup)        │
   │    Stage 2: Common E-Commerce Hub Probing (/shop, /store, /products, /catalog, /collections)│
   │    Stage 3: BFS Link Spider (Crawl Homepage <a> links up to Depth 2-3)                     │
   └────────────────────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
   ┌────────────────────────────────────────────────────────────────────────────────────────────┐
   │ 2. Universal Hybrid Product Extractor                                                     │
   │    Strategy A: Schema.org JSON-LD & Microdata (itemscope itemtype="Product")              │
   │    Strategy B: OpenGraph & Twitter Card Meta Tags                                         │
   │    Strategy C: Heuristic Semantic DOM Parser (H1 titles, currency symbols, CTA buttons)   │
   │    Strategy D: LLM-Assisted Fast Extraction for unstructured HTML                          │
   └────────────────────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
   ┌────────────────────────────────────────────────────────────────────────────────────────────┐
   │ 3. Next-Gen Storefront Embed Widget (Client-Side ora-widget.js)                           │
   │    • HTML5 History API Hook (popstate, pushState, replaceState) for SPA/Next.js routes   │
   │    • Active DOM Heuristic Extraction (Extracts rendered React/Vue/Blade DOM directly)     │
   │    • DOM Catalog Harvester (Collects product card links from catalog/category pages)       │
   │    • Self-healing fallback to backend API proxy                                           │
   └────────────────────────────────────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
   ┌────────────────────────────────────────────────────────────────────────────────────────────┐
   │ 4. Alternative Merchant Channels (Direct & Instant)                                        │
   │    • 1-Click File Upload (CSV, XLSX, PDF, Google Merchant XML Feed)                        │
   │    • Framework SDKs / Packages (e.g. `ora-laravel` package, `@ora-ai/next` plugin)        │
   │    • Storefront Webhooks & REST Endpoint Connector                                        │
   └────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Detailed Engineering Solutions

### Pillar 1: Robust Spider & Fallback Crawler (`SitemapCrawlerService`)

When `sitemap.xml` is not found, the crawler should not abort. It should execute a **3-stage fallback**:

1. **Check `/robots.txt`**:
   - Parse `Sitemap: https://domain.com/custom-sitemap-path.xml` directives.
2. **Probe Standard Store Hubs**:
   - Probe `/shop`, `/store`, `/products`, `/catalog`, `/collections`, `/all-products`.
   - If any return HTTP 200, extract all internal `<a href="...">` links.
3. **BFS Homepage Link Spider**:
   - Fetch the root URL (`https://${domain}/`).
   - Extract all internal links `<a href="...">`.
   - Filter links using smart heuristics (e.g., links with product-like slugs or within listing grids).
   - Queue up to 500 discovered pages for asynchronous crawling.

```typescript
// Proposed Enhancement in SitemapDiscoveryService
async discoverWithFallback(domain: string): Promise<DiscoveredUrl[]> {
  // 1. Try standard sitemaps
  let urls = await this.discoverFromSitemaps(domain);
  if (urls.length > 0) return urls;

  // 2. Try robots.txt sitemap reference
  urls = await this.discoverFromRobotsTxt(domain);
  if (urls.length > 0) return urls;

  // 3. Fallback: Spider homepage and common store hubs
  this.logger.log(`No sitemap found for ${domain}. Launching fallback HTML spider...`);
  return this.spiderStorefrontLinks(domain);
}
```

---

### Pillar 2: Universal Semantic DOM Extractor

Enhance `JsonLdExtractor` into a **Universal Storefront Extractor** that extracts product details using multiple cascading strategies:

1. **Strategy 1 (JSON-LD & Microdata):** Schema.org `@type: "Product"` and `itemprop="name"`, `itemprop="price"`.
2. **Strategy 2 (OpenGraph / Meta):** `og:title`, `og:image`, `og:price:amount`, `product:price:amount`.
3. **Strategy 3 (Semantic HTML & DOM Heuristics):**
   - **Title:** Primary `<h1>`, `[class*="product-title"]`, `[class*="product-name"]`.
   - **Price:** Elements matching currency patterns (`/\$([0-9,]+(\.[0-9]{2})?)/`, `/৳([0-9,]+)/`, `/€([0-9,]+)/`, `/[0-9,.]+\s*(USD|EUR|BDT|GBP|Tk)/i`).
   - **Image:** `meta[property="og:image"]`, primary `<img class*="product">`, or largest image in the main viewport.
   - **Availability:** Detect presence of "Add to Cart", "In Stock", "Out of Stock", "Buy Now" buttons.
   - **Category:** Breadcrumb markup (`nav.breadcrumb`, `ul.breadcrumbs`, Schema `BreadcrumbList`).

---

### Pillar 3: Next-Gen Storefront Widget (`ora-widget.js`) Enhancements

Update `ora-widget.js` to handle modern SPAs and dynamically rendered storefronts:

#### 1. SPA Route Interception (Next.js / Inertia / Vue)
Hook into browser history changes to trigger passive synchronization whenever a user navigates to a new route in Next.js:

```javascript
// SPA Navigation Hook for Next.js, React Router, and Inertia.js
function listenToRouteChanges(callback) {
  var pushState = history.pushState;
  var replaceState = history.replaceState;

  history.pushState = function () {
    pushState.apply(history, arguments);
    window.dispatchEvent(new Event('ora_route_change'));
  };

  history.replaceState = function () {
    replaceState.apply(history, arguments);
    window.dispatchEvent(new Event('ora_route_change'));
  };

  window.addEventListener('popstate', function () {
    window.dispatchEvent(new Event('ora_route_change'));
  });

  window.addEventListener('ora_route_change', function () {
    // Debounce to allow React/Blade DOM to render new page content
    setTimeout(callback, 800);
  });
}
```

#### 2. Client-Side Rendered DOM Extraction
Because `ora-widget.js` runs **inside the customer's browser**, it has access to the **fully rendered React / Vue / Blade DOM** after all client-side JavaScript has executed. This completely bypasses the SSR/CSR crawler limitation:
- When a customer visits a product page, the widget reads the live rendered DOM.
- It extracts the product and sends it directly to `/api/v1/ingestion/passive`.

#### 3. Client-Side Catalog Listing Harvester
When a user visits a catalog or category page (`/shop`, `/products`), the widget can scan the rendered product grid (`.product-card`, `a[href*="/product/"]`) and harvest product URLs or metadata in the background.

---

### Pillar 4: Merchant Integration Best Practices for Next.js & Laravel

#### For Next.js Projects:

**Option A: Script Embed in Root Layout (`app/layout.tsx`)**
```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* ORA Voice AI Widget */}
        <Script
          src="https://cdn.ora.ai/widget/ora-widget.js"
          data-ora-key={process.env.NEXT_PUBLIC_ORA_KEY}
          data-ora-api={process.env.NEXT_PUBLIC_ORA_API_URL}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

**Option B: Add Standard JSON-LD Schema on Product Pages (`app/products/[slug]/page.tsx`)**
```tsx
export default function ProductPage({ product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.sku || product.id,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Product UI */}
    </div>
  );
}
```

---

#### For Laravel Projects:

**Option A: Master Blade Layout (`resources/views/layouts/app.blade.php`)**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ... -->
</head>
<body>
    @yield('content')

    <!-- ORA Voice AI Widget -->
    <script 
        src="https://cdn.ora.ai/widget/v2/ora-widget.js"
        data-ora-key="{{ config('services.ora.publishable_key') }}"
        data-ora-api="{{ config('services.ora.api_url') }}"
        defer>
    </script>
</body>
</html>
```

**Option B: Laravel Catalog Feed / XML Sitemap (`routes/web.php`)**
- Use `spatie/laravel-sitemap` to generate `/sitemap.xml` automatically.
- Or provide a simple product feed route (`/api/products-feed` or Google Merchant XML) that can be linked in the ORA Dashboard.

---

## 6. Implementation Roadmap & Priority Matrix

| Phase | Component | Action Items | Impact | Complexity |
|---|---|---|---|---|
| **Phase 1** | `sitemap-discovery.service.ts` | Implement Homepage fallback spider and robots.txt reader when candidate sitemaps 404 | 🔴 **High** (Resolves URL injection failure) | Medium |
| **Phase 2** | `ora-widget.js` | Add HTML5 History SPA listeners (`pushState`/`popstate`) & heuristic DOM extraction | 🔴 **High** (Resolves Next.js widget passive sync failure) | Low |
| **Phase 3** | `json-ld.extractor.ts` | Add Heuristic DOM extraction (H1, currency regex, microdata, button detection) | 🔴 **High** (Extracts products without JSON-LD) | Medium |
| **Phase 4** | Dashboard & Docs | Add Next.js and Laravel 1-click integration code generators in the merchant dashboard | 🟡 **Medium** (Improves onboarding DX) | Low |

---

## 7. Conclusion

The issue where Next.js and Laravel stores fail to sync products is caused by **strict coupling to platform-specific artifacts (Shopify/WooCommerce endpoints and standard XML sitemaps)** and **lack of SPA route tracking in the embed widget**.

By implementing:
1. **A Homepage BFS Spider fallback** in the crawler,
2. **Heuristic DOM price/title extraction**, and
3. **SPA navigation event listeners in `ora-widget.js`**,

ORA will reliably discover and index 100% of products across any custom framework, single-page application, or traditional server-rendered storefront.
