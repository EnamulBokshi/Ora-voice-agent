# Voice Knowledge Auto-Categorization Plan: Universal Business Generalization & Zero-Friction Ingestion

## 1. Executive Summary & Vision

In ORA, merchants train their AI sales agent by speaking naturally—explaining their store rules, products, pricing tactics, and policies out loud. 

Currently, many systems force users to manually choose a category beforehand (e.g., clicking *"Store Policy"*, *"Product Manual"*, or *"FAQ"*). **This creates cognitive friction.** Merchants hesitate, struggle to map their thoughts to rigid taxonomy buttons, or have multi-topic thoughts that don't fit into a single bucket.

This document outlines the architecture for **Universal, Zero-Friction Voice Knowledge Auto-Categorization**:
1. **Zero Upfront Classification:** The merchant simply speaks or dictates naturally. No checkboxes, no pills to select beforehand.
2. **Universal Business Invariants:** A generalized 5-pillar domain model that maps seamlessly across *any* business type (E-commerce, SaaS, Dental Clinics, Agencies, Real Estate, Restaurants).
3. **Atomic Rule Decomposition:** A single spoken session (e.g. 45 seconds of continuous talking) is automatically dissected into discrete, single-topic knowledge entries rather than stored as one monolithic blob.
4. **Transparent Post-Processing Feedback:** After speaking, the merchant immediately sees clean cards showing what the AI understood, the category it assigned, and the exact rule it filed.

---

## 2. The Core Problem: Why Hardcoded Categories Fail

Hardcoded categories (e.g. `policy`, `product_manual`, `brand_rule`) were designed with traditional retail in mind. When applied across diverse businesses, they quickly break down:

| Business Model | What Hardcoded Categories Expect | What the Business Actually Talks About | Why It Breaks |
|---|---|---|---|
| **E-Commerce / Apparel** | *Product Manual, Shipping, Returns* | Return windows, courier advance fees, sizing charts, fabric washing. | Works reasonably, but courier fees overlap policy vs logistics. |
| **B2B SaaS / Software** | *Product Manual, Shipping* | API rate limits, seat pricing, SLA uptime guarantees, SOC2 compliance. | SaaS has zero "shipping" or "materials"; feels awkward and foreign. |
| **Clinics / Healthcare / Salons** | *Product Manual, Brand Rule* | Appointment cancellation notice, consultation fees, insurance accepted. | Healthcare has no "products" or "returns"; they have procedures & prep. |
| **Real Estate & Property** | *Shipping, Policy* | Security deposits, pet policies, minimum lease terms, viewing hours. | "Shipping" is meaningless; rules are legal covenants and terms. |
| **Restaurants & Hospitality** | *Product Manual, Policy* | Allergen disclosures, halal certification, reservation hold times, catering. | Menu items and ingredients don't match standard manuals. |

**The Lesson:** Forcing merchants to categorize their own business knowledge upfront leads to categorization paralysis, incorrect filings, and poor search retrieval.

---

## 3. The 5 Universal Business Invariants (Functional Pillars)

Regardless of industry—whether selling physical shirts, cloud subscriptions, root canals, or luxury apartments—every commercial business on earth has the exact same **5 fundamental questions** that prospective customers and shoppers ask:

```
                            ┌────────────────────────────────────────┐
                            │    Customer Inquiry / Question Space   │
                            └───────────────────┬────────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         ▼                  ▼                   ▼                   ▼                  ▼
┌─────────────────┐┌─────────────────┐┌──────────────────┐┌──────────────────┐┌─────────────────┐
│ 1. Offerings &  ││ 2. Operations & ││ 3. Commercials & ││ 4. Logistics &   ││ 5. Objections & │
│  Capabilities   ││   Guardrails    ││      Deals       ││   Fulfillment    ││      FAQs       │
└─────────────────┘└─────────────────┘└──────────────────┘└──────────────────┘└─────────────────┘
```

### Pillar 1: Offerings & Capabilities (*"What can I get from you?"*)
- **E-Commerce:** Product dimensions, materials, fabric composition, color variants, sizing specifications.
- **SaaS:** Features, third-party integrations, API capabilities, browser extensions, user seats.
- **Clinics / Salons:** Procedures offered, treatments, doctor specialties, equipment used.
- **Real Estate:** Square footage, bedroom count, amenities (gym, parking, pool), building age.

### Pillar 2: Operational Rules & Guardrails (*"What are the terms and boundaries?"*)
- **E-Commerce:** Return window (e.g. 7 days), exchange conditions (security tag intact), damage reporting.
- **SaaS:** Cancellation policy, refund terms on annual plans, data export rules upon churn.
- **Clinics:** 24-hour cancellation notice, late arrival grace period (15 mins), patient intake requirements.
- **Real Estate:** Pet restrictions, smoking rules, subletting policies, security deposit return terms.

