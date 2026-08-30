# Graph Report - ora  (2026-08-28)

## Corpus Check
- 442 files · ~807,656 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3172 nodes · 7120 edges · 215 communities (140 shown, 75 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 299 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea42af25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-service.ts
- product-catalog-table.tsx
- RedisService
- ProductsService
- auth-service.ts
- orders.service.ts
- cn
- knowledge-service.ts
- widget.v4_5_lumina.js
- admin.service.ts
- billing.service.ts
- Roles
- JwtPayloadUser
- app.module.ts
- ORA Monorepo API Documentation (v1 Aligned)
- CustomersService
- setup-guide-client.tsx
- GeminiLiveClient
- live-desk-client.tsx
- invoices.service.ts
- auth.service.ts
- conversations-client.tsx
- apiClient
- getMeApi
- live-desk.module.ts
- knowledge.service.ts
- email-templates.ts
- agent-client.tsx
- CurrentUser
- users.service.ts
- RagService
- ORA — Monorepo Agent Rules & Engineering Workflow (Architecture v5 Aligned)
- compilerOptions
- dependencies
- ORA Monorepo Build State & Implementation Tracker (v1 Aligned)
- format.ts
- product-discovery-and-ingestion-analysis.md
- IngestionController
- compilerOptions
- DomainException
- persona-preview.tsx
- ai-tools.executor.ts
- LiveDeskService
- billing-client.tsx
- ProductDocument
- admin-sidebar.tsx
- customers-client.tsx
- (marketing)/page.tsx
- OrdersService
- domain.exception.ts
- CustomersController
- .getClient
- UsersService
- components.json
- 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases
- AuthController
- BillingService
- StripeProvider
- ingestion.module.ts
- VectorStoreService
- dependencies
- overview-client.tsx
- session-detail-panel.tsx
- analytics-panel.tsx
- devDependencies
- Server Engineering Standards & AI Coding Rules (`server/`)
- KnowledgeService
- OrdersController
- UpdateAgentConfigDto
- 🚫 Non-Negotiable Directives
- billing-service.ts
- 🟡 Significant Improvements
- BillingController
- BkashProvider
- SearchRagDto
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- 🚀 ORA Production Deployment & Dockerization Guide
- ✦ ORA Voice AI — Official Merchant Owner Manual & Actionable Guide
- DomTelemetryDto
- ProductsController
- ReadabilityExtractor
- main.ts
- merchant-credentials-card.tsx
- AdminController
- CreateProductDto
- demo-data.ts
- jest
- seed-admin.ts
- .deletePublishableKey
- FileIngestionService
- PlatformFastPathService
- app/layout.tsx
- rag-service.ts
- scripts
- ConversationsController
- 🚀 Core Directives & Standards
- auth/page.tsx
- 10. Billing, Plans & Payments
- server/package.json
- exclude
- AppController
- VoiceGateway
- .batchSync
- .executeUserAction
- AdminUserQueryDto
- JsonLdExtractor
- CreateOrderDto
- 2. Architectural Mismatches & Technical Fixes
- SitemapDiscoveryService
- server/README.md
- ConversationGateway
- ORA — Final Architecture (v6)
- devDependencies
- CreatePlatformUserDto
- UpdateAdminUserDto
- 11. Widget Delivery & Injection Architecture
- nest-cli.json
- plan-limit.guard.ts
- PlatformSnifferService
- 🎨 Design System — ORA Violet / Cyan Palette
- agent-header.tsx
- scripts
- UpdatePlatformAgentDto
- AdminService
- Body
- PassiveIngestDto
- QueryProductsDto
- UpdateProductOverrideDto
- onlyBuiltDependencies
- 2. System Layers
- SubscriptionStatus
- PiiRedactor
- client/package.json
- PCMRecorderProcessor
- 4. Ingestion Architecture
- 8. Cross-Cutting Concerns
- ApiKeyGuard
- FeedParserService
- VerifyLiveDto
- Next.js template
- 9. Platform-Specific Notes
- AdminUserActionDto
- CrawlStoreDto
- FileUploadDto
- orders/page.tsx
- (marketing)/layout.tsx
- live-top-bar.tsx
- proxy.ts
- MailModule
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
- eslint-config-prettier
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- ioredis
- jest
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
- @nestjs/websockets
- passport
- pdf-parse
- reflect-metadata
- resend
- rxjs
- turndown
- xlsx
- prettier
- source-map-support
- supertest
- ts-jest
- ts-node
- @types/bcrypt
- @types/bcryptjs
- @types/cookie-parser
- @types/express
- @types/jest
- @types/jsdom
- @types/mozilla__readability
- @types/multer
- @types/node
- @types/nodemailer
- @types/passport-jwt
- @types/supertest
- @types/turndown
- @types/ws
- typescript
- typescript-eslint

## God Nodes (most connected - your core abstractions)
1. `cn()` - 111 edges
2. `apiClient()` - 109 edges
3. `JwtPayloadUser` - 87 edges
4. `CurrentUser` - 82 edges
5. `DomainException` - 74 edges
6. `RedisService` - 56 edges
7. `ProductsService` - 46 edges
8. `Roles()` - 45 edges
9. `Business` - 44 edges
10. `BusinessDocument` - 36 edges

## Surprising Connections (you probably didn't know these)
- `RootLayout()` --calls--> `cn()`  [EXTRACTED]
  client/app/layout.tsx → client/lib/utils.ts
- `checkAdminAccess()` --calls--> `getMeApi()`  [EXTRACTED]
  client/components/admin/admin-guard.tsx → client/services/auth-service.ts
- `LivingOrbCanvas()` --calls--> `cn()`  [EXTRACTED]
  client/components/orb/living-orb.tsx → client/lib/utils.ts
- `WaveformAudioControl()` --calls--> `cn()`  [EXTRACTED]
  client/components/setup/previews/persona-preview.tsx → client/lib/utils.ts
- `fetchAdminBusinessById()` --calls--> `apiClient()`  [EXTRACTED]
  client/services/admin-service.ts → client/lib/api-client.ts

## Import Cycles
- 3-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/orders/orders.module.ts -> server/src/notifications/notifications.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`
- 4-file cycle: `server/src/ai-voice/ai-voice.module.ts -> server/src/billing/billing.module.ts -> server/src/auth/auth.module.ts -> server/src/users/users.module.ts -> server/src/ai-voice/ai-voice.module.ts`

## Communities (215 total, 75 thin omitted)

### Community 0 - "admin-service.ts"
Cohesion: 0.06
Nodes (52): AdminHeader(), AdminHeaderProps, AdminMerchantsView(), AdminOverviewView(), AdminPlatformAgentCard(), AdminSystemView(), AdminUsersTable(), AdminUsersTableProps (+44 more)

### Community 1 - "product-catalog-table.tsx"
Cohesion: 0.06
Nodes (52): ProductDetailsFeedTab(), ProductDetailsFeedTabProps, AVAILABILITY_STATUS, ProductCatalogTable(), ProductCatalogTableProps, SOURCE_LABELS, AVAILABILITY_CONFIG, ProductDetailDrawer() (+44 more)

### Community 2 - "RedisService"
Cohesion: 0.08
Nodes (35): InjectConnection, RedisService, SessionData, Injectable, ConversationsService, Injectable, InjectModel, Conversation (+27 more)

### Community 3 - "ProductsService"
Cohesion: 0.10
Nodes (26): FIELD_ALIASES, IngestionSummary, ProductsService, Injectable, ProductAvailability, DISCONTINUED, IN_STOCK, OUT_OF_STOCK (+18 more)

### Community 4 - "auth-service.ts"
Cohesion: 0.11
Nodes (35): AuthHeader(), AuthHeaderProps, ForgotPasswordForm(), ForgotPasswordFormProps, LoginForm(), LoginFormProps, OtpVerificationForm(), OtpVerificationFormProps (+27 more)

### Community 5 - "orders.service.ts"
Cohesion: 0.07
Nodes (35): IsBooleanString, IsNumberString, CreateNotificationDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString (+27 more)

### Community 6 - "cn"
Cohesion: 0.07
Nodes (34): AgentPageHeader(), AgentPageHeaderProps, AgentSection, SECTION_META, BillingHeader(), NavGroupDef, NavIconButton(), NavIconButtonProps (+26 more)

### Community 7 - "knowledge-service.ts"
Cohesion: 0.09
Nodes (37): DOCUMENT_CATEGORIES, DocumentsFeedTab(), DocumentsFeedTabProps, FEED_CATEGORY_META, FeedTab, FeedTabId, KNOWLEDGE_CATEGORIES, KnowledgeCategoryOption (+29 more)

### Community 8 - "widget.v4_5_lumina.js"
Cohesion: 0.12
Nodes (41): armCardAutoDismiss(), armIdleTimer(), arrayBufferToBase64(), base64ToFloat32Array(), cancelCardAutoDismiss(), cancelIdleTimer(), downsampleTo16k(), escapeHtml() (+33 more)

### Community 9 - "admin.service.ts"
Cohesion: 0.13
Nodes (23): GeminiVoiceSessionControls, GeminiVoiceSessionOptions, LEGACY_VOICE_MAP, VALID_GEMINI_VOICES, ORA_TOOL_DECLARATIONS, ProxySession, IdentityVerificationUtil, CustomerResolutionOptions (+15 more)

### Community 10 - "billing.service.ts"
Cohesion: 0.09
Nodes (33): AuthModule, Module, OnboardingEmailPayload, OnboardingEmailService, Injectable, SubscribeDto, IsEnum, IsNotEmpty (+25 more)

### Community 11 - "Roles"
Cohesion: 0.22
Nodes (14): Roles(), ROLES_KEY, JwtAuthGuard, Injectable, RolesGuard, Injectable, TenantScopeGuard, Injectable (+6 more)

### Community 12 - "JwtPayloadUser"
Cohesion: 0.08
Nodes (24): JwtPayloadUser, KnowledgeController, Body, Controller, Delete, Get, Param, Patch (+16 more)

### Community 13 - "app.module.ts"
Cohesion: 0.09
Nodes (33): AdminModule, Module, AgentConfigModule, Module, AiVoiceModule, Module, BillingModule, Module (+25 more)

### Community 14 - "ORA Monorepo API Documentation (v1 Aligned)"
Cohesion: 0.05
Nodes (39): 10.1 Intent State Classification Taxonomy (`stateType`), 10. Phase 8: Real-Time Live Desk & Telemetry Command Center (`/api/v1/live-desk`), 11.1 SuperAdmin Role Enforcement & Actor Security, 11.2 Merchants Directory with Key Telemetry (`GET /api/v1/admin/businesses`), 11.3 Revoke Publishable Key (`DELETE /api/v1/admin/businesses/:id/publishable-key`), 11.4 Update Key Status (`PATCH /api/v1/admin/businesses/:id/key-status`), 11.5 Account Action Dispatcher (`POST /api/v1/admin/users/:id/action`), 11. SuperAdmin Platform Command Center & Moderation (`/api/v1/admin`) (+31 more)

### Community 15 - "CustomersService"
Cohesion: 0.08
Nodes (15): GeminiVoiceService, normalizeGeminiVoice(), Injectable, InjectModel, Optional, getToolsForArchetype(), Injectable, InjectModel (+7 more)

### Community 16 - "setup-guide-client.tsx"
Cohesion: 0.09
Nodes (31): metadata, AgentClientContent(), KnowledgePreview(), VoiceTestPreview(), VoiceTestPreviewProps, ARCH_CONTENT, ArchPageContent, FaqItem (+23 more)

### Community 17 - "GeminiLiveClient"
Cohesion: 0.10
Nodes (17): SessionStatus, TranscriptEntry, VoiceFeedTab(), VoiceFeedTabProps, VoiceMode, SessionStatus, TranscriptEntry, VoiceMode (+9 more)

### Community 18 - "live-desk-client.tsx"
Cohesion: 0.11
Nodes (28): metadata, LiveDeskClient(), LiveStatsBarProps, DEFAULT_SERVICES, OraStatusPanel(), OraStatusPanelProps, DEFAULT_SALES_ACTIONS, SalesActionsPanel() (+20 more)

### Community 19 - "invoices.service.ts"
Cohesion: 0.11
Nodes (26): InvoicesModule, Module, InvoicesService, Injectable, InjectModel, InvoiceCounter, InvoiceCounterDocument, InvoiceCounterSchema (+18 more)

### Community 20 - "auth.service.ts"
Cohesion: 0.08
Nodes (26): Length, AuthTokens, ForgotPasswordDto, IsEmail, IsNotEmpty, LoginDto, IsEmail, IsNotEmpty (+18 more)

### Community 21 - "conversations-client.tsx"
Cohesion: 0.12
Nodes (24): metadata, formatSessionRef(), mapApiConversationToUi(), mapApiMessagesToUi(), ConversationListPanel(), ConversationListPanelProps, ConversationTranscript(), ConversationTranscriptProps (+16 more)

### Community 22 - "apiClient"
Cohesion: 0.12
Nodes (25): metadata, NotificationItem(), NotificationItemProps, NotificationCategory, NotificationItemData, NotificationsClient(), apiClient(), initialNotifications (+17 more)

### Community 23 - "getMeApi"
Cohesion: 0.09
Nodes (20): DashboardLayoutProps, metadata, metadata, metadata, DashboardGuard(), checkAccess(), DashboardGuardProps, Sidebar() (+12 more)

### Community 24 - "live-desk.module.ts"
Cohesion: 0.11
Nodes (26): ConversationSchema, DashboardModule, Module, Event, EventDocument, EventSchema, EventType, AUTHORITY_ESCALATION_FLAGGED (+18 more)

### Community 25 - "knowledge.service.ts"
Cohesion: 0.10
Nodes (26): CreateKnowledgeDocDto, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsBoolean, IsOptional (+18 more)

### Community 26 - "email-templates.ts"
Cohesion: 0.14
Nodes (20): CongratulationsEmailData, ForgotPasswordData, getFallbackHtml(), getTemplatePath(), ORA_EMAIL_THEME, OtpEmailData, renderCongratulationsTemplate(), renderEjsTemplate() (+12 more)

### Community 27 - "agent-client.tsx"
Cohesion: 0.10
Nodes (23): metadata, AgentClient(), AgentGetStartedPage(), AgentGetStartedPageProps, FaqItem, HowRow, ROLE_CONTENT, RolePageContent (+15 more)

### Community 28 - "CurrentUser"
Cohesion: 0.10
Nodes (17): Header, CurrentUser, DashboardController, Controller, Get, Query, UseGuards, DashboardService (+9 more)

### Community 29 - "users.service.ts"
Cohesion: 0.09
Nodes (20): BusinessController, Controller, ChangePasswordDto, IsNotEmpty, IsString, MinLength, IsOptional, IsString (+12 more)

### Community 30 - "RagService"
Cohesion: 0.09
Nodes (10): InjectModel, ManualConnectorService, Injectable, InjectModel, Injectable, WooCommerceConnectorService, RagService, Injectable (+2 more)

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

### Community 35 - "format.ts"
Cohesion: 0.13
Nodes (21): CurrentPlanCard(), CurrentPlanCardProps, UsageDashboard(), UsageDashboardProps, AttributionRow, OraAttributionPanel(), OraAttributionPanelProps, RecentActivityPanelProps (+13 more)

### Community 36 - "product-discovery-and-ingestion-analysis.md"
Cohesion: 0.07
Nodes (28): 1. Executive Summary, 1. Next.js SPA Client-Side Routing Blackhole, 1. SPA Route Interception (Next.js / Inertia / Vue), 2. Client-Side Rendered DOM Extraction, 2. Localhost & Custom Domain API Base Misconfiguration, 2. Root Cause Analysis (Technical Breakdown), 3. Client-Side Catalog Listing Harvester, 3. Comparison Matrix: Platform Behaviors (+20 more)

### Community 37 - "IngestionController"
Cohesion: 0.13
Nodes (19): IsUrl, FeedIngestDto, IsNotEmpty, IsOptional, IsString, ManualIngestDto, IsNotEmpty, IsObject (+11 more)

### Community 38 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+20 more)

### Community 39 - "DomainException"
Cohesion: 0.18
Nodes (4): AuthService, Injectable, DomainException, Get

### Community 40 - "persona-preview.tsx"
Cohesion: 0.12
Nodes (22): AgentPersonaTab(), ArchetypeOption, ARCHETYPES, TONE_PRESETS, PersonaPreview(), PersonaPreviewProps, TONE_PRESETS, VOICE_OPTIONS (+14 more)

### Community 41 - "ai-tools.executor.ts"
Cohesion: 0.15
Nodes (18): AgentConfigService, Injectable, InjectModel, AgentConfig, AgentConfigDocument, AgentConfigSchema, SalesPlaybook, SalesPlaybookDocument (+10 more)

### Community 42 - "LiveDeskService"
Cohesion: 0.12
Nodes (10): LiveDeskController, Controller, Get, HttpCode, Param, Post, Query, UseGuards (+2 more)

### Community 43 - "billing-client.tsx"
Cohesion: 0.14
Nodes (17): metadata, metadata, BillingClient(), BillingClientContent(), InvoiceHistory(), InvoiceHistoryProps, UsageClient(), UsageClientContent() (+9 more)

### Community 44 - "ProductDocument"
Cohesion: 0.11
Nodes (11): ShopifyConnectorService, Injectable, InjectModel, Optional, IsBoolean, IsOptional, UpdateProductDto, Inject (+3 more)

### Community 45 - "admin-sidebar.tsx"
Cohesion: 0.11
Nodes (15): metadata, AdminGuard(), checkAdminAccess(), AdminGuardProps, AdminLayoutShell(), AdminLayoutShellProps, adminNavItems, AdminSidebar() (+7 more)

### Community 46 - "customers-client.tsx"
Cohesion: 0.16
Nodes (15): metadata, CustomerDetailPanel(), CustomerDetailPanelProps, CustomersClient(), CustomersHeader(), CustomersTable(), CustomersTableProps, demoCustomers (+7 more)

### Community 47 - "(marketing)/page.tsx"
Cohesion: 0.12
Nodes (13): CtaSection(), docs, DocsSection(), FeaturesSection(), HeroSection(), HeroVoiceCta(), platforms, SolutionsSection() (+5 more)

### Community 48 - "OrdersService"
Cohesion: 0.11
Nodes (17): InjectModel, SubscriptionDocument, InjectModel, IsEnum, IsObject, IsOptional, UpdateOrderDto, OrdersService (+9 more)

### Community 49 - "domain.exception.ts"
Cohesion: 0.12
Nodes (14): BootstrapVoiceSessionDto, IsNotEmpty, IsOptional, IsString, BootstrapRateLimitGuard, Injectable, InjectModel, Body (+6 more)

### Community 50 - "CustomersController"
Cohesion: 0.11
Nodes (16): CustomersController, Body, Controller, Get, Param, Patch, Post, Query (+8 more)

### Community 52 - "UsersService"
Cohesion: 0.10
Nodes (11): Get, Query, Optional, JwtStrategy, Injectable, Inject, Optional, AdminUserDocument (+3 more)

### Community 53 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 54 - "3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases"
Cohesion: 0.09
Nodes (21): 1. Executive Summary & Problem Statement, 1. Mandatory Store & Platform Disclosure at Onboarding, 2. Analysis of the Three Tooling Strategies, 2. Sitemap & Routing Information Architecture (Navigation Unlocking), 3. API Documentation & OpenAPI Schema Ingestion (Custom Tool Unlocking), 3. Deep-Dive: The 6 Critical DOM & Voice Agent Corner Cases, 4. Granular Tool Permission Toggles (Agent Control Center), 4. Handling Non-E-Commerce & Zero-API Businesses (+13 more)

### Community 55 - "AuthController"
Cohesion: 0.29
Nodes (8): Res, AuthController, Body, Controller, HttpCode, Post, Req, UseGuards

### Community 56 - "BillingService"
Cohesion: 0.12
Nodes (7): BillingService, Inject, Injectable, InjectModel, PlanDocument, BillingSchedulerService, Injectable

### Community 57 - "StripeProvider"
Cohesion: 0.16
Nodes (6): ChargeResult, CustomerBillingDetails, PaymentProvider, ProviderSubscriptionRef, StripeProvider, Injectable

### Community 58 - "ingestion.module.ts"
Cohesion: 0.30
Nodes (10): HTML_CRAWL_QUEUE, FAQ_PATTERNS, POLICY_PATTERNS, PRODUCT_PATTERNS, CrawlJobData, CrawlUrlJobData, ExtractedKnowledgeDoc, PlatformType (+2 more)

### Community 59 - "VectorStoreService"
Cohesion: 0.14
Nodes (8): InjectModel, Optional, EmbeddingService, Injectable, Optional, Injectable, InjectModel, VectorStoreService

### Community 60 - "dependencies"
Cohesion: 0.10
Nodes (21): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, lucide-react, next-themes, react (+13 more)

### Community 61 - "overview-client.tsx"
Cohesion: 0.14
Nodes (13): metadata, TopHeader(), TopHeaderProps, EMPTY_STATS, getGreeting(), OverviewClient(), QuickAction, QuickActionsBar() (+5 more)

### Community 62 - "session-detail-panel.tsx"
Cohesion: 0.18
Nodes (14): ActivityFeed(), ActivityFeedProps, DetailDrawer(), DetailDrawerProps, SessionDetailPanel(), SessionDetailPanelProps, formatTime(), getConversationTranscriptApi() (+6 more)

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
Cohesion: 0.19
Nodes (7): InjectModel, KnowledgeService, Inject, Injectable, InjectModel, Optional, KnowledgeBaseDocument

### Community 67 - "OrdersController"
Cohesion: 0.13
Nodes (13): IsEnum, IsNotEmpty, UpdateOrderStatusDto, OrdersController, Body, Controller, Get, HttpCode (+5 more)

### Community 68 - "UpdateAgentConfigDto"
Cohesion: 0.11
Nodes (15): AgentConfigController, Body, Controller, Get, Patch, UseGuards, IsArray, IsBoolean (+7 more)

### Community 69 - "🚫 Non-Negotiable Directives"
Cohesion: 0.11
Nodes (18): 1. Next.js 16+ Architecture Basis (`proxy.ts` mandatory), 2. Server Components First (No `"use client"` in `page.tsx`), 3. Component-Based Architecture & File Separation, 4. Service & Action Organization, 5. API Response Handling & Envelope Unwrapping, 6. Client State vs Server State, 7. Widget Embed & Delivery Architecture (v5 Section 11), 8. Marketing / Landing Page Conventions (+10 more)

### Community 70 - "billing-service.ts"
Cohesion: 0.20
Nodes (13): BkashCallbackContent(), PlanComparisonGrid(), PlanComparisonGridProps, demoPlans, executeBkashAgreementApi(), getBillingPlansApi(), subscribePlanApi(), Plan (+5 more)

### Community 71 - "🟡 Significant Improvements"
Cohesion: 0.11
Nodes (18): 10. RAG Result Cache Doesn't Invalidate on Product Changes, 11. Knowledge Chunking Is Character-Based, Not Semantic, 12. No `isEmbedded` Flag for Knowledge Chunks, 13. Feed Parser Uses Regex for XML, 14. No Product Image Extraction in DOM Strategy D, 1. Tier 1 Webhooks Never Trigger Vector Embedding, 2. Product Deletion Doesn't Clean Up Vector Index, 3. Brute-Force Vector Search Won't Scale (+10 more)

### Community 72 - "BillingController"
Cohesion: 0.19
Nodes (9): BillingController, Body, Controller, Get, Headers, HttpCode, Post, Req (+1 more)

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

### Community 78 - "DomTelemetryDto"
Cohesion: 0.18
Nodes (15): CardItemDto, ContactChannelsDto, DomTelemetryDto, HeadingItemDto, ProductTelemetryDto, IsArray, IsNotEmpty, IsNumber (+7 more)

### Community 79 - "ProductsController"
Cohesion: 0.20
Nodes (11): ProductsController, Body, Controller, Delete, Get, HttpCode, Param, Patch (+3 more)

### Community 80 - "ReadabilityExtractor"
Cohesion: 0.20
Nodes (5): Processor, ReadabilityExtractor, Injectable, SitemapCrawlerProcessor, DiscoveredUrlKind

### Community 81 - "main.ts"
Cohesion: 0.16
Nodes (9): Catch, AppModule, Module, AllExceptionsFilter, ErrorEnvelope, SuccessEnvelope, TransformInterceptor, Injectable (+1 more)

### Community 82 - "merchant-credentials-card.tsx"
Cohesion: 0.23
Nodes (13): MerchantCredentialsCard(), MerchantCredentialsCardProps, PLATFORMS, PlatformTab, BusinessDetailsCard(), BusinessDetailsCardProps, resendOnboardingApi(), deletePublishableKeyApi() (+5 more)

### Community 83 - "AdminController"
Cohesion: 0.17
Nodes (5): AdminController, Controller, Get, Query, UseGuards

### Community 84 - "CreateProductDto"
Cohesion: 0.12
Nodes (16): BatchSyncProductsDto, IsArray, IsEnum, IsNotEmpty, Type, ValidateNested, CreateProductDto, IsArray (+8 more)

### Community 85 - "demo-data.ts"
Cohesion: 0.16
Nodes (12): demoConversationItems, demoConversations, demoDashboardStats, demoKnowledgeDocs, demoOrders, DashboardStatsResponse, FunnelStep, getFunnelAnalyticsApi() (+4 more)

### Community 86 - "jest"
Cohesion: 0.13
Nodes (15): js, json, /node_modules/(?!(@exodus|html-encoding-sniffer)/), **/*.(t|j)s, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions (+7 more)

### Community 87 - "seed-admin.ts"
Cohesion: 0.13
Nodes (13): adminEmail, adminName, adminPassword, AdminRole, ADMIN, OWNER, STAFF, SUPER_ADMIN (+5 more)

### Community 88 - ".deletePublishableKey"
Cohesion: 0.19
Nodes (8): Body, Delete, Get, HttpCode, Patch, Post, Req, UseGuards

### Community 91 - "app/layout.tsx"
Cohesion: 0.18
Nodes (10): inter, jetbrainsMono, newsreader, RootLayout(), spaceGrotesk, FloatingOrbWidget(), getApiBase(), OrbFluidWaveProps (+2 more)

### Community 92 - "rag-service.ts"
Cohesion: 0.20
Nodes (12): reindexTenantApi(), searchRagKnowledgeApi(), searchRagProductsApi(), RagCombinedResponse, RagSearchKnowledgeResponse, RagSearchProductsResponse, ReindexTenantResponse, SearchRagDto (+4 more)

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

### Community 101 - "VoiceGateway"
Cohesion: 0.26
Nodes (6): ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, VoiceGateway

### Community 102 - ".batchSync"
Cohesion: 0.35
Nodes (3): SitemapCrawlerService, Injectable, DiscoveredUrl

### Community 103 - ".executeUserAction"
Cohesion: 0.20
Nodes (4): Delete, Param, Post, Req

### Community 104 - "AdminUserQueryDto"
Cohesion: 0.20
Nodes (8): AdminUserQueryDto, IsIn, IsNumber, IsOptional, IsString, Max, Min, Type

### Community 105 - "JsonLdExtractor"
Cohesion: 0.42
Nodes (3): JsonLdExtractor, Injectable, ExtractedProduct

### Community 106 - "CreateOrderDto"
Cohesion: 0.22
Nodes (11): CreateOrderDto, OrderItemDto, IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional (+3 more)

### Community 107 - "2. Architectural Mismatches & Technical Fixes"
Cohesion: 0.20
Nodes (9): 1. Core Architectural Mental Model, 2. Architectural Mismatches & Technical Fixes, 3. Summary of Refactored API Surface, Mismatch 1: Product Management (Form-Based CRUD vs. Bulk Ingestion Mirror), Mismatch 2: Order Management (Fulfillment Engine vs. AI Sales Attribution), Mismatch 3: RAG Channel Drift & Ingestion Lag (Gap A / Gap B / Channel Disparity), Mismatch 4: Webhook Security & Tenant Isolation Vulnerabilities, Mismatch 5: Knowledge Context Isolation & Dead Data (+1 more)

### Community 108 - "SitemapDiscoveryService"
Cohesion: 0.31
Nodes (3): InjectQueue, SitemapDiscoveryService, Injectable

### Community 109 - "server/README.md"
Cohesion: 0.20
Nodes (9): Compile and run the project, Deployment, Description, License, Project setup, Resources, Run tests, Stay in touch (+1 more)

### Community 110 - "ConversationGateway"
Cohesion: 0.27
Nodes (6): ConversationGateway, ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer

### Community 111 - "ORA — Final Architecture (v6)"
Cohesion: 0.22
Nodes (8): 12. Decisions, 13. Changelog, 1. Overview, 3. Query-Time Product Resolution Flow, 5. Context Feeding (The "Knows the Store" Layer), 6. Data Shapes, 7. APIs → Owning Service, ORA — Final Architecture (v6)

### Community 112 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, ts-loader, tsconfig-paths, @types/ejs, eslint, ts-loader, tsconfig-paths (+1 more)

### Community 113 - "CreatePlatformUserDto"
Cohesion: 0.25
Nodes (7): CreatePlatformUserDto, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength

### Community 114 - "UpdateAdminUserDto"
Cohesion: 0.25
Nodes (7): IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, UpdateAdminUserDto

### Community 115 - "11. Widget Delivery & Injection Architecture"
Cohesion: 0.25
Nodes (8): 11.1 Why this needs its own section, 11.2 Two-Stage Loader Pattern, 11.3 CDN Structure & Versioning, 11.4 Isolation — Shadow DOM Mounting, 11.5 Authentication Model — Publishable Key, 11.6 Capability Gating (Tier-Aware Rendering), 11.7 Passive Page Context Capture, 11. Widget Delivery & Injection Architecture

### Community 116 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, entryFile, $schema, sourceRoot

### Community 117 - "plan-limit.guard.ts"
Cohesion: 0.29
Nodes (3): METERED_METRIC_KEY, PlanLimitGuard, Injectable

### Community 118 - "PlatformSnifferService"
Cohesion: 0.46
Nodes (3): PlatformSnifferService, Injectable, PlatformDetectionResult

### Community 119 - "🎨 Design System — ORA Violet / Cyan Palette"
Cohesion: 0.29
Nodes (6): Color Tokens, 🎨 Design System — ORA Violet / Cyan Palette, 🚫 Non-Negotiable Directives, Palette Usage Rules, Project Architecture & Always-On Coding Rules, Surface Elevation Scale (Dark Mode)

### Community 120 - "agent-header.tsx"
Cohesion: 0.43
Nodes (5): AgentHeader(), AgentHeaderProps, SECTION_HEADERS, Button(), buttonVariants

### Community 121 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, format, lint, start, typecheck

### Community 122 - "UpdatePlatformAgentDto"
Cohesion: 0.29
Nodes (6): MaxLength, IsBoolean, IsIn, IsOptional, IsString, UpdatePlatformAgentDto

### Community 125 - "PassiveIngestDto"
Cohesion: 0.29
Nodes (6): PassiveIngestDto, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString

### Community 126 - "QueryProductsDto"
Cohesion: 0.29
Nodes (7): QueryProductsDto, IsEnum, IsNumber, IsOptional, IsString, Min, Type

### Community 127 - "UpdateProductOverrideDto"
Cohesion: 0.29
Nodes (7): IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, UpdateProductOverrideDto

### Community 128 - "onlyBuiltDependencies"
Cohesion: 0.33
Nodes (6): esbuild, @swc/core, unrs-resolver, pnpm, onlyBuiltDependencies, sharp

### Community 129 - "2. System Layers"
Cohesion: 0.33
Nodes (6): 2.1 Widget (Browser, on Merchant's Site), 2.2 Gateway Layer, 2.3 Core Services (NestJS), 2.4 Data Layer, 2.5 Merchant Data Sources (Tiered), 2. System Layers

### Community 130 - "SubscriptionStatus"
Cohesion: 0.33
Nodes (6): SubscriptionStatus, ACTIVE, CANCELED, PAST_DUE, SUSPENDED, TRIALING

### Community 132 - "client/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 134 - "4. Ingestion Architecture"
Cohesion: 0.40
Nodes (5): 4.1 Requirements, 4.2 Confidence Score Ladder, 4.3 Webhook Ingestion Service (Tier 1), 4.4 Background Re-sync, 4. Ingestion Architecture

### Community 135 - "8. Cross-Cutting Concerns"
Cohesion: 0.40
Nodes (5): 8.1 State Management, 8.2 Security, 8.3 Scaling, 8.4 Tech Stack, 8. Cross-Cutting Concerns

### Community 136 - "ApiKeyGuard"
Cohesion: 0.40
Nodes (3): ApiKeyGuard, Injectable, InjectModel

### Community 138 - "VerifyLiveDto"
Cohesion: 0.40
Nodes (5): IsEnum, IsNumber, IsOptional, Min, VerifyLiveDto

### Community 139 - "Next.js template"
Cohesion: 0.50
Nodes (3): Adding components, Next.js template, Using components

### Community 140 - "9. Platform-Specific Notes"
Cohesion: 0.50
Nodes (4): 9. Platform-Specific Notes, BigCommerce / Magento, Shopify, WooCommerce

### Community 141 - "AdminUserActionDto"
Cohesion: 0.50
Nodes (3): AdminUserActionDto, IsIn, IsNotEmpty

### Community 142 - "CrawlStoreDto"
Cohesion: 0.50
Nodes (3): CrawlStoreDto, IsNotEmpty, IsString

### Community 143 - "FileUploadDto"
Cohesion: 0.50
Nodes (3): FileUploadDto, IsOptional, IsString

### Community 148 - "MailModule"
Cohesion: 0.67
Nodes (3): MailModule, Global, Module

## Knowledge Gaps
- **783 isolated node(s):** `metadata`, `metadata`, `metadata`, `metadata`, `metadata` (+778 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bcrypt` connect `server/package.json` to `users.service.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `metadata` to the rest of the system?**
  _783 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05997778600518327 - nodes in this community are weakly interconnected._
- **Should `product-catalog-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06284153005464481 - nodes in this community are weakly interconnected._
- **Should `RedisService` be split into smaller, more focused modules?**
  _Cohesion score 0.07767722473604827 - nodes in this community are weakly interconnected._
- **Should `ProductsService` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `auth-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10904255319148937 - nodes in this community are weakly interconnected._