# Graph Report - ora  (2026-09-02)

## Corpus Check
- 457 files · ~846,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3288 nodes · 7466 edges · 223 communities (147 shown, 76 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 326 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21a1cf6a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BusinessDocument
- product-catalog-table.tsx
- RedisService
- rag.service.ts
- auth-service.ts
- notifications.service.ts
- cn
- knowledge-service.ts
- widget.v4_5_lumina.js
- admin.service.ts
- voice-feed-tab.tsx
- Roles
- VerifyLiveDto
- app.module.ts
- ORA Monorepo API Documentation (v1 Aligned)
- demo-data.ts
- setup-guide-client.tsx
- GeminiLiveClient
- live-desk-client.tsx
- invoices.service.ts
- VerifyOtpDto
- (marketing)/page.tsx
- notifications-client.tsx
- conversations-client.tsx
- ai-tools.executor.ts
- billing-service.ts
- email-templates.ts
- overview-client.tsx
- products.service.ts
- users.controller.ts
- navbar.tsx
- ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)
- compilerOptions
- dependencies
- ORA Monorepo Build State & Implementation Tracker (v1 Aligned)
- ingestion.module.ts
- product-discovery-and-ingestion-analysis.md
- IngestionController
- compilerOptions
- DomainException
- agent-persona-tab.tsx
- agent-config.schema.ts
- LiveDeskService
- VoiceProxyGateway
- RagService
- agent-client.tsx
- customers-client.tsx
- SitemapDiscoveryService
- DocType
- voice-proxy.gateway.ts
- CustomersController
- .getClient
- RegisterDto
- components.json
- 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases
- AuthController
- EmbeddingService
- StripeProvider
- JsonLdExtractor
- CurrentUser
- dependencies
- .subscribe
- ProductsService
- analytics-panel.tsx
- devDependencies
- Server Engineering Standards & AI Coding Rules (`server/`)
- KnowledgeService
- OrdersController
- .updateConfig
- 🚫 Non-Negotiable Directives
- .bootstrapSession
- 🟡 Significant Improvements
- BillingController
- ReadabilityExtractor
- SearchRagDto
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- 🚀 ORA Production Deployment & Dockerization Guide
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- BkashProvider
- JwtPayloadUser
- .handleConnection
- main.ts
- merchant-credentials-card.tsx
- AdminController
- merchants-table.tsx
- admin-users-view.tsx
- jest
- seed-admin.ts
- BusinessController
- FileIngestionService
- admin-service.ts
- documents-feed-tab.tsx
- apiClient
- scripts
- ConversationsController
- 🚀 Core Directives & Standards
- auth/page.tsx
- 10. Billing, Plans & Payments
- server/package.json
- exclude
- AppController
- CustomersService
- CreateKnowledgeDocDto
- app/layout.tsx
- AdminUserQueryDto
- admin-sidebar.tsx
- CreateOrderDto
- 2. Architectural Mismatches & Technical Fixes
- UpdateAdminUserDto
- server/README.md
- conversation-types.ts
- ORA — Final Architecture (v6)
- devDependencies
- CreatePlatformUserDto
- InvoicesService
- 11. Widget Delivery & Injection Architecture
- nest-cli.json
- plan-limit.guard.ts
- Param
- 🎨 Design System — ORA Violet / Cyan Palette
- DashboardService
- scripts
- UpdatePlatformAgentDto
- VectorStoreService
- InvoiceStatus
- .batchSync
- InvoicesController
- UpdateSessionLimitDto
- onlyBuiltDependencies
- 2. System Layers
- ShopifyConnectorService
- PiiRedactor
- client/package.json
- PCMRecorderProcessor
- 4. Ingestion Architecture
- 8. Cross-Cutting Concerns
- auth.controller.ts
- .executeUserAction
- agent-header.tsx
- Next.js template
- 9. Platform-Specific Notes
- PassiveIngestDto
- CrawlStoreDto
- FileUploadDto
- orders/page.tsx
- (marketing)/layout.tsx
- live-top-bar.tsx
- proxy.ts
- floating-orb-widget.tsx
- rules/graphify.md
- workflows/graphify.md
- bcryptjs
- class-transformer
- class-validator
- client/eslint.config.mjs
- next.config.ts
- clsx
- next
- postcss.config.mjs
- csv-parse
- deploy.sh
- ejs
- UpdateBusinessDto
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- ioredis
- AdminService
- mongoose
- @mozilla/readability
- multer
- @nestjs/bullmq
- @nestjs/cli
- @nestjs/common
- @nestjs/config
- @nestjs/jwt
- @nestjs/mongoose
- @nestjs/passport
- @nestjs/platform-express
- @nestjs/schematics
- @nestjs/testing
- usage-tracking.service.ts
- passport
- pdf-parse
- reflect-metadata
- resend
- rxjs
- turndown
- xlsx
- prettier
- LoginDto
- supertest
- ts-jest
- ResetPasswordDto
- @types/bcrypt
- @types/bcryptjs
- @types/cookie-parser
- .handleSendMessage
- @types/jest
- @types/jsdom
- UpdateKnowledgeDocDto
- ApiKeyGuard
- cheerio
- @types/nodemailer
- @types/passport-jwt
- cookie-parser
- fast-xml-parser
- @types/ws
- jsdom
- @nestjs/core
- @nestjs/mapped-types
- @nestjs/platform-socket.io
- passport-jwt
- socket.io
- stripe
- ts-loader
- tsconfig-paths
- @types/ejs