### Pillar 3: Commercials & Deals (*"How much is it and how do I pay?"*)
- **E-Commerce:** Cash on delivery (COD), bKash advance requirements, volume bundles, coupon codes.
- **SaaS:** Monthly vs. annual pricing discounts, enterprise quote thresholds, overage fees.
- **Clinics:** Consultation fees, payment installment plans, health insurance providers accepted.
- **Real Estate:** Monthly rent, utility coverage, deposit amounts, parking spot add-on fees.

### Pillar 4: Logistics & Fulfillment (*"How and when do I actually get it?"*)
- **E-Commerce:** Delivery timelines (24-48h in Dhaka, 3-5 days outside), courier partners (Pathao/Steadfast).
- **SaaS:** Account activation time (instant), workspace provisioning, onboarding turnaround.
- **Clinics:** Clinic physical address, parking availability, waiting room check-in, telehealth link delivery.
- **Real Estate:** Move-in dates, key exchange protocols, freight elevator booking rules.

### Pillar 5: Inquiries, Objections & Brand Persona (*"Why should I choose you?"*)
- **E-Commerce:** "Are your products 100% original?", "Will the color fade after washing?"
- **SaaS:** "How do you compare to Competitor X?", "Where is our data stored?", "Is this SOC2 certified?"
- **Clinics:** "Is the whitening procedure painful?", "Are walk-ins allowed?", "Do you treat children?"
- **Brand Rules:** Tone of voice (warm and polite), company backstory, forbidden words.

---

## 4. The Two-Tier Auto-Categorization Architecture

To achieve both high search retrieval accuracy for the AI voice agent and human readability for the merchant, the system uses a **Two-Tier Semantic Classification Model**:

```
Merchant Spoken Voice Input
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│        AI Voice Ingestion & Transcription Engine        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Topic Decomposition Pipeline               │
│  (Splits multi-topic speech into discrete atomic units)  │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│  Tier 1: Machine Pillar   │ │ Tier 2: Dynamic Semantic  │
│    (RAG Routing Scope)    │ │           Topic           │
│                           │ │    (Human Descriptive)    │
│  • offerings              │ │                           │
│  • operations             │ │  • "Courier Advance Fee"  │
│  • commercials            │ │  • "Sizing & Measurements"│
│  • logistics              │ │  • "API Rate Limits"      │
│  • inquiries              │ │  • "Intact Tag Return"    │
└───────────────────────────┘ └───────────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│        Deduplication & Storage in Knowledge Base        │
└─────────────────────────────────────────────────────────┘
```

### Tier 1: Machine-Level Functional Pillar (Engine Routing)
Under the hood, every parsed rule is tagged with one of the 5 universal pillars. 
* **Purpose:** When a live shopper during a call asks: *"Can I return this if it doesn't fit?"*, the voice agent's retrieval router searches strictly within the **Operations** and **Offerings** index rather than scanning payment gateways or company backstory.
* **Storage:** Stored in the document's metadata or mapped to canonical storage categories.

### Tier 2: Dynamic Semantic Topics (Human-Readable)
Instead of forcing a pre-configured label from a drop-down list, Gemini dynamically creates an exact, intuitive topic name:
* If a fashion merchant speaks about tags: `Security Tag & Return Conditions`.
* If a SaaS founder speaks about requests: `API Rate Limits & Throttling`.
* If a dentist speaks about whitening: `Teeth Whitening Preparation & Procedure`.
* **Purpose:** The merchant immediately understands what was saved and can edit or verify it effortlessly.

---

## 5. Continuous Speech Stream Decomposition (Micro-Atomic Rules)

### The Anti-Pattern: Monolithic Session Dumps
Earlier voice training tools saved a 2-minute recording as one large document titled *"Voice Feed Note - Sep 11"*. 
* **The Problem:** When a customer asks about return windows, the vector search retrieves a document that also talks about leather care, courier charges, and discount coupons. The AI gives rambling answers or struggles with relevance.

### The Best Practice: Rule-Level Atomic Decomposition
During ingestion, the pipeline analyzes semantic boundaries, conjunctions (*"Also...", "Another thing is...", "For shipping..."*), and subject transitions:

#### Real-World Example
**Merchant speaks continuous voice input:**
> *"Inside Dhaka delivery is 70 taka and takes 24 to 48 hours. For outside Dhaka it's 130 taka, but customers have to pay the courier charge in advance via bKash. Also, we have a 7-day exchange window, but the product must be unworn and the security tag cannot be removed."*

