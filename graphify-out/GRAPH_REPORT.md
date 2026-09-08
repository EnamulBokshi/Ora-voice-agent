# Graph Report - ora  (2026-09-08)

## Corpus Check
- 486 files · ~863,135 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3516 nodes · 8046 edges · 217 communities (146 shown, 71 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 352 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6a613496`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CustomersService
- product-catalog-table.tsx
- business.schema.ts
- admin-overview-view.tsx
- auth-service.ts
- notifications.service.ts
- cn
- knowledge-service.ts
- widget.v4_5_lumina.js
- voice-proxy.gateway.ts
- apiClient
- Roles
- .batchSync
- app.module.ts
- ORA Monorepo API Documentation (v1 Aligned)
- format.ts
- setup-guide-client.tsx
- GeminiLiveClient
- live-desk-client.tsx
- invoices.service.ts
- auth.service.ts
- (marketing)/page.tsx
- user-input.controller.ts
- session-detail-panel.tsx
- order.schema.ts
- demo-data.ts
- email-templates.ts
- overview-client.tsx
- AuthService
- users.controller.ts
- notifications-client.tsx
- ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)
- compilerOptions
- dependencies
- ORA Monorepo Build State & Implementation Tracker (v1 Aligned)
- ingestion.module.ts
- product-discovery-and-ingestion-analysis.md
- IngestionController
- compilerOptions
- ShopifyConnectorService
- agent-persona-tab.tsx
- ai-tools.executor.ts
- LiveDeskService
- DomainException
- conversations-client.tsx
- getMeApi
- customers-client.tsx
- UsersService
- orders.service.ts
- ORA Machine & Partner API — Developer Integration Guide
- NotificationsController
- .getClient
- CreateApiClientDto
- components.json
- 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases
- AuthController
- NotificationsService
- StripeProvider
- agent-config.schema.ts
- KnowledgeController
- dependencies
- BillingService
- opengraph-image.tsx
- analytics-panel.tsx
- devDependencies
- Server Engineering Standards & AI Coding Rules (`server/`)
- KnowledgeService
- OrdersController
- UpdateAgentConfigDto
- 🚫 Non-Negotiable Directives
- gemini-voice.service.ts
- 🟡 Significant Improvements
- BillingController
- QueryNotificationsDto
- SearchRagDto
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- 🚀 ORA Production Deployment & Dockerization Guide
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- BkashProvider
- CurrentUser
- knowledge.module.ts
- main.ts
- business-service.ts
- AdminService
- admin-users-view.tsx
- ORA User-Input API (OAuth 2.0 Client Credentials)
- jest
- seed-admin.ts
- .updateCurrentBusiness
- FileIngestionService
- admin-service.ts
- plan-limit.guard.ts
- ProductsService
- scripts
- ConversationsController
- 🚀 Core Directives & Standards
- auth/page.tsx
- 10. Billing, Plans & Payments
- server/package.json
- exclude
- AppController
- OAuthService
- SubmitDocumentDto
- app/layout.tsx
- AdminUserQueryDto
- InvoicesService
- CreateOrderDto
- 2. Architectural Mismatches & Technical Fixes
- UpdateAdminUserDto
- server/README.md
- conversation-types.ts
- ORA — Final Architecture (v6)
- devDependencies
- CreatePlatformUserDto
- 11. Widget Delivery & Injection Architecture
- nest-cli.json
- DocType
- Param
- 🎨 Design System — ORA Violet / Cyan Palette
- InvoicesController
- scripts
- UpdatePlatformAgentDto
- JwtPayloadUser
- RedisService
- merchants-table.tsx
- UpdateSessionLimitDto
- onlyBuiltDependencies
- 2. System Layers
- agent-client.tsx
- PiiRedactor
- client/package.json
- PCMRecorderProcessor
- 4. Ingestion Architecture
- 8. Cross-Cutting Concerns
- InvoiceStatus
- .executeUserAction
- agent-header.tsx
- Next.js template
- 9. Platform-Specific Notes
- CrawlStoreDto
- FileUploadDto
- orders/page.tsx
- (marketing)/layout.tsx
- live-top-bar.tsx
- proxy.ts
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
- domain.exception.ts
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- ioredis
- SubscriptionStatus
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
- UsageChannelType
- passport
- pdf-parse
- reflect-metadata
- resend
- rxjs
- turndown
- xlsx
- prettier
- supertest
- ts-jest
- @types/bcrypt
- @types/bcryptjs
- @types/cookie-parser
- .handleConnection
- @types/jest
- @types/jsdom
- @types/nodemailer
- @types/passport-jwt
- @types/ws
- eslint-config-prettier
- jest
- @nestjs/websockets
- source-map-support
- ts-node
- @types/express
- @types/mozilla__readability
- @types/multer
- @types/node
- @types/supertest
- @types/turndown
- typescript
- typescript-eslint

## God Nodes (most connected - your core abstractions)
1. `cn()` - 122 edges
2. `apiClient()` - 113 edges
3. `DomainException` - 100 edges
4. `JwtPayloadUser` - 92 edges
5. `CurrentUser` - 87 edges
6. `RedisService` - 67 edges
7. `Business` - 53 edges
8. `Roles()` - 52 edges
9. `ProductsService` - 48 edges
10. `BusinessDocument` - 43 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `cn()`  [EXTRACTED]
  client/app/layout.tsx → client/lib/utils.ts
- `WaveformAudioControl()` --calls--> `cn()`  [EXTRACTED]
  client/components/agent/persona/agent-persona-tab.tsx → client/lib/utils.ts
- `UsageDashboardProps` --references--> `SubscriptionDetailsResponse`  [EXTRACTED]
  client/components/billing/usage-dashboard.tsx → client/types/billing.ts
- `LivingOrbCanvas()` --calls--> `cn()`  [EXTRACTED]
  client/components/orb/living-orb.tsx → client/lib/utils.ts
- `WaveformAudioControl()` --calls--> `cn()`  [EXTRACTED]
  client/components/setup/previews/persona-preview.tsx → client/lib/utils.ts

## Import Cycles
- 3-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 3-file cycle: `server/src/agent-config/agent-config.service.ts -> server/src/ai-voice/gemini-voice.service.ts -> server/src/ai-voice/tools/ai-tools.executor.ts -> server/src/agent-config/agent-config.service.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/billing/billing.module.ts -> server/src/auth/auth.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/notifications/notifications.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 5-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/products/products.module.ts -> server/src/api-access/api-access.module.ts -> server/src/auth/auth.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`

## Communities (217 total, 71 thin omitted)

### Community 0 - "CustomersService"
Cohesion: 0.13
Nodes (10): EncryptionUtil, CustomersService, Injectable, CreateCustomerDto, IsEmail, IsNotEmpty, IsObject, IsOptional (+2 more)

### Community 1 - "product-catalog-table.tsx"
Cohesion: 0.06
Nodes (52): ProductDetailsFeedTab(), ProductDetailsFeedTabProps, AVAILABILITY_STATUS, ProductCatalogTable(), ProductCatalogTableProps, SOURCE_LABELS, AVAILABILITY_CONFIG, ProductDetailDrawer() (+44 more)

### Community 2 - "business.schema.ts"
Cohesion: 0.05
Nodes (62): OnboardingEmailPayload, OnboardingEmailService, Injectable, Inject, InjectModel, SubscribeDto, IsEnum, IsNotEmpty (+54 more)

### Community 3 - "admin-overview-view.tsx"
Cohesion: 0.12
Nodes (16): AdminHeader(), AdminHeaderProps, AdminOverviewView(), AdminSystemView(), AdminVoiceMonitorView(), PlatformStatCard(), PlatformStatCardProps, MetricDisplay() (+8 more)

### Community 4 - "auth-service.ts"
Cohesion: 0.10
Nodes (36): AdminGuardProps, AuthHeader(), AuthHeaderProps, ForgotPasswordForm(), ForgotPasswordFormProps, LoginForm(), LoginFormProps, OtpVerificationForm() (+28 more)

### Community 5 - "notifications.service.ts"
Cohesion: 0.13
Nodes (19): CreateNotificationDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, Notification, NotificationCategory (+11 more)

### Community 6 - "cn"
Cohesion: 0.06
Nodes (38): AGENT_ROLES, AgentHub(), AgentRoleCard, FAQS, AgentPageHeader(), AgentPageHeaderProps, AgentSection, SECTION_META (+30 more)

### Community 7 - "knowledge-service.ts"
Cohesion: 0.09
Nodes (36): DOCUMENT_CATEGORIES, DocumentsFeedTab(), DocumentsFeedTabProps, FEED_CATEGORY_META, FeedTab, FeedTabId, KNOWLEDGE_CATEGORIES, KnowledgeCategoryOption (+28 more)

### Community 8 - "widget.v4_5_lumina.js"
Cohesion: 0.12
Nodes (41): armCardAutoDismiss(), armIdleTimer(), arrayBufferToBase64(), base64ToFloat32Array(), cancelCardAutoDismiss(), cancelIdleTimer(), downsampleTo16k(), escapeHtml() (+33 more)

### Community 9 - "voice-proxy.gateway.ts"
Cohesion: 0.07
Nodes (45): InjectConnection, InjectModel, GeminiVoiceSessionControls, ProxySession, ALLOWED_UPLOAD_EXTENSIONS, IdentityVerificationUtil, ConversationsService, Injectable (+37 more)

### Community 10 - "apiClient"
Cohesion: 0.11
Nodes (21): BkashCallbackContent(), apiClient(), executeBkashAgreementApi(), createCustomerApi(), getCustomerByIdApi(), DashboardStatsResponse, FunnelStep, getFunnelAnalyticsApi() (+13 more)

### Community 11 - "Roles"
Cohesion: 0.21
Nodes (15): RFC-6749, Roles(), ROLES_KEY, JwtAuthGuard, Injectable, RolesGuard, Injectable, TenantScopeGuard (+7 more)

### Community 12 - ".batchSync"
Cohesion: 0.14
Nodes (10): FeedParserService, Injectable, SitemapCrawlerService, Injectable, BatchSyncProductsDto, IsArray, IsEnum, IsNotEmpty (+2 more)

### Community 13 - "app.module.ts"
Cohesion: 0.05
Nodes (54): AdminModule, Module, AgentConfigModule, Module, AiVoiceModule, Module, ApiAccessModule, Module (+46 more)

### Community 14 - "ORA Monorepo API Documentation (v1 Aligned)"
Cohesion: 0.05
Nodes (39): 10.1 Intent State Classification Taxonomy (`stateType`), 10. Phase 8: Real-Time Live Desk & Telemetry Command Center (`/api/v1/live-desk`), 11.1 SuperAdmin Role Enforcement & Actor Security, 11.2 Merchants Directory with Key Telemetry (`GET /api/v1/admin/businesses`), 11.3 Revoke Publishable Key (`DELETE /api/v1/admin/businesses/:id/publishable-key`), 11.4 Update Key Status (`PATCH /api/v1/admin/businesses/:id/key-status`), 11.5 Account Action Dispatcher (`POST /api/v1/admin/users/:id/action`), 11. SuperAdmin Platform Command Center & Moderation (`/api/v1/admin`) (+31 more)

### Community 15 - "format.ts"
Cohesion: 0.11
Nodes (24): InvoiceHistory(), InvoiceHistoryProps, UsageDashboard(), UsageDashboardProps, AttributionRow, OraAttributionPanel(), OraAttributionPanelProps, RecentActivityPanelProps (+16 more)

### Community 16 - "setup-guide-client.tsx"
Cohesion: 0.08
Nodes (33): metadata, AgentClientContent(), KnowledgePreview(), VoiceTestPreview(), VoiceTestPreviewProps, ARCH_CONTENT, ArchPageContent, FaqItem (+25 more)

### Community 17 - "GeminiLiveClient"
Cohesion: 0.06
Nodes (34): SessionStatus, TranscriptEntry, VoiceFeedTab(), VoiceFeedTabProps, VoiceMode, InspectorTab, SessionStatus, TranscriptEntry (+26 more)

### Community 18 - "live-desk-client.tsx"
Cohesion: 0.11
Nodes (28): metadata, LiveDeskClient(), LiveStatsBarProps, DEFAULT_SERVICES, OraStatusPanel(), OraStatusPanelProps, DEFAULT_SALES_ACTIONS, SalesActionsPanel() (+20 more)

### Community 19 - "invoices.service.ts"
Cohesion: 0.17
Nodes (18): InjectModel, InvoiceCounter, InvoiceCounterDocument, InvoiceCounterSchema, Prop, Schema, InvoiceDeliveryLog, InvoiceDeliveryLogDocument (+10 more)

### Community 20 - "auth.service.ts"
Cohesion: 0.08
Nodes (26): Length, AuthTokens, ForgotPasswordDto, IsEmail, IsNotEmpty, LoginDto, IsEmail, IsNotEmpty (+18 more)

### Community 21 - "(marketing)/page.tsx"
Cohesion: 0.06
Nodes (27): metadata, metadata, metadata, solutions, CodeSnippet, DocSection, DocsPageClient(), CtaSection() (+19 more)

### Community 22 - "user-input.controller.ts"
Cohesion: 0.10
Nodes (19): SubmitPromptDto, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Body, Controller (+11 more)

### Community 23 - "session-detail-panel.tsx"
Cohesion: 0.18
Nodes (13): ActivityFeed(), ActivityFeedProps, DetailDrawer(), DetailDrawerProps, SessionDetailPanel(), SessionDetailPanelProps, getConversationTranscriptApi(), closeLiveSessionApi() (+5 more)

### Community 24 - "order.schema.ts"
Cohesion: 0.07
Nodes (34): DashboardModule, Module, DashboardService, Injectable, InjectModel, InjectModel, Event, EventDocument (+26 more)

### Community 25 - "demo-data.ts"
Cohesion: 0.10
Nodes (31): metadata, metadata, BillingClient(), BillingClientContent(), CurrentPlanCard(), CurrentPlanCardProps, PlanComparisonGrid(), PlanComparisonGridProps (+23 more)

### Community 26 - "email-templates.ts"
Cohesion: 0.12
Nodes (23): CongratulationsEmailData, ForgotPasswordData, getFallbackHtml(), getTemplatePath(), ORA_EMAIL_THEME, OtpEmailData, renderCongratulationsTemplate(), renderEjsTemplate() (+15 more)

### Community 27 - "overview-client.tsx"
Cohesion: 0.13
Nodes (14): metadata, TopHeader(), TopHeaderProps, EMPTY_STATS, getGreeting(), OverviewClient(), QuickAction, QuickActionsBar() (+6 more)

### Community 28 - "AuthService"
Cohesion: 0.14
Nodes (4): AuthService, Injectable, JwtStrategy, Injectable

### Community 29 - "users.controller.ts"
Cohesion: 0.14
Nodes (12): ChangePasswordDto, IsNotEmpty, IsString, MinLength, IsOptional, IsString, MinLength, UpdateProfileDto (+4 more)

### Community 30 - "notifications-client.tsx"
Cohesion: 0.16
Nodes (16): metadata, NotificationItem(), NotificationItemProps, NotificationCategory, NotificationItemData, NotificationsClient(), initialNotifications, createNotificationApi() (+8 more)

### Community 31 - "ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)"
Cohesion: 0.07
Nodes (29): 10. Landing Page Color System — Stitch "Lumina" Palette, 1. Monorepo Architecture Overview, 2. Actor Model & Authentication Taxonomy, 3. Core Security & Scoping Baseline, 4.1 Token Design, 4.2 Refresh Rotation & Theft Detection, 4.3 Session Revocation, 4. Authentication Mechanics — JWT + Session Hybrid (AdminUser) (+21 more)

### Community 32 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 33 - "dependencies"
Cohesion: 0.07
Nodes (29): bcrypt, bullmq, cheerio, cookie-parser, fast-xml-parser, jsdom, @nestjs/core, @nestjs/mapped-types (+21 more)

### Community 34 - "ORA Monorepo Build State & Implementation Tracker (v1 Aligned)"
Cohesion: 0.07
Nodes (28): Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components, Implemented Components & RAG Engine Fixes, Implemented Components & Security Hardening (+20 more)

### Community 35 - "ingestion.module.ts"
Cohesion: 0.07
Nodes (27): InjectQueue, Processor, JsonLdExtractor, Injectable, ReadabilityExtractor, Injectable, PlatformFastPathService, Injectable (+19 more)

### Community 36 - "product-discovery-and-ingestion-analysis.md"
Cohesion: 0.07
Nodes (28): 1. Executive Summary, 1. Next.js SPA Client-Side Routing Blackhole, 1. SPA Route Interception (Next.js / Inertia / Vue), 2. Client-Side Rendered DOM Extraction, 2. Localhost & Custom Domain API Base Misconfiguration, 2. Root Cause Analysis (Technical Breakdown), 3. Client-Side Catalog Listing Harvester, 3. Comparison Matrix: Platform Behaviors (+20 more)

### Community 37 - "IngestionController"
Cohesion: 0.27
Nodes (11): IngestionController, Body, Controller, Headers, HttpCode, Param, Post, Req (+3 more)

### Community 38 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+20 more)

### Community 39 - "ShopifyConnectorService"
Cohesion: 0.13
Nodes (11): ShopifyConnectorService, Injectable, InjectModel, Optional, QueryProductsDto, IsEnum, IsNumber, IsOptional (+3 more)

### Community 40 - "agent-persona-tab.tsx"
Cohesion: 0.10
Nodes (30): AgentPersonaTab(), ArchetypeOption, ARCHETYPES, PRESET_TEMPLATES, PresetTemplate, VOICE_OPTIONS, VoiceOption, WaveformAudioControl() (+22 more)

### Community 41 - "ai-tools.executor.ts"
Cohesion: 0.10
Nodes (18): AgentConfigService, Injectable, InjectModel, Optional, InjectModel, Optional, EventsService, Injectable (+10 more)

### Community 42 - "LiveDeskService"
Cohesion: 0.12
Nodes (10): LiveDeskController, Controller, Get, HttpCode, Param, Post, Query, UseGuards (+2 more)

### Community 43 - "DomainException"
Cohesion: 0.17
Nodes (5): BootstrapRateLimitGuard, Injectable, DomainException, DualAuthGuard, Injectable

### Community 44 - "conversations-client.tsx"
Cohesion: 0.23
Nodes (11): metadata, formatSessionRef(), mapApiConversationToUi(), mapApiMessagesToUi(), ConversationTranscript(), ConversationsClient(), fetchTranscript(), demoConversationItems (+3 more)

### Community 45 - "getMeApi"
Cohesion: 0.08
Nodes (24): metadata, DashboardLayoutProps, metadata, AdminGuard(), checkAdminAccess(), AdminLayoutShell(), AdminLayoutShellProps, adminNavItems (+16 more)

### Community 46 - "customers-client.tsx"
Cohesion: 0.20
Nodes (12): metadata, CustomerDetailPanel(), CustomerDetailPanelProps, CustomersClient(), CustomersHeader(), CustomersTable(), CustomersTableProps, getCustomersApi() (+4 more)

### Community 47 - "UsersService"
Cohesion: 0.13
Nodes (7): Optional, Controller, UseGuards, UsersController, Injectable, InjectModel, UsersService

### Community 48 - "orders.service.ts"
Cohesion: 0.19
Nodes (9): IsEnum, IsObject, IsOptional, UpdateOrderDto, OrdersService, Injectable, OrderSource, MERCHANT_PLATFORM (+1 more)

### Community 49 - "ORA Machine & Partner API — Developer Integration Guide"
Cohesion: 0.05
Nodes (36): 1. Authentication Methods, 2. OAuth 2.0 Scopes Reference, 3.1 Batch Sync Products (Primary Sync Method), 3.2 Create Single Product, 3.3 List / Search Products, 3.4 Get Product by ID, 3.5 Update / Override Product, 3.6 Delete Product (+28 more)

### Community 50 - "NotificationsController"
Cohesion: 0.13
Nodes (10): NotificationsController, Body, Controller, Delete, Get, HttpCode, Param, Patch (+2 more)

### Community 51 - ".getClient"
Cohesion: 0.12
Nodes (4): AiToolsExecutor, Injectable, EmbeddingService, Injectable

### Community 52 - "CreateApiClientDto"
Cohesion: 0.09
Nodes (20): ArrayNotEmpty, CreateApiClientDto, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength (+12 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases"
Cohesion: 0.09
Nodes (21): 1. Executive Summary & Problem Statement, 1. Mandatory Store & Platform Disclosure at Onboarding, 2. Analysis of the Three Tooling Strategies, 2. Sitemap & Routing Information Architecture (Navigation Unlocking), 3. API Documentation & OpenAPI Schema Ingestion (Custom Tool Unlocking), 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases, 4. Granular Tool Permission Toggles (Agent Control Center), 4. Handling Non-E-Commerce & Zero-API Businesses (+13 more)

### Community 55 - "AuthController"
Cohesion: 0.25
Nodes (10): Res, AuthController, Body, Controller, Get, HttpCode, Post, Query (+2 more)

### Community 56 - "NotificationsService"
Cohesion: 0.24
Nodes (5): NotificationsService, Injectable, InjectModel, NotificationDocument, InjectModel

### Community 57 - "StripeProvider"
Cohesion: 0.14
Nodes (6): ChargeResult, CustomerBillingDetails, PaymentProvider, ProviderSubscriptionRef, StripeProvider, Injectable

### Community 58 - "agent-config.schema.ts"
Cohesion: 0.10
Nodes (30): Inject, InjectModel, Optional, AgentConfig, AgentConfigDocument, AgentConfigSchema, SalesPlaybook, SalesPlaybookDocument (+22 more)

### Community 59 - "KnowledgeController"
Cohesion: 0.18
Nodes (12): KnowledgeController, Body, Controller, Delete, Get, Param, Patch, Post (+4 more)

### Community 60 - "dependencies"
Cohesion: 0.10
Nodes (21): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, lucide-react, next-themes, react (+13 more)

### Community 61 - "BillingService"
Cohesion: 0.16
Nodes (4): BillingService, Injectable, BillingSchedulerService, Injectable

### Community 62 - "opengraph-image.tsx"
Cohesion: 0.33
Nodes (4): alt, contentType, runtime, size

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
Cohesion: 0.17
Nodes (7): KnowledgeService, Inject, Injectable, InjectModel, Optional, KnowledgeBaseDocument, KnowledgeChunkDocument

### Community 67 - "OrdersController"
Cohesion: 0.16
Nodes (10): OrdersController, Body, Controller, Get, HttpCode, Param, Patch, Post (+2 more)

### Community 68 - "UpdateAgentConfigDto"
Cohesion: 0.10
Nodes (15): AgentConfigController, Body, Controller, Get, Patch, UseGuards, IsArray, IsBoolean (+7 more)

### Community 69 - "🚫 Non-Negotiable Directives"
Cohesion: 0.11
Nodes (18): 1. Next.js 16+ Architecture Basis (`proxy.ts` mandatory), 2. Server Components First (No `"use client"` in `page.tsx`), 3. Component-Based Architecture & File Separation, 4. Service & Action Organization, 5. API Response Handling & Envelope Unwrapping, 6. Client State vs Server State, 7. Widget Embed & Delivery Architecture (v5 Section 11), 8. Marketing / Landing Page Conventions (+10 more)

### Community 70 - "gemini-voice.service.ts"
Cohesion: 0.10
Nodes (19): BootstrapVoiceSessionDto, IsNotEmpty, IsOptional, IsString, GeminiVoiceService, GeminiVoiceSessionOptions, LEGACY_VOICE_MAP, normalizeGeminiVoice() (+11 more)

### Community 71 - "🟡 Significant Improvements"
Cohesion: 0.11
Nodes (18): 10. RAG Result Cache Doesn't Invalidate on Product Changes, 11. Knowledge Chunking Is Character-Based, Not Semantic, 12. No `isEmbedded` Flag for Knowledge Chunks, 13. Feed Parser Uses Regex for XML, 14. No Product Image Extraction in DOM Strategy D, 1. Tier 1 Webhooks Never Trigger Vector Embedding, 2. Product Deletion Doesn't Clean Up Vector Index, 3. Brute-Force Vector Search Won't Scale (+10 more)

### Community 72 - "BillingController"
Cohesion: 0.22
Nodes (9): BillingController, Body, Controller, Get, Headers, HttpCode, Post, Req (+1 more)

### Community 73 - "QueryNotificationsDto"
Cohesion: 0.29
Nodes (6): IsBooleanString, IsNumberString, QueryNotificationsDto, IsEnum, IsOptional, Query

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

### Community 79 - "CurrentUser"
Cohesion: 0.16
Nodes (18): Scopes(), CurrentUser, IsEnum, IsNumber, IsOptional, Min, VerifyLiveDto, ProductsController (+10 more)

### Community 80 - "knowledge.module.ts"
Cohesion: 0.27
Nodes (8): KnowledgeBase, KnowledgeBaseSchema, Prop, Schema, KnowledgeChunk, KnowledgeChunkSchema, Prop, Schema

### Community 81 - "main.ts"
Cohesion: 0.16
Nodes (9): Catch, AppModule, Module, AllExceptionsFilter, ErrorEnvelope, SuccessEnvelope, TransformInterceptor, Injectable (+1 more)

### Community 82 - "business-service.ts"
Cohesion: 0.25
Nodes (14): MerchantCredentialsCard(), MerchantCredentialsCardProps, PLATFORMS, PlatformTab, BusinessDetailsCard(), BusinessDetailsCardProps, resendOnboardingApi(), deletePublishableKeyApi() (+6 more)

### Community 83 - "AdminService"
Cohesion: 0.12
Nodes (7): AdminController, Controller, Get, Query, UseGuards, AdminService, Injectable

### Community 84 - "admin-users-view.tsx"
Cohesion: 0.20
Nodes (10): AdminUsersTable(), AdminUsersTableProps, AdminUsersView(), TablePagination(), TablePaginationProps, createPlatformUser(), fetchAdminUsers(), AdminUserItem (+2 more)

### Community 85 - "ORA User-Input API (OAuth 2.0 Client Credentials)"
Cohesion: 0.11
Nodes (17): 1. Get credentials, 2. Get an access token, 3. Submit a prompt, 4. Submit a text document, 5. Upload a file, 6. Read back captured sessions, 7.1 Batch Sync Products (Primary Integration Method), 7.2 Create a Single Product (+9 more)

### Community 86 - "jest"
Cohesion: 0.13
Nodes (15): js, json, /node_modules/(?!(@exodus|html-encoding-sniffer)/), **/*.(t|j)s, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+7 more)

### Community 87 - "seed-admin.ts"
Cohesion: 0.13
Nodes (13): adminEmail, adminName, adminPassword, AdminRole, ADMIN, OWNER, STAFF, SUPER_ADMIN (+5 more)

### Community 88 - ".updateCurrentBusiness"
Cohesion: 0.16
Nodes (12): Body, Delete, Get, HttpCode, Patch, Post, Req, UseGuards (+4 more)

### Community 90 - "admin-service.ts"
Cohesion: 0.08
Nodes (38): metadata, AdminUserDetailPageProps, metadata, AdminPlatformAgentCard(), AdminTokenUsageView(), formatChartDate(), getContinuousTimeline(), AdminUserDetailView() (+30 more)

### Community 91 - "plan-limit.guard.ts"
Cohesion: 0.29
Nodes (3): METERED_METRIC_KEY, PlanLimitGuard, Injectable

### Community 92 - "ProductsService"
Cohesion: 0.06
Nodes (52): FIELD_ALIASES, IngestionSummary, CreateProductDto, IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject (+44 more)

### Community 93 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, seed:admin, start, start:debug, start:dev (+6 more)

### Community 94 - "ConversationsController"
Cohesion: 0.16
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

### Community 101 - "OAuthService"
Cohesion: 0.15
Nodes (6): InjectModel, OAuthScopesGuard, Injectable, OAuthService, Injectable, ApiClientDocument

### Community 102 - "SubmitDocumentDto"
Cohesion: 0.29
Nodes (7): SubmitDocumentDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength

### Community 103 - "app/layout.tsx"
Cohesion: 0.22
Nodes (8): inter, jetbrainsMono, metadata, newsreader, RootLayout(), spaceGrotesk, viewport, ThemeProvider()

### Community 104 - "AdminUserQueryDto"
Cohesion: 0.20
Nodes (8): AdminUserQueryDto, IsIn, IsNumber, IsOptional, IsString, Max, Min, Type

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
Cohesion: 0.19
Nodes (14): ConversationListPanel(), ConversationListPanelProps, ConversationTranscriptProps, ChannelType, ChatMessage, ConversationItem, ConvStatus, ConversationCard() (+6 more)

### Community 111 - "ORA — Final Architecture (v6)"
Cohesion: 0.22
Nodes (8): 12. Decisions, 13. Changelog, 1. Overview, 3. Query-Time Product Resolution Flow, 5. Context Feeding (The "Knows the Store" Layer), 6. Data Shapes, 7. APIs → Owning Service, ORA — Final Architecture (v6)

### Community 112 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, ts-loader, tsconfig-paths, @types/ejs, eslint, ts-loader, tsconfig-paths (+1 more)

### Community 113 - "CreatePlatformUserDto"
Cohesion: 0.22
Nodes (8): Post, CreatePlatformUserDto, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength

### Community 115 - "11. Widget Delivery & Injection Architecture"
Cohesion: 0.25
Nodes (8): 11.1 Why this needs its own section, 11.2 Two-Stage Loader Pattern, 11.3 CDN Structure & Versioning, 11.4 Isolation — Shadow DOM Mounting, 11.5 Authentication Model — Publishable Key, 11.6 Capability Gating (Tier-Aware Rendering), 11.7 Passive Page Context Capture, 11. Widget Delivery & Injection Architecture

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, entryFile, $schema, sourceRoot

### Community 117 - "DocType"
Cohesion: 0.11
Nodes (17): CreateKnowledgeDocDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsBoolean, IsOptional (+9 more)

### Community 118 - "Param"
Cohesion: 0.21
Nodes (3): Body, Param, Patch

### Community 119 - "🎨 Design System — ORA Violet / Cyan Palette"
Cohesion: 0.29
Nodes (6): Color Tokens, 🎨 Design System — ORA Violet / Cyan Palette, 🚫 Non-Negotiable Directives, Palette Usage Rules, Project Architecture & Always-On Coding Rules, Surface Elevation Scale (Dark Mode)

### Community 120 - "InvoicesController"
Cohesion: 0.17
Nodes (9): Header, InvoicesController, Controller, Get, HttpCode, Param, Post, Query (+1 more)

### Community 121 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, format, lint, start, typecheck

### Community 122 - "UpdatePlatformAgentDto"
Cohesion: 0.25
Nodes (6): IsBoolean, IsIn, IsOptional, IsString, MaxLength, UpdatePlatformAgentDto

### Community 124 - "JwtPayloadUser"
Cohesion: 0.09
Nodes (20): Delete, Get, Param, UseGuards, JwtPayloadUser, CustomersController, Body, Controller (+12 more)

### Community 125 - "RedisService"
Cohesion: 0.04
Nodes (37): IsUrl, InjectModel, InjectModel, InjectModel, ApiKeyGuard, Injectable, InjectModel, RedisService (+29 more)

### Community 126 - "merchants-table.tsx"
Cohesion: 0.26
Nodes (9): AdminMerchantsView(), MerchantsTable(), MerchantsTableProps, adminRevokeBusinessKeyApi(), adminUpdateKeyStatusApi(), fetchAdminBusinesses(), updateBusinessStatus(), AdminBusinessItem (+1 more)

### Community 127 - "UpdateSessionLimitDto"
Cohesion: 0.33
Nodes (5): IsNumber, IsOptional, Max, Min, UpdateSessionLimitDto

### Community 128 - "onlyBuiltDependencies"
Cohesion: 0.33
Nodes (6): esbuild, @swc/core, unrs-resolver, pnpm, onlyBuiltDependencies, sharp

### Community 129 - "2. System Layers"
Cohesion: 0.33
Nodes (6): 2.1 Widget (Browser, on Merchant's Site), 2.2 Gateway Layer, 2.3 Core Services (NestJS), 2.4 Data Layer, 2.5 Merchant Data Sources (Tiered), 2. System Layers

### Community 130 - "agent-client.tsx"
Cohesion: 0.11
Nodes (20): metadata, AgentClient(), AgentGetStartedPage(), AgentGetStartedPageProps, FaqItem, HowRow, ROLE_CONTENT, RolePageContent (+12 more)

### Community 132 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 134 - "4. Ingestion Architecture"
Cohesion: 0.40
Nodes (5): 4.1 Requirements, 4.2 Confidence Score Ladder, 4.3 Webhook Ingestion Service (Tier 1), 4.4 Background Re-sync, 4. Ingestion Architecture

### Community 135 - "8. Cross-Cutting Concerns"
Cohesion: 0.40
Nodes (5): 8.1 State Management, 8.2 Security, 8.3 Scaling, 8.4 Tech Stack, 8. Cross-Cutting Concerns

### Community 136 - "InvoiceStatus"
Cohesion: 0.50
Nodes (4): InvoiceStatus, FAILED, GENERATED, SENT

### Community 137 - ".executeUserAction"
Cohesion: 0.20
Nodes (5): Delete, Req, AdminUserActionDto, IsIn, IsNotEmpty

### Community 138 - "agent-header.tsx"
Cohesion: 0.43
Nodes (5): AgentHeader(), AgentHeaderProps, SECTION_HEADERS, Button(), buttonVariants

### Community 139 - "Next.js template"
Cohesion: 0.50
Nodes (3): Adding components, Next.js template, Using components

### Community 140 - "9. Platform-Specific Notes"
Cohesion: 0.50
Nodes (4): 9. Platform-Specific Notes, BigCommerce / Magento, Shopify, WooCommerce

### Community 142 - "CrawlStoreDto"
Cohesion: 0.50
Nodes (3): CrawlStoreDto, IsNotEmpty, IsString

### Community 143 - "FileUploadDto"
Cohesion: 0.50
Nodes (3): FileUploadDto, IsOptional, IsString

### Community 164 - "domain.exception.ts"
Cohesion: 0.18
Nodes (18): ApiClientService, Injectable, SCOPES_KEY, ClientTokenPayload, MACHINE_TOKEN_AUDIENCE, RFC-6749, ApiClient, ApiClientStatus (+10 more)

### Community 170 - "SubscriptionStatus"
Cohesion: 0.33
Nodes (6): SubscriptionStatus, ACTIVE, CANCELED, PAST_DUE, SUSPENDED, TRIALING

### Community 184 - "UsageChannelType"
Cohesion: 0.40
Nodes (5): UsageChannelType, CHAT_TURN, RAG_EMBEDDING, TOOL_EXECUTION, VOICE_STREAM

### Community 200 - ".handleConnection"
Cohesion: 0.07
Nodes (19): Injectable, VoiceProxyGateway, ConversationGateway, ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer (+11 more)

## Knowledge Gaps
- **862 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `metadata` (+857 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bcrypt` connect `server/package.json` to `business.schema.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _862 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CustomersService` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `product-catalog-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06284153005464481 - nodes in this community are weakly interconnected._
- **Should `business.schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0546984572230014 - nodes in this community are weakly interconnected._
- **Should `admin-overview-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12433862433862433 - nodes in this community are weakly interconnected._
- **Should `auth-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10374149659863946 - nodes in this community are weakly interconnected._