## God Nodes (most connected - your core abstractions)
1. `cn()` - 122 edges
2. `apiClient()` - 113 edges
3. `JwtPayloadUser` - 87 edges
4. `CurrentUser` - 82 edges
5. `DomainException` - 75 edges
6. `RedisService` - 58 edges
7. `Business` - 50 edges
8. `ProductsService` - 47 edges
9. `Roles()` - 45 edges
10. `BusinessDocument` - 40 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `cn()`  [EXTRACTED]
  client/app/layout.tsx → client/lib/utils.ts
- `WaveformAudioControl()` --calls--> `cn()`  [EXTRACTED]
  client/components/agent/persona/agent-persona-tab.tsx → client/lib/utils.ts
- `LivingOrbCanvas()` --calls--> `cn()`  [EXTRACTED]
  client/components/orb/living-orb.tsx → client/lib/utils.ts
- `WaveformAudioControl()` --calls--> `cn()`  [EXTRACTED]
  client/components/setup/previews/persona-preview.tsx → client/lib/utils.ts
- `SetupHub()` --calls--> `cn()`  [EXTRACTED]
  client/components/setup/setup-guide-client.tsx → client/lib/utils.ts

## Import Cycles
- 3-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 3-file cycle: `server/src/agent-config/agent-config.service.ts -> server/src/ai-voice/gemini-voice.service.ts -> server/src/ai-voice/tools/ai-tools.executor.ts -> server/src/agent-config/agent-config.service.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/billing/billing.module.ts -> server/src/auth/auth.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/notifications/notifications.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`

## Communities (223 total, 76 thin omitted)

### Community 0 - "BusinessDocument"
Cohesion: 0.08
Nodes (18): GeminiVoiceService, GeminiVoiceSessionOptions, LEGACY_VOICE_MAP, Injectable, InjectModel, Optional, VALID_GEMINI_VOICES, getToolsForArchetype() (+10 more)

### Community 1 - "product-catalog-table.tsx"
Cohesion: 0.07
Nodes (50): AVAILABILITY_STATUS, ProductCatalogTable(), ProductCatalogTableProps, SOURCE_LABELS, AVAILABILITY_CONFIG, ProductDetailDrawer(), ProductDetailDrawerProps, SOURCE_TIER_CONFIG (+42 more)

### Community 2 - "RedisService"
Cohesion: 0.05
Nodes (53): BootstrapRateLimitGuard, Injectable, InjectModel, Controller, VoiceSessionController, AuthModule, Module, AuthTokens (+45 more)

### Community 3 - "rag.service.ts"
Cohesion: 0.11
Nodes (22): KnowledgeBase, KnowledgeBaseSchema, Prop, Schema, KnowledgeChunk, KnowledgeChunkDocument, KnowledgeChunkSchema, Prop (+14 more)

### Community 4 - "auth-service.ts"
Cohesion: 0.08
Nodes (43): DashboardLayoutProps, AdminGuard(), checkAdminAccess(), AdminGuardProps, AuthHeader(), AuthHeaderProps, ForgotPasswordForm(), ForgotPasswordFormProps (+35 more)

### Community 5 - "notifications.service.ts"
Cohesion: 0.06
Nodes (39): IsBooleanString, IsNumberString, CreateNotificationDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString (+31 more)

### Community 6 - "cn"
Cohesion: 0.07
Nodes (33): AgentPageHeader(), AgentPageHeaderProps, AgentSection, SECTION_META, BillingHeader(), NavGroupDef, NavIconButton(), NavIconButtonProps (+25 more)

### Community 7 - "knowledge-service.ts"
Cohesion: 0.19
Nodes (18): CATEGORY_TABS, KnowledgeFeedList(), KnowledgeFeedListProps, KnowledgeChunkModal(), KnowledgeChunkModalProps, DOC_TYPE_OPTIONS, KnowledgeEditModal(), KnowledgeEditModalProps (+10 more)

### Community 8 - "widget.v4_5_lumina.js"
Cohesion: 0.12
Nodes (41): armCardAutoDismiss(), armIdleTimer(), arrayBufferToBase64(), base64ToFloat32Array(), cancelCardAutoDismiss(), cancelIdleTimer(), downsampleTo16k(), escapeHtml() (+33 more)

### Community 9 - "admin.service.ts"
Cohesion: 0.08
Nodes (47): InjectConnection, InjectModel, Subscription, SubscriptionDocument, SubscriptionSchema, SubscriptionStatus, ACTIVE, CANCELED (+39 more)

### Community 10 - "voice-feed-tab.tsx"
Cohesion: 0.14
Nodes (14): SessionStatus, TranscriptEntry, VoiceFeedTabProps, VoiceMode, InspectorTab, SessionStatus, TranscriptEntry, VoiceMode (+6 more)

### Community 11 - "Roles"
Cohesion: 0.22
Nodes (14): Roles(), ROLES_KEY, JwtAuthGuard, Injectable, RolesGuard, Injectable, TenantScopeGuard, Injectable (+6 more)

### Community 12 - "VerifyLiveDto"
Cohesion: 0.33
Nodes (5): IsEnum, IsNumber, IsOptional, Min, VerifyLiveDto