**Automatic Decomposition Output:**
1. **Rule 1 (Logistics / Delivery Fees):**
   - **Title:** `Dhaka & National Delivery Timelines and Charges`
   - **Pillar:** `logistics`
   - **Content:** Inside Dhaka delivery is 70 BDT (24-48 hours). Outside Dhaka delivery is 130 BDT with mandatory advance payment via bKash.
   - **Confidence:** `0.96`
2. **Rule 2 (Operations / Exchange Policy):**
   - **Title:** `7-Day Exchange & Security Tag Policy`
   - **Pillar:** `operations`
   - **Content:** 7-day exchange window available for unworn items only with intact, untampered security tags.
   - **Confidence:** `0.94`

---

## 6. Intelligent Deduplication & Update Mechanics

Merchants frequently refine or update their rules over time (e.g. changing delivery fee from 60 Tk to 70 Tk).

### Industry Best Practice Strategy:
1. **Semantic Similarity Comparison:** Before inserting a new document, the system computes the semantic embedding of the new rule title and content against existing entries for that `businessId`.
2. **Update vs. Insert Decision:**
   * **High Overlap (> 82% similarity on same topic):** Updates the existing document in place rather than creating a competing rule.
   * **Contradictory Fact Detected:** Flagged as an update (e.g. replacing old return window with the new one).
   * **New Topic:** Created as a brand-new atomic knowledge entry.
3. **Audit Trail:** The UI displays whether the rule was:
   * 🟢 **New Entry Indexed**
   * 🔵 **Updated Existing Rule**
   * ⚪ **Already Up-to-Date (No change required)**

---

## 7. Frontend User Experience: Zero Friction

### 1. No Upfront Category Selector
- Remove the category picker pills from the primary input area.
- The UI presents a clean, welcoming canvas:
  - **The Living Orb** (animated fluid crystal wave).
  - **Mode Selector:**
    - `Converse`: Interactive conversation with ORA note-taker persona.
    - `Dictate / Transcribe (Silent)`: Pure speech-to-text with ORA completely silent (ideal for reading out long manuals or terms).
  - **Microphone Energy Indicator:** Real-time visual pulsing proving audio is received.

### 2. Immediate Spoken Feedback
- Real-time word streaming shows the merchant that their voice is being transcribed accurately.

### 3. Transparent Post-Ingestion Feedback Cards
Once the merchant clicks **Stop & File**, the AI processes the stream and presents clean, structured cards:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ✓ 2 Store Rules Identified and Indexed                                 │
├────────────────────────────────────────────────────────────────────────┤
│ 📦 Logistics & Delivery                                • New Entry     │
│ Dhaka & National Delivery Timelines and Charges         96% confidence │
│ - Inside Dhaka: 70 BDT (24-48h turnaround)                             │
│ - Outside Dhaka: 130 BDT with mandatory bKash courier advance          │
├────────────────────────────────────────────────────────────────────────┤
│ 🛡️ Operations & Policy                                 • Updated       │
│ 7-Day Exchange & Security Tag Policy                    94% confidence │
│ - 7-day exchange window for unworn items with intact security tags     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Technical Architecture & Component Mapping

### Backend Components (`server/src/knowledge/`)
1. **`VoiceTranscriptStructurerService`:**
   - Prompts Gemini to analyze raw turns and emit an array of atomic knowledge entries.
   - Infers `functionalPillar` (`offerings` | `operations` | `commercials` | `logistics` | `inquiries`).
   - Generates contextual `title`, clean bullet points, and extracted `tags`.
2. **`KnowledgeService`:**
   - Performs deduplication against existing database records for the tenant.
   - Vectorizes content chunks and persists them with proper tenant scoping (`businessId`).

### Frontend Components (`client/components/agent/feed/`)
1. **`VoiceFeedTab`:**
   - Simplified, elegant voice recording & transcribe surface.
   - Removed category selection buttons from the input flow.
   - Displays structured decomposition cards after ingestion.
2. **`GeminiLiveClient`:**
   - Full duplex WebSocket audio streaming to NestJS `/ws/voice`.
   - Supports `sessionMode: 'training'` and `silentMode: true/false`.

---

## 9. Implementation Roadmap (When Ready to Execute)

1. **Step 1: Backend Structuring Prompt Update**
   - Update `VoiceTranscriptStructurerService.buildSystemPrompt()` with the 5 Universal Functional Pillars.
   - Instruct the model to perform automated atomic decomposition on continuous speech.
2. **Step 2: Frontend Clean-up**
   - Streamline `voice-feed-tab.tsx`: Remove the upfront category selector pills.
   - Keep the Converse vs. Dictate (Silent) mode toggle.
   - Enhance the post-speech results view to display the detected pillar and dynamic topic tags.
3. **Step 3: End-to-End Verification**
   - Run mock voice tests with E-commerce, SaaS, and Service business scripts to confirm accurate automatic decomposition and categorization.
   - Verify unit tests and type checks.
