# ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide

Welcome to **ORA**, the autonomous multimodal AI sales assistant that turns storefront visitors into paying customers through live voice conversations, dynamic catalog intelligence, and instant checkout flows.

This manual provides the step-by-step actionable instructions for store owners and digital agencies to set up, customize, embed, and scale their AI sales workforce.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Stage 1: Ingesting Your Store Intelligence (Zero Manual Entry)](#2-stage-1-ingesting-your-store-intelligence)
3. [Stage 2: Training Your AI Voice & Sales Persona](#3-stage-2-training-your-ai-voice--sales-persona)
4. [Stage 3: Embedding the 1-Line Storefront Widget](#4-stage-3-embedding-the-1-line-storefront-widget)
5. [Stage 4: Testing in the Dashboard Sandbox](#5-stage-4-testing-in-the-dashboard-sandbox)
6. [Stage 5: Live Desk, Conversions & Self-Healing Sync](#6-stage-5-live-desk-conversions--self-healing-sync)
7. [Agency & Service Provider Playbook](#7-agency--service-provider-playbook)
8. [Troubleshooting & FAQs](#8-troubleshooting--faqs)

---

## 1. System Architecture Overview

ORA operates on a multi-tiered ingestion and real-time retrieval engine:
- **Instant Website Sync**: Ingests public products, variants, pricing, return/refund policies, shipping terms, and FAQs.
- **Deduplication Engine**: Uses SHA-256 content hashing so duplicate pages or unchanged catalogs never waste database writes or vector embedding costs.
- **Zero-Latency Live Verification**: When talking to a shopper, ORA performs a live query-time check (`/products/{handle}.js`, WC Store API, or in-browser DOM reads) to verify prices and stock before recommending.

---

## 2. Stage 1: Ingesting Your Store Intelligence

### 1-Click Sync from Website URL
1. Log into your **ORA Dashboard** (`/dashboard`).
2. Go to **Ingestion & Catalog** &rarr; click **"Sync from Website"**.
3. Enter your store's primary website URL (e.g. `https://yourstore.com`).
4. ORA automatically detects whether you are running on **Shopify**, **WooCommerce**, **Custom Web**, or **Service/Agency Mode**:
   - **Products**: Ingests names, descriptions, images, variants, and prices.
   - **Policies**: Ingests Return/Refund policies, Shipping info, Terms of Service, and FAQs.
   - **Services**: Ingests service packages, pricing tiers, and booking/contact details.

### Offline Catalog Upload (CSV, Excel, PDF)
If you have private price lists or catalog spreadsheets:
1. Navigate to **Ingestion &rarr; Upload Catalog**.
2. Drag and drop your `.csv`, `.xlsx`, `.pdf`, or `.txt` file.
3. ORA's multi-format file parser maps headers (`name`, `price`, `sku`, `stock`) and generates vector embeddings automatically.

---

## 3. Stage 2: Training Your AI Voice & Sales Persona

1. Navigate to **Dashboard &rarr; AI Sales Agent** (`/agent`).
2. **Select Voice**:
   - **Nova**: High-energy, warm, friendly (ideal for Apparel, Lifestyle, D2C).
   - **Onyx**: Deep, confident, authoritative (ideal for Luxury, Tech, Automotive).
   - **Shimmer**: Calm, consultative, empathetic (ideal for Beauty, Wellness, Healthcare).
3. **Set Sales Style**:
   - **Consultative Assistant**: Asks discovery questions before recommending tailored products.
   - **Direct Closer**: Focuses on best-sellers, urgency, and promotional discounts.
   - **Lead Capture (Agencies & Services)**: Qualifies visitor budget and timeline to book discovery calls.
4. **Define Custom Brand Rules**:
   - *Example 1*: `"Always mention our 10% first-order discount code: WELCOME10."`
   - *Example 2*: `"Free shipping applies to all orders above $50."`
   - *Example 3*: `"If a customer asks about enterprise plans, ask for their business email."`

---

## 4. Stage 3: Embedding the 1-Line Storefront Widget

Copy your unique widget code snippet from **Dashboard &rarr; Agent Credentials**:

```html
<!-- ORA Voice AI Sales Assistant Widget -->
<script 
  src="https://cdn.ora.ai/widget/ora-widget.js" 
  data-ora-key="biz_live_YOUR_PUBLISHABLE_KEY" 
  async>
</script>
```

### Installation by Platform:

#### Shopify:
1. In Shopify Admin, go to **Online Store &rarr; Themes**.
2. Click **... &rarr; Edit Code**.
3. Open `layout/theme.liquid` and paste the snippet directly before the closing `</head>` or `</body>` tag.
4. Click **Save**.

#### WordPress / WooCommerce:
1. In WordPress Admin, install the free plugin **"WPCode"** or **"Insert Headers and Footers"**.
2. Paste the snippet into the **Footer Scripts** box.
3. Click **Save Changes**.

#### Next.js / React / Custom Headless:
Add into your root `app/layout.tsx`:
```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://cdn.ora.ai/widget/ora-widget.js"
          data-ora-key="biz_live_YOUR_PUBLISHABLE_KEY"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

#### Webflow / Squarespace / Wix:
1. Go to **Project Settings &rarr; Custom Code**.
2. Paste the snippet in the **Footer Code** box.
3. Publish changes.

---

## 5. Stage 4: Testing in the Dashboard Sandbox

Before launching publicly, test ORA inside the **Dashboard Voice Sandbox**:
1. Click **"Test Voice Agent"** in your dashboard.
2. Allow microphone access in your browser.
3. Speak naturally:
   - *"What are your top-rated products?"*
   - *"Do you offer returns if the size doesn't fit?"*
   - *"What's the price of the navy jacket?"*
4. ORA will reply in real-time with zero-latency audio streaming and accurate store data.

---

## 6. Stage 5: Live Desk, Conversions & Self-Healing Sync

- **Live Desk (`/live-desk`)**: Monitor live conversations in real-time. See live transcripts, shopper sentiment, and products discussed.
- **Analytics (`/dashboard`)**: Track total voice minutes used, sales conversions, and average order value (AOV) increases.
- **Self-Healing Sync**: When you change prices or stock levels on your store, ORA automatically discovers the new data during shopper interactions.

---

## 7. Agency & Service Provider Playbook

If you sell **services, consulting, design packages, or clinic appointments**:
1. ORA parses your `/services`, `/pricing`, `/case-studies`, and `/about` pages into the vector Knowledge Base.
2. In **Agent Settings**, set conversion goal to: **"Lead Qualification & Discovery Booking"**.
3. ORA will gather project scopes, qualify client budgets, and guide visitors to your Calendly / booking calendar.

---

## 8. Troubleshooting & Support

- **Widget Not Showing?** Ensure `data-ora-key` matches your exact publishable key (`biz_live_...`).
- **Microphone Blocked?** Ensure your site has valid HTTPS (browsers require HTTPS for Web Audio API).
- **Need Custom Setup?** Contact your dedicated ORA engineering support team at `support@ora.ai`.

---
*© 2026 ORA Inc. Autonomous Multimodal Voice Sales Agents. All rights reserved.*