### Community 13 - "app.module.ts"
Cohesion: 0.06
Nodes (48): AdminModule, Module, AgentConfigModule, Module, AiVoiceModule, Module, BillingModule, Module (+40 more)

### Community 14 - "ORA Monorepo API Documentation (v1 Aligned)"
Cohesion: 0.05
Nodes (39): 10.1 Intent State Classification Taxonomy (`stateType`), 10. Phase 8: Real-Time Live Desk & Telemetry Command Center (`/api/v1/live-desk`), 11.1 SuperAdmin Role Enforcement & Actor Security, 11.2 Merchants Directory with Key Telemetry (`GET /api/v1/admin/businesses`), 11.3 Revoke Publishable Key (`DELETE /api/v1/admin/businesses/:id/publishable-key`), 11.4 Update Key Status (`PATCH /api/v1/admin/businesses/:id/key-status`), 11.5 Account Action Dispatcher (`POST /api/v1/admin/users/:id/action`), 11. SuperAdmin Platform Command Center & Moderation (`/api/v1/admin`) (+31 more)

### Community 15 - "demo-data.ts"
Cohesion: 0.09
Nodes (25): metadata, metadata, metadata, BillingClient(), BillingClientContent(), InvoiceHistory(), InvoiceHistoryProps, UsageClient() (+17 more)

### Community 16 - "setup-guide-client.tsx"
Cohesion: 0.08
Nodes (33): metadata, AgentClientContent(), KnowledgePreview(), VoiceTestPreview(), VoiceTestPreviewProps, ARCH_CONTENT, ArchPageContent, FaqItem (+25 more)

### Community 17 - "GeminiLiveClient"
Cohesion: 0.19
Nodes (4): VoiceFeedTab(), VoiceTestModal(), GeminiLiveClient, searchRagCombinedApi()

### Community 18 - "live-desk-client.tsx"
Cohesion: 0.10
Nodes (32): metadata, ActivityFeed(), ActivityFeedProps, DetailDrawerProps, LiveDeskClient(), LiveStatsBarProps, DEFAULT_SERVICES, OraStatusPanel() (+24 more)

### Community 19 - "invoices.service.ts"
Cohesion: 0.20
Nodes (16): InvoiceCounter, InvoiceCounterDocument, InvoiceCounterSchema, Prop, Schema, InvoiceDeliveryLog, InvoiceDeliveryLogDocument, InvoiceDeliveryLogSchema (+8 more)

### Community 20 - "VerifyOtpDto"
Cohesion: 0.29
Nodes (6): Length, IsEmail, IsNotEmpty, IsOptional, IsString, VerifyOtpDto

### Community 21 - "(marketing)/page.tsx"
Cohesion: 0.12
Nodes (13): CtaSection(), docs, DocsSection(), FeaturesSection(), HeroSection(), HeroVoiceCta(), platforms, SolutionsSection() (+5 more)

### Community 22 - "notifications-client.tsx"
Cohesion: 0.15
Nodes (17): metadata, NotificationItem(), NotificationItemProps, NotificationCategory, NotificationItemData, NotificationsClient(), DEMO_MODE_ENABLED, initialNotifications (+9 more)

### Community 23 - "conversations-client.tsx"
Cohesion: 0.14
Nodes (20): metadata, formatSessionRef(), mapApiConversationToUi(), mapApiMessagesToUi(), ConversationListPanel(), ConversationsClient(), fetchTranscript(), DetailDrawer() (+12 more)

### Community 24 - "ai-tools.executor.ts"
Cohesion: 0.07
Nodes (32): AgentConfigService, Injectable, InjectModel, Optional, EventsService, Injectable, InjectModel, EventType (+24 more)

### Community 25 - "billing-service.ts"
Cohesion: 0.08
Nodes (36): BkashCallbackContent(), CurrentPlanCard(), CurrentPlanCardProps, PlanComparisonGrid(), PlanComparisonGridProps, UsageDashboard(), UsageDashboardProps, AttributionRow (+28 more)

### Community 26 - "email-templates.ts"
Cohesion: 0.18
Nodes (18): CongratulationsEmailData, ForgotPasswordData, getFallbackHtml(), getTemplatePath(), ORA_EMAIL_THEME, OtpEmailData, renderCongratulationsTemplate(), renderEjsTemplate() (+10 more)

### Community 27 - "overview-client.tsx"
Cohesion: 0.15
Nodes (12): metadata, TopHeader(), TopHeaderProps, EMPTY_STATS, getGreeting(), OverviewClient(), QuickAction, QuickActionsBar() (+4 more)

### Community 28 - "products.service.ts"
Cohesion: 0.06
Nodes (45): FIELD_ALIASES, IngestionSummary, BatchSyncProductsDto, IsArray, IsEnum, IsNotEmpty, Type, ValidateNested (+37 more)

### Community 29 - "users.controller.ts"
Cohesion: 0.12
Nodes (15): ChangePasswordDto, IsNotEmpty, IsString, MinLength, IsOptional, IsString, MinLength, UpdateProfileDto (+7 more)

### Community 30 - "navbar.tsx"
Cohesion: 0.11
Nodes (14): metadata, metadata, LogoutButton(), LogoutButtonProps, CodeSnippet, DocSection, DocsPageClient(), footerSections (+6 more)

### Community 31 - "ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)"
Cohesion: 0.07
Nodes (29): 10. Landing Page Color System — Stitch "Lumina" Palette, 1. Monorepo Architecture Overview, 2. Actor Model & Authentication Taxonomy, 3. Core Security & Scoping Baseline, 4.1 Token Design, 4.2 Refresh Rotation & Theft Detection, 4.3 Session Revocation, 4. Authentication Mechanics — JWT + Session Hybrid (AdminUser) (+21 more)

### Community 32 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 33 - "dependencies"
Cohesion: 0.18
Nodes (11): bcrypt, bullmq, @nestjs/websockets, nodemailer, dependencies, bcrypt, bullmq, @nestjs/websockets (+3 more)

### Community 34 - "ORA Monorepo Build State & Implementation Tracker (v1 Aligned)"
Cohesion: 0.07
Nodes (28): Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components & RAG Engine Fixes, Implemented Components & Security Hardening (+20 more)

### Community 35 - "ingestion.module.ts"
Cohesion: 0.28
Nodes (11): HTML_CRAWL_QUEUE, FAQ_PATTERNS, POLICY_PATTERNS, PRODUCT_PATTERNS, CrawlJobData, CrawlUrlJobData, DiscoveredUrl, ExtractedKnowledgeDoc (+3 more)

### Community 36 - "product-discovery-and-ingestion-analysis.md"
Cohesion: 0.07
Nodes (28): 1. Executive Summary, 1. Next.js SPA Client-Side Routing Blackhole, 1. SPA Route Interception (Next.js / Inertia / Vue), 2. Client-Side Rendered DOM Extraction, 2. Localhost & Custom Domain API Base Misconfiguration, 2. Root Cause Analysis (Technical Breakdown), 3. Client-Side Catalog Listing Harvester, 3. Comparison Matrix: Platform Behaviors (+20 more)

### Community 37 - "IngestionController"
Cohesion: 0.17
Nodes (16): IsUrl, FeedIngestDto, IsNotEmpty, IsOptional, IsString, IngestionController, Body, Controller (+8 more)

### Community 38 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+20 more)

### Community 39 - "DomainException"
Cohesion: 0.16
Nodes (4): AuthService, Injectable, DomainException, Get

### Community 40 - "agent-persona-tab.tsx"
Cohesion: 0.10
Nodes (30): AgentPersonaTab(), ArchetypeOption, ARCHETYPES, PRESET_TEMPLATES, PresetTemplate, VOICE_OPTIONS, VoiceOption, WaveformAudioControl() (+22 more)

### Community 41 - "agent-config.schema.ts"
Cohesion: 0.07
Nodes (39): Inject, InjectModel, Optional, IsArray, IsBoolean, IsNumber, IsObject, IsOptional (+31 more)

### Community 42 - "LiveDeskService"
Cohesion: 0.12
Nodes (10): LiveDeskController, Controller, Get, HttpCode, Param, Post, Query, UseGuards (+2 more)

### Community 43 - "VoiceProxyGateway"
Cohesion: 0.29
Nodes (4): Injectable, VoiceProxyGateway, Inject, Optional

### Community 44 - "RagService"
Cohesion: 0.11
Nodes (8): Injectable, InjectModel, Optional, WooCommerceConnectorService, RagService, Injectable, InjectModel, Optional

### Community 45 - "agent-client.tsx"
Cohesion: 0.09
Nodes (25): metadata, AgentClient(), AgentGetStartedPage(), AgentGetStartedPageProps, FaqItem, HowRow, ROLE_CONTENT, RolePageContent (+17 more)

### Community 46 - "customers-client.tsx"
Cohesion: 0.16
Nodes (15): metadata, CustomerDetailPanel(), CustomerDetailPanelProps, CustomersClient(), CustomersHeader(), CustomersTable(), CustomersTableProps, demoCustomers (+7 more)

### Community 47 - "SitemapDiscoveryService"
Cohesion: 0.19
Nodes (6): InjectQueue, PlatformSnifferService, Injectable, SitemapDiscoveryService, Injectable, PlatformDetectionResult

### Community 48 - "DocType"
Cohesion: 0.17
Nodes (12): FEED_CATEGORY_META, FeedTab, FeedTabId, KNOWLEDGE_CATEGORIES, KnowledgeCategoryOption, DocType, BRAND_RULE, FAQ (+4 more)

### Community 49 - "voice-proxy.gateway.ts"
Cohesion: 0.07
Nodes (36): GeminiVoiceSessionControls, ProxySession, ConversationsService, Injectable, InjectModel, ConversationChannel, API, WIDGET_CHAT (+28 more)

### Community 50 - "CustomersController"
Cohesion: 0.11
Nodes (16): CustomersController, Body, Controller, Get, Param, Patch, Post, Query (+8 more)

### Community 52 - "RegisterDto"
Cohesion: 0.29
Nodes (6): RegisterDto, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases"
Cohesion: 0.09
Nodes (21): 1. Executive Summary & Problem Statement, 1. Mandatory Store & Platform Disclosure at Onboarding, 2. Analysis of the Three Tooling Strategies, 2. Sitemap & Routing Information Architecture (Navigation Unlocking), 3. API Documentation & OpenAPI Schema Ingestion (Custom Tool Unlocking), 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases, 4. Granular Tool Permission Toggles (Agent Control Center), 4. Handling Non-E-Commerce & Zero-API Businesses (+13 more)

### Community 55 - "AuthController"
Cohesion: 0.17
Nodes (13): Res, AuthController, Body, Controller, Get, HttpCode, Post, Query (+5 more)

### Community 56 - "EmbeddingService"
Cohesion: 0.26
Nodes (3): EmbeddingService, Injectable, Optional

### Community 57 - "StripeProvider"
Cohesion: 0.14
Nodes (6): ChargeResult, CustomerBillingDetails, PaymentProvider, ProviderSubscriptionRef, StripeProvider, Injectable

### Community 58 - "JsonLdExtractor"
Cohesion: 0.20
Nodes (5): JsonLdExtractor, Injectable, PlatformFastPathService, Injectable, ExtractedProduct

### Community 59 - "CurrentUser"
Cohesion: 0.19
Nodes (13): CurrentUser, KnowledgeController, Body, Controller, Delete, Get, Param, Patch (+5 more)

### Community 60 - "dependencies"
Cohesion: 0.10
Nodes (21): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, lucide-react, next-themes, react (+13 more)

### Community 62 - "ProductsService"
Cohesion: 0.11
Nodes (11): ManualIngestDto, IsNotEmpty, IsObject, InjectModel, FeedParserService, Injectable, ManualConnectorService, Injectable (+3 more)

### Community 63 - "analytics-panel.tsx"
Cohesion: 0.14
Nodes (17): AnalyticsPanel(), AnalyticsPanelProps, AnalyticsTab, TABS, KpiCardDef, KpiStrip(), KpiStripProps, ChartDataPoint (+9 more)

### Community 64 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, eslint, eslint-config-next, prettier, prettier-plugin-tailwindcss, tailwindcss, @tailwindcss/postcss, @types/node (+13 more)

### Community 65 - "Server Engineering Standards & AI Coding Rules (`server/`)"
Cohesion: 0.10
Nodes (20): 1. Tech Stack & Module Conventions, 2.1 AdminUser Authentication (Dashboard), 2.2 Tenant (Business) API & Publishable Widget Key Auth, 2.3 Customer Voice Widget Sessions, 2. Actor Model & Auth Mechanisms (v5 Architecture), 3.1 Provider Abstraction (`PaymentProvider`), 3.2 Active Renewal Scheduler & Dunning, 3.3 Plan & Metering Guard (`PlanLimitGuard`) (+12 more)

### Community 66 - "KnowledgeService"
Cohesion: 0.22
Nodes (6): KnowledgeService, Inject, Injectable, InjectModel, Optional, KnowledgeBaseDocument

### Community 67 - "OrdersController"
Cohesion: 0.13
Nodes (13): IsEnum, IsNotEmpty, UpdateOrderStatusDto, OrdersController, Body, Controller, Get, HttpCode (+5 more)

### Community 68 - ".updateConfig"
Cohesion: 0.22
Nodes (6): AgentConfigController, Body, Controller, Get, Patch, UseGuards

### Community 69 - "🚫 Non-Negotiable Directives"
Cohesion: 0.11
Nodes (18): 1. Next.js 16+ Architecture Basis (`proxy.ts` mandatory), 2. Server Components First (No `"use client"` in `page.tsx`), 3. Component-Based Architecture & File Separation, 4. Service & Action Organization, 5. API Response Handling & Envelope Unwrapping, 6. Client State vs Server State, 7. Widget Embed & Delivery Architecture (v5 Section 11), 8. Marketing / Landing Page Conventions (+10 more)

### Community 70 - ".bootstrapSession"
Cohesion: 0.20
Nodes (9): BootstrapVoiceSessionDto, IsNotEmpty, IsOptional, IsString, Body, HttpCode, Post, Req (+1 more)

### Community 71 - "🟡 Significant Improvements"
Cohesion: 0.11
Nodes (18): 10. RAG Result Cache Doesn't Invalidate on Product Changes, 11. Knowledge Chunking Is Character-Based, Not Semantic, 12. No `isEmbedded` Flag for Knowledge Chunks, 13. Feed Parser Uses Regex for XML, 14. No Product Image Extraction in DOM Strategy D, 1. Tier 1 Webhooks Never Trigger Vector Embedding, 2. Product Deletion Doesn't Clean Up Vector Index, 3. Brute-Force Vector Search Won't Scale (+10 more)

### Community 72 - "BillingController"
Cohesion: 0.20
Nodes (9): BillingController, Body, Controller, Get, Headers, HttpCode, Post, Req (+1 more)

### Community 73 - "ReadabilityExtractor"
Cohesion: 0.20
Nodes (5): Processor, ReadabilityExtractor, Injectable, SitemapCrawlerProcessor, DiscoveredUrlKind

### Community 74 - "SearchRagDto"
Cohesion: 0.17
Nodes (15): SearchRagDto, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min (+7 more)

### Community 75 - "✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide"
Cohesion: 0.11
Nodes (17): 1-Click Sync from Website URL, 1. System Architecture Overview, 2. Stage 1: Ingesting Your Store Intelligence, 3. Stage 2: Training Your AI Voice & Sales Persona, 4. Stage 3: Embedding the 1-Line Storefront Widget, 5. Stage 4: Testing in the Dashboard Sandbox, 6. Stage 5: Live Desk, Conversions & Self-Healing Sync, 7. Agency & Service Provider Playbook (+9 more)

### Community 76 - "🚀 ORA Production Deployment & Dockerization Guide"
Cohesion: 0.11
Nodes (17): 1. Clone the Repository, 2. Configure Environment Variables, 3. Build & Launch with Docker Compose, 4. Verify Service Health, 5. Seed the Initial SuperAdmin User, 🏗️ Architecture Overview, Automated MongoDB Backup (Cron), 💾 Database Backup & Disaster Recovery (+9 more)

### Community 77 - "✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide"
Cohesion: 0.11
Nodes (17): 1-Click Sync from Website URL, 1. System Architecture Overview, 2. Stage 1: Ingesting Your Store Intelligence, 3. Stage 2: Training Your AI Voice & Sales Persona, 4. Stage 3: Embedding the 1-Line Storefront Widget, 5. Stage 4: Testing in the Dashboard Sandbox, 6. Stage 5: Live Desk, Conversions & Self-Healing Sync, 7. Agency & Service Provider Playbook (+9 more)

### Community 79 - "JwtPayloadUser"
Cohesion: 0.23
Nodes (12): JwtPayloadUser, ProductsController, Body, Controller, Delete, Get, HttpCode, Param (+4 more)

### Community 80 - ".handleConnection"
Cohesion: 0.18
Nodes (6): ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, VoiceGateway

### Community 81 - "main.ts"
Cohesion: 0.16
Nodes (9): Catch, AppModule, Module, AllExceptionsFilter, ErrorEnvelope, SuccessEnvelope, TransformInterceptor, Injectable (+1 more)

### Community 82 - "merchant-credentials-card.tsx"
Cohesion: 0.23
Nodes (13): MerchantCredentialsCard(), MerchantCredentialsCardProps, PLATFORMS, PlatformTab, BusinessDetailsCard(), BusinessDetailsCardProps, resendOnboardingApi(), deletePublishableKeyApi() (+5 more)

### Community 83 - "AdminController"
Cohesion: 0.13
Nodes (5): AdminController, Controller, Get, Query, UseGuards

### Community 84 - "merchants-table.tsx"
Cohesion: 0.26
Nodes (9): AdminMerchantsView(), MerchantsTable(), MerchantsTableProps, adminRevokeBusinessKeyApi(), adminUpdateKeyStatusApi(), fetchAdminBusinesses(), updateBusinessStatus(), AdminBusinessItem (+1 more)

### Community 85 - "admin-users-view.tsx"
Cohesion: 0.20
Nodes (10): AdminUsersTable(), AdminUsersTableProps, AdminUsersView(), TablePagination(), TablePaginationProps, createPlatformUser(), fetchAdminUsers(), AdminUserItem (+2 more)

### Community 86 - "jest"
Cohesion: 0.13
Nodes (15): js, json, /node_modules/(?!(@exodus|html-encoding-sniffer)/), **/*.(t|j)s, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+7 more)

### Community 87 - "seed-admin.ts"
Cohesion: 0.13
Nodes (13): adminEmail, adminName, adminPassword, AdminRole, ADMIN, OWNER, STAFF, SUPER_ADMIN (+5 more)

### Community 88 - "BusinessController"
Cohesion: 0.22
Nodes (10): BusinessController, Body, Controller, Delete, Get, HttpCode, Patch, Post (+2 more)

### Community 90 - "admin-service.ts"
Cohesion: 0.06
Nodes (54): metadata, AdminUserDetailPageProps, metadata, AdminHeader(), AdminHeaderProps, AdminOverviewView(), AdminPlatformAgentCard(), AdminSystemView() (+46 more)

### Community 91 - "documents-feed-tab.tsx"
Cohesion: 0.31
Nodes (7): DOCUMENT_CATEGORIES, DocumentsFeedTab(), DocumentsFeedTabProps, TextFeedTab(), TextFeedTabProps, createKnowledgeDocApi(), uploadKnowledgeFileApi()

### Community 92 - "apiClient"
Cohesion: 0.09
Nodes (29): apiClient(), DashboardStatsResponse, FunnelStep, getFunnelAnalyticsApi(), getRevenueAnalyticsApi(), RevenueDataPoint, RevenueTimeseries, terminateVoiceSessionApi() (+21 more)

### Community 93 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:admin, start, start:debug, start:dev (+6 more)

### Community 94 - "ConversationsController"
Cohesion: 0.15
Nodes (8): ConversationsController, Controller, Get, HttpCode, Param, Post, Query, UseGuards

### Community 95 - "🚀 Core Directives & Standards"
Cohesion: 0.15
Nodes (12): 1. Next.js 16+ Modern Standards, 2. Strict Server Component Separation (No `"use client"` in `page.tsx`), 3. Component-Based Architecture & Strict Code Separation, 4. Service & Action Organization (`services/` & `actions/`), 5. Centralized Auth & Access Control (`proxy.ts`), 6. Widget Embed & Delivery Standards (ORA Architecture v5 - Section 11), 7. Maximum Reusability & Clean Architecture, 8. Type Safety & Code Quality (+4 more)

### Community 96 - "auth/page.tsx"
Cohesion: 0.23
Nodes (4): metadata, AuthBackground(), AuthCard(), AuthHeroSection()

### Community 97 - "10. Billing, Plans & Payments"
Cohesion: 0.15
Nodes (13): 10.10 OTP Verification — recipient-verification email OTP, 10.11 Invoice Delivery, 10.12 Resend & Audit, 10.1 Why two providers, 10.2 Provider abstraction, 10.3 Plans, 10.4 Renewal scheduling (bKash-specific), 10.5 Dunning / payment failure (+5 more)

### Community 98 - "server/package.json"
Cohesion: 0.15
Nodes (12): bcrypt, author, description, esbuild, @swc/core, unrs-resolver, license, name (+4 more)

### Community 99 - "exclude"
Cohesion: 0.15
Nodes (12): scripts, **/*spec.ts, test, ./tsconfig.json, compilerOptions, rootDir, exclude, extends (+4 more)

### Community 100 - "AppController"
Cohesion: 0.27
Nodes (5): AppController, Controller, Get, AppService, Injectable

### Community 101 - "CustomersService"
Cohesion: 0.19
Nodes (3): EncryptionUtil, CustomersService, Injectable

### Community 102 - "CreateKnowledgeDocDto"
Cohesion: 0.15
Nodes (13): CreateKnowledgeDocDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, DocType, BRAND_RULE (+5 more)

### Community 103 - "app/layout.tsx"
Cohesion: 0.29
Nodes (6): inter, jetbrainsMono, newsreader, RootLayout(), spaceGrotesk, ThemeProvider()

### Community 104 - "AdminUserQueryDto"
Cohesion: 0.20
Nodes (8): AdminUserQueryDto, IsIn, IsNumber, IsOptional, IsString, Max, Min, Type

### Community 105 - "admin-sidebar.tsx"
Cohesion: 0.19
Nodes (8): metadata, AdminLayoutShell(), AdminLayoutShellProps, adminNavItems, AdminSidebar(), AdminSidebarProps, NavItem, ThemeToggle()

### Community 106 - "CreateOrderDto"
Cohesion: 0.22
Nodes (11): CreateOrderDto, OrderItemDto, IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional (+3 more)

### Community 107 - "2. Architectural Mismatches & Technical Fixes"
Cohesion: 0.20
Nodes (9): 1. Core Architectural Mental Model, 2. Architectural Mismatches & Technical Fixes, 3. Summary of Refactored API Surface, Mismatch 1: Product Management (Form-Based CRUD vs. Bulk Ingestion Mirror), Mismatch 2: Order Management (Fulfillment Engine vs. AI Sales Attribution), Mismatch 3: RAG Channel Drift & Ingestion Lag (Gap A / Gap B / Channel Disparity), Mismatch 4: Webhook Security & Tenant Isolation Vulnerabilities, Mismatch 5: Knowledge Context Isolation & Dead Data (+1 more)

### Community 108 - "UpdateAdminUserDto"
Cohesion: 0.25
Nodes (7): IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, UpdateAdminUserDto

### Community 109 - "server/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 110 - "conversation-types.ts"
Cohesion: 0.20
Nodes (13): ConversationListPanelProps, ConversationTranscript(), ConversationTranscriptProps, ChannelType, ChatMessage, ConversationItem, ConvStatus, ConversationCard() (+5 more)

### Community 111 - "ORA — Final Architecture (v6)"
Cohesion: 0.22
Nodes (8): 12. Decisions, 13. Changelog, 1. Overview, 3. Query-Time Product Resolution Flow, 5. Context Feeding (The "Knows the Store" Layer), 6. Data Shapes, 7. APIs → Owning Service, ORA — Final Architecture (v6)

### Community 112 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint-config-prettier, jest, devDependencies, eslint, eslint-config-prettier, jest, source-map-support, ts-node (+19 more)

### Community 113 - "CreatePlatformUserDto"
Cohesion: 0.25
Nodes (7): CreatePlatformUserDto, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength

### Community 114 - "InvoicesService"
Cohesion: 0.33
Nodes (4): InvoicesService, Injectable, InjectModel, InvoiceDocument

### Community 115 - "11. Widget Delivery & Injection Architecture"
Cohesion: 0.25
Nodes (8): 11.1 Why this needs its own section, 11.2 Two-Stage Loader Pattern, 11.3 CDN Structure & Versioning, 11.4 Isolation — Shadow DOM Mounting, 11.5 Authentication Model — Publishable Key, 11.6 Capability Gating (Tier-Aware Rendering), 11.7 Passive Page Context Capture, 11. Widget Delivery & Injection Architecture

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, entryFile, $schema, sourceRoot

### Community 117 - "plan-limit.guard.ts"
Cohesion: 0.29
Nodes (3): METERED_METRIC_KEY, PlanLimitGuard, Injectable

### Community 118 - "Param"
Cohesion: 0.20
Nodes (3): Body, Param, Patch

### Community 119 - "🎨 Design System — ORA Violet / Cyan Palette"
Cohesion: 0.29
Nodes (6): Color Tokens, 🎨 Design System — ORA Violet / Cyan Palette, 🚫 Non-Negotiable Directives, Palette Usage Rules, Project Architecture & Always-On Coding Rules, Surface Elevation Scale (Dark Mode)

### Community 120 - "DashboardService"
Cohesion: 0.22
Nodes (7): DashboardController, Controller, Get, Query, UseGuards, DashboardService, Injectable

### Community 121 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, format, lint, start, typecheck

### Community 122 - "UpdatePlatformAgentDto"
Cohesion: 0.29
Nodes (6): MaxLength, IsBoolean, IsIn, IsOptional, IsString, UpdatePlatformAgentDto

### Community 123 - "VectorStoreService"
Cohesion: 0.19
Nodes (7): InjectModel, Optional, Inject, InjectModel, Optional, Injectable, VectorStoreService

### Community 124 - "InvoiceStatus"
Cohesion: 0.50
Nodes (4): InvoiceStatus, FAILED, GENERATED, SENT

### Community 126 - "InvoicesController"
Cohesion: 0.17
Nodes (9): Header, InvoicesController, Controller, Get, HttpCode, Param, Post, Query (+1 more)

### Community 127 - "UpdateSessionLimitDto"
Cohesion: 0.33
Nodes (5): IsNumber, IsOptional, Max, Min, UpdateSessionLimitDto

### Community 128 - "onlyBuiltDependencies"
Cohesion: 0.33
Nodes (6): esbuild, @swc/core, unrs-resolver, pnpm, onlyBuiltDependencies, sharp

### Community 129 - "2. System Layers"
Cohesion: 0.33
Nodes (6): 2.1 Widget (Browser, on Merchant's Site), 2.2 Gateway Layer, 2.3 Core Services (NestJS), 2.4 Data Layer, 2.5 Merchant Data Sources (Tiered), 2. System Layers

### Community 130 - "ShopifyConnectorService"
Cohesion: 0.23
Nodes (3): normalizeGeminiVoice(), ShopifyConnectorService, Injectable

### Community 132 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 134 - "4. Ingestion Architecture"
Cohesion: 0.40
Nodes (5): 4.1 Requirements, 4.2 Confidence Score Ladder, 4.3 Webhook Ingestion Service (Tier 1), 4.4 Background Re-sync, 4. Ingestion Architecture

### Community 135 - "8. Cross-Cutting Concerns"
Cohesion: 0.40
Nodes (5): 8.1 State Management, 8.2 Security, 8.3 Scaling, 8.4 Tech Stack, 8. Cross-Cutting Concerns

### Community 137 - ".executeUserAction"
Cohesion: 0.20
Nodes (6): Delete, Post, Req, AdminUserActionDto, IsIn, IsNotEmpty

### Community 138 - "agent-header.tsx"
Cohesion: 0.43
Nodes (5): AgentHeader(), AgentHeaderProps, SECTION_HEADERS, Button(), buttonVariants

### Community 139 - "Next.js template"
Cohesion: 0.50
Nodes (3): Adding components, Next.js template, Using components

### Community 140 - "9. Platform-Specific Notes"
Cohesion: 0.50
Nodes (4): 9. Platform-Specific Notes, BigCommerce / Magento, Shopify, WooCommerce

### Community 141 - "PassiveIngestDto"
Cohesion: 0.29
Nodes (6): PassiveIngestDto, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString

### Community 142 - "CrawlStoreDto"
Cohesion: 0.50
Nodes (3): CrawlStoreDto, IsNotEmpty, IsString

### Community 143 - "FileUploadDto"
Cohesion: 0.50
Nodes (3): FileUploadDto, IsOptional, IsString

### Community 148 - "floating-orb-widget.tsx"
Cohesion: 0.40
Nodes (4): FloatingOrbWidget(), getApiBase(), OrbFluidWaveProps, VoiceState

### Community 164 - "UpdateBusinessDto"
Cohesion: 0.50
Nodes (3): IsOptional, IsString, UpdateBusinessDto

### Community 184 - "usage-tracking.service.ts"
Cohesion: 0.09
Nodes (27): PlanDocument, CostBreakdown, CostCalculatorService, Injectable, UsageMetricsPayload, DailyUsageSummary, DailyUsageSummaryDocument, DailyUsageSummarySchema (+19 more)

### Community 193 - "LoginDto"
Cohesion: 0.40
Nodes (4): LoginDto, IsEmail, IsNotEmpty, IsString

### Community 196 - "ResetPasswordDto"
Cohesion: 0.40
Nodes (4): ResetPasswordDto, IsNotEmpty, IsString, MinLength

### Community 200 - ".handleSendMessage"
Cohesion: 0.53
Nodes (3): ConnectedSocket, MessageBody, SubscribeMessage

### Community 203 - "UpdateKnowledgeDocDto"
Cohesion: 0.50
Nodes (4): IsBoolean, IsOptional, IsString, UpdateKnowledgeDocDto

## Knowledge Gaps
- **805 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `metadata` (+800 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **76 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bcrypt` connect `server/package.json` to `RedisService`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _805 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BusinessDocument` be split into smaller, more focused modules?**
  _Cohesion score 0.08253968253968254 - nodes in this community are weakly interconnected._
- **Should `product-catalog-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06715063520871144 - nodes in this community are weakly interconnected._
- **Should `RedisService` be split into smaller, more focused modules?**
  _Cohesion score 0.04884004884004884 - nodes in this community are weakly interconnected._
- **Should `rag.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10897435897435898 - nodes in this community are weakly interconnected._
- **Should `auth-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08065458796025717 - nodes in this community are weakly interconnected._