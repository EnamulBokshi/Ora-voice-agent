'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  MessageSquareText,
  Receipt,
  CreditCard,
  BarChart2,
  Settings,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  Mic,
  FileText,
  Package,
  Database,
  ShoppingBag,
  Users,
  Code,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  LayoutGrid,
  GitBranch,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';
import { useSetupProgress, type SetupStepId } from '@/hooks/use-setup-progress';
import { SETUP_GUIDE_ENABLED } from '@/lib/disabled-features';
import {
  ARCHETYPES,
  ARCHETYPE_CHANGED_EVENT,
  normalizeArchetype,
  type BusinessArchetype,
} from '@/lib/archetypes';
import {
  AGENT_VIEWS,
  DEFAULT_AGENT_ROLE,
  ROLE_LANDING_VIEW,
  TRAIN_ITEMS,
  getVisibleRoles,
  type AgentRole,
  type AgentView,
} from '@/lib/agent-roles';

const CONFIG_STEPS: { step: SetupStepId; label: string }[] = [
  { step: 'persona',     label: 'Persona & prompt' },
  { step: 'integration', label: 'Widget embed'     },
  { step: 'knowledge',   label: 'Store knowledge'  },
  { step: 'voice_test',  label: 'Test ORA live'    },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Whether the mobile drawer is open. Ignored from `md` up, where the rail is docked. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Progress state
  const { progress, completedCount, totalSteps } = useSetupProgress();

  // URL state resolution
  const isAgentPage = pathname.startsWith('/agent');
  const isSetupPage = pathname.startsWith('/setup');

  const rawRole = searchParams.get('role');
  // `/agent` with no role opens the default role, so the sidebar highlights it
  // as active rather than showing nothing selected.
  const activeRole: AgentRole =
    rawRole === 'persona'
      ? 'prompt'
      : rawRole === 'embed' || rawRole === 'widget'
      ? 'script'
      : rawRole && ['prompt', 'voice', 'documents', 'products', 'script'].includes(rawRole)
      ? (rawRole as AgentRole)
      : DEFAULT_AGENT_ROLE;

  const rawView = searchParams.get('view');
  const activeAgentView: AgentView =
    rawView &&
    AGENT_VIEWS.includes(rawView as AgentView) &&
    rawView !== 'get-started'
      ? (rawView as AgentView)
      : ROLE_LANDING_VIEW[activeRole];

  const rawArch = searchParams.get('archetype');
  const activeArchetype: BusinessArchetype | null = normalizeArchetype(rawArch);

  const rawStep = searchParams.get('step');
  const activeStep: SetupStepId | null =
    rawStep && ['persona', 'integration', 'knowledge', 'voice_test'].includes(rawStep)
      ? (rawStep as SetupStepId)
      : null;

  // Dropdown menus
  const [archDropdownOpen, setArchDropdownOpen] = useState(false);
  const archDropdownRef = useRef<HTMLDivElement>(null);

  // Accordion state
  const [agentExpanded, setAgentExpanded] = useState(true);
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [setupConfigExpanded, setSetupConfigExpanded] = useState(true);

  // User Profile
  const [userName, setUserName] = useState<string>('Profile');
  const [userRole, setUserRole] = useState<string>('Owner');
  const [userEmail, setUserEmail] = useState<string>('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Which agent roles this business is offered. A business with no catalogue
  // is not shown catalogue navigation.
  const [businessContext, setBusinessContext] = useState<{
    archetype?: string;
    hasCatalog?: boolean;
  }>({});

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (archDropdownRef.current && !archDropdownRef.current.contains(e.target as Node)) {
        setArchDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setArchDropdownOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    getMeApi()
      .then((data) => {
        if (active) {
          setUserName(data?.user?.name ?? demoProfile.user.name);
          setUserEmail(data?.user?.email ?? demoProfile.user.email ?? '');
          const raw = (data?.user as { role?: string })?.role ?? 'owner';
          setUserRole(raw === 'super_admin' ? 'SuperAdmin' : raw[0].toUpperCase() + raw.slice(1));
          setBusinessContext({
            archetype: data?.business?.activeArchetype,
            hasCatalog: data?.business?.hasCatalog,
          });
        }
      })
      .catch(() => {
        if (active) {
          setUserName(demoProfile.user.name);
          setUserEmail(demoProfile.user.email ?? '');
          setUserRole('Owner');
        }
      });
    return () => { active = false; };
  }, []);

  // The fetch above runs once on mount. Switching the business type on the
  // persona page changes which roles are offered, so listen for the broadcast
  // and fold the new archetype in — otherwise Product Catalog only shows up
  // after a full page reload.
  useEffect(() => {
    const onArchetypeChange = (e: Event) => {
      const next = (e as CustomEvent<unknown>).detail;
      setBusinessContext((prev) => ({ ...prev, archetype: next as string | undefined }));
    };
    window.addEventListener(ARCHETYPE_CHANGED_EVENT, onArchetypeChange);
    return () => window.removeEventListener(ARCHETYPE_CHANGED_EVENT, onArchetypeChange);
  }, []);

  const currentArch = ARCHETYPES.find((a) => a.id === activeArchetype) ?? null;
  const visibleRoles = getVisibleRoles(businessContext);

  const handleArchetypeSelect = (arch: BusinessArchetype | null) => {
    setArchDropdownOpen(false);
    if (arch === null) router.push('/setup');
    else router.push(`/setup?archetype=${arch}`);
  };

  const handleStepClick = (step: SetupStepId) => {
    if (activeArchetype) router.push(`/setup?archetype=${activeArchetype}&step=${step}`);
    else router.push(`/setup?step=${step}`);
  };

  return (
    <aside
      // Off-canvas below `md` and slid in as a drawer; docked from `md` up.
      aria-label="Dashboard navigation"
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50 border-r border-border bg-surface-lowest',
        'transition-[width,transform] duration-200 ease-out',
        'w-[260px] max-w-[85vw] md:max-w-none',
        collapsed ? 'md:w-16' : 'md:w-[240px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
      )}
    >
      {/* Drawer dismiss — mobile only; the docked rail uses the collapse control. */}
      {onMobileClose && (
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation"
          className="md:hidden absolute top-3 right-3 w-8 h-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-surface-high/40 text-foreground hover:bg-surface-high transition-colors cursor-pointer z-10 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X size={15} />
        </button>
      )}
      {/* ── Header: Logo ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'h-14 flex items-center border-b border-border flex-shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
          >
            <PanelLeftOpen size={17} />
          </button>
        ) : (
          <>
            <Link
              href="/"
              title="ORA"
              aria-label="ORA Home"
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded bg-foreground text-background flex items-center justify-center">
                <span className="text-[11px] font-black tracking-tight select-none">O</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-none text-foreground tracking-tight">ORA</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide">
                  Command Center
                </p>
              </div>
            </Link>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors flex-shrink-0 cursor-pointer"
            >
              <PanelLeftClose size={15} />
            </button>
          </>
        )}
      </div>

      {/* ── Main Nav Body ─────────────────────────────────────────────────── */}
      <nav
        className={cn(
          'flex-1 py-3 overflow-y-auto no-scrollbar flex flex-col gap-1',
          collapsed ? 'px-2 items-center' : 'px-3',
        )}
        aria-label="Main navigation"
      >
        {collapsed ? (
          /* ── Collapsed Icon Only Mode ── */
          <div className="flex flex-col gap-1.5 w-full items-center">
            <Link
              href="/dashboard"
              title="Overview"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname === '/dashboard' || pathname === '/' ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <LayoutDashboard size={16} />
            </Link>

            <Link
              href="/live-desk"
              title="Live Desk"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/live-desk') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Radio size={16} />
            </Link>

            {/* DISABLED: Get Set Up rail icon — see lib/disabled-features.ts. */}
            {SETUP_GUIDE_ENABLED && (
              <Link
                href="/setup"
                title={`Get Set Up (${completedCount}/${totalSteps})`}
                className={cn(
                  'w-9 h-9 rounded-md flex items-center justify-center transition-colors relative',
                  isSetupPage ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                )}
              >
                <Compass size={16} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-surface-highest text-[9px] font-mono font-bold flex items-center justify-center border border-border">
                  {completedCount}
                </span>
              </Link>
            )}

            <Link
              href="/agent"
              title="ORA Agent"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                isAgentPage ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <SlidersHorizontal size={16} />
            </Link>

            <div className="h-px bg-border/40 w-6 my-1.5" />

            <Link
              href="/conversations"
              title="Conversations"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/conversations') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <MessageSquareText size={16} />
            </Link>

            <Link
              href="/orders"
              title="Orders"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/orders') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <ShoppingBag size={16} />
            </Link>

            <Link
              href="/customers"
              title="Customers"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/customers') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Users size={16} />
            </Link>

            <div className="h-px bg-border/40 w-6 my-1.5" />

            <Link
              href="/billing"
              title="Plans & Billing"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/billing') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Receipt size={16} />
            </Link>

            <Link
              href="/usage"
              title="Usage"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/usage') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <BarChart2 size={16} />
            </Link>

            <Link
              href="/profile"
              title="Settings"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/profile') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Settings size={16} />
            </Link>
          </div>
        ) : (
          /* ── Full Expanded Mode with Rich Sub-Sidebars ── */
          <>
            {/* 1. Overview */}
            <Link
              href="/dashboard"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname === '/dashboard' || pathname === '/'
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <LayoutDashboard size={15} className={pathname === '/dashboard' || pathname === '/' ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Overview</span>
            </Link>

            {/* 2. Live Desk */}
            <Link
              href="/live-desk"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/live-desk')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <Radio size={15} className={pathname.startsWith('/live-desk') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Live Desk</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] shadow-[0_0_6px_rgba(200,240,49,0.7)]" />
            </Link>

            {/* DISABLED: the Get Set Up guide is switched off — see
                lib/disabled-features.ts. The section is kept in place rather than
                deleted so a merge that touches it conflicts here instead of
                silently restoring the feature. */}
            {SETUP_GUIDE_ENABLED && (
              <>
              {/* ── 3. GET SET UP SECTION (WHOLE SUB-SIDEBAR INTEGRATED) ── */}
              <div className="flex flex-col mt-0.5">
                <div
                  className={cn(
                    'group flex items-center justify-between rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)] pr-1.5',
                    isSetupPage
                      ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
                  )}
                >
                  <Link href="/setup" className="flex items-center gap-3 py-2 flex-1 min-w-0">
                    <Compass size={15} className={isSetupPage ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
                    <span className="truncate flex-1">Get Set Up</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-[3px] bg-surface-high text-muted-foreground border border-border/60">
                      {completedCount}/{totalSteps}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSetupExpanded((e) => !e)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
                    >
                      {setupExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </div>
                </div>

                {/* Get Set Up Sub-Sidebar Content */}
                {setupExpanded && (
                  <div className="mt-1 ml-3 pl-2.5 border-l border-border/50 flex flex-col gap-1 py-1">
                    {/* Archetype Selector Dropdown */}
                    <div className="relative mb-1" ref={archDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setArchDropdownOpen((o) => !o)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-surface-high/40 hover:bg-surface-high border border-border/50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {currentArch ? <currentArch.Icon size={12} className="text-foreground" /> : <LayoutGrid size={12} className="text-foreground" />}
                          <span className="text-[11.5px] font-medium text-foreground truncate">
                            {currentArch ? currentArch.label : 'All store types'}
                          </span>
                        </div>
                        <ChevronDown size={11} className={cn('text-muted-foreground transition-transform', archDropdownOpen && 'rotate-180')} />
                      </button>

                      {archDropdownOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 bg-surface-container rounded-md border border-border shadow-xl p-1 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleArchetypeSelect(null)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11.5px] font-medium transition-colors cursor-pointer',
                              activeArchetype === null ? 'text-foreground font-semibold bg-surface-high' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                            )}
                          >
                            <LayoutGrid size={12} />
                            <span className="flex-1 truncate">All store types</span>
                            {activeArchetype === null && <Check size={11} />}
                          </button>
                          {ARCHETYPES.map((arch) => (
                            <button
                              key={arch.id}
                              type="button"
                              onClick={() => handleArchetypeSelect(arch.id)}
                              className={cn(
                                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11.5px] font-medium transition-colors cursor-pointer',
                                activeArchetype === arch.id ? 'text-foreground font-semibold bg-surface-high' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                              )}
                            >
                              <arch.Icon size={12} />
                              <span className="flex-1 truncate">{arch.label}</span>
                              {activeArchetype === arch.id && <Check size={11} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Intro Overview link */}
                    {activeArchetype && (
                      <Link
                        href={`/setup?archetype=${activeArchetype}`}
                        className={cn(
                          'flex items-center px-2 py-1 rounded-md text-[12px] font-medium transition-colors',
                          isSetupPage && activeStep === null
                            ? 'text-foreground bg-surface-high font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                        )}
                      >
                        <span>Overview</span>
                      </Link>
                    )}

                    {/* Configure Steps Tree */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setSetupConfigExpanded((e) => !e)}
                        className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <span>Configure Steps</span>
                        <ChevronDown size={11} className={cn('transition-transform', setupConfigExpanded && 'rotate-180')} />
                      </button>

                      {setupConfigExpanded && (
                        <div className="space-y-0.5 ml-1 pl-1.5 border-l border-border/40">
                          {CONFIG_STEPS.map(({ step, label }) => {
                            const isActive = isSetupPage && activeStep === step;
                            const isDone = progress[step];
                            return (
                              <button
                                key={step}
                                type="button"
                                onClick={() => handleStepClick(step)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] text-left transition-colors cursor-pointer',
                                  isActive
                                    ? 'text-foreground font-semibold bg-surface-high'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle2 size={12} className="text-foreground dark:text-[#C8F031] flex-shrink-0" />
                                ) : (
                                  <Circle size={11} className={cn('flex-shrink-0', isActive ? 'text-foreground' : 'text-muted-foreground/30')} />
                                )}
                                <span className="truncate">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </>
            )}

            {/* ── 4. ORA AGENT SECTION (WHOLE SUB-SIDEBAR INTEGRATED) ── */}
            <div className="flex flex-col mt-0.5">
              <div
                className={cn(
                  'group flex items-center justify-between rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)] pr-1.5',
                  isAgentPage
                    ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
                )}
              >
                <Link href="/agent" className="flex items-center gap-3 py-2 flex-1 min-w-0">
                  <SlidersHorizontal size={15} className={isAgentPage ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
                  <span className="truncate flex-1">Agent Configuration</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setAgentExpanded((e) => !e)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
                >
                  {agentExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {/* ORA Agent Sub-Sidebar Content */}
              {agentExpanded && (
                <div className="mt-1 ml-3 pl-2.5 border-l border-border/50 flex flex-col gap-1 py-1">
                  {/* Roles — listed flat. These used to hide behind a
                      dropdown that duplicated the agent workspace's own
                      sub-sidebar; both the dropdown and that sub-sidebar are
                      gone, so the roles are the navigation. */}
                  {visibleRoles.map((role) => {
                    const isRoleActive = isAgentPage && activeRole === role.id;
                    // Roles open on their main feature page; the editorial
                    // "Get started" pages are disabled — see
                    // lib/disabled-features.ts.
                    const roleHref = `/agent?role=${role.id}&view=${ROLE_LANDING_VIEW[role.id]}`;

                    return (
                      <div key={role.id} className="space-y-0.5">
                        <Link
                          href={roleHref}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                            isRoleActive
                              ? 'text-foreground font-semibold bg-surface-high'
                              : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                          )}
                        >
                          <role.Icon size={12} className="flex-shrink-0" />
                          <span className="truncate flex-1">{role.label}</span>
                        </Link>

                        {/* Train items for the role currently open */}
                        {isRoleActive && TRAIN_ITEMS[role.id].length > 1 && (
                          <div className="space-y-0.5 ml-1 pl-1.5 border-l border-border/40">
                            {TRAIN_ITEMS[role.id].map((item) => (
                              <Link
                                key={item.view}
                                href={`/agent?role=${role.id}&view=${item.view}`}
                                className={cn(
                                  'flex items-center px-2 py-1 rounded-md text-[12px] transition-colors',
                                  activeAgentView === item.view
                                    ? 'text-foreground font-semibold bg-surface-high'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                                )}
                              >
                                <span>{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Section Divider ── */}
            <div className="h-px bg-border/40 my-2" />

            {/* 5. All Conversations */}
            <Link
              href="/conversations"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/conversations')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <MessageSquareText size={15} className={pathname.startsWith('/conversations') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Conversations</span>
            </Link>

            <Link
              href="/orders"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/orders')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <ShoppingBag size={15} className={pathname.startsWith('/orders') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Orders</span>
            </Link>

            <Link
              href="/customers"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/customers')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <Users size={15} className={pathname.startsWith('/customers') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Customers</span>
            </Link>

            {/* ── Section Divider ── */}
            <div className="h-px bg-border/40 my-2" />

            {/* 6. Plans & Billing */}
            <Link
              href="/billing"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/billing')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <Receipt size={15} className={pathname.startsWith('/billing') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Plans & Billing</span>
            </Link>

            {/* 7. Usage */}
            <Link
              href="/usage"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/usage')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <BarChart2 size={15} className={pathname.startsWith('/usage') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Usage</span>
            </Link>

            {/* ── Section Divider ── */}
            <div className="h-px bg-border/40 my-2" />

            {/* Settings */}
            <Link
              href="/profile"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/profile')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <Settings size={15} className={pathname.startsWith('/profile') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Settings</span>
            </Link>
          </>
        )}
      </nav>

      {/* ── Footer: Profile Dropdown Menu + Quick Shortcuts ──────── */}
      <div className="p-2.5 border-t border-border flex-shrink-0 relative" ref={profileMenuRef}>
        {/* Dropdown Popover */}
        {profileMenuOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            className={cn(
              'absolute z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl p-1.5 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-150',
              collapsed
                ? 'bottom-2 left-[calc(100%+10px)] w-60'
                : 'bottom-[calc(100%+8px)] left-2 right-2 min-w-[210px]'
            )}
          >
            {/* User Details Header */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="font-semibold text-popover-foreground truncate text-[13px]">
                {userName}
              </p>
              <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                {userEmail || userRole}
              </p>
            </div>

            {/* Menu Links */}
            <div className="py-1 space-y-0.5">
              <Link
                href="/profile"
                onClick={() => setProfileMenuOpen(false)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors',
                  pathname.startsWith('/profile')
                    ? 'bg-surface-high dark:bg-white/[0.08] text-popover-foreground font-semibold'
                    : 'text-muted-foreground hover:text-popover-foreground hover:bg-surface-high dark:hover:bg-white/[0.06]'
                )}
              >
                <Settings size={15} className={pathname.startsWith('/profile') ? 'text-popover-foreground' : 'text-muted-foreground'} />
                <span>Settings</span>
              </Link>

              <Link
                href="/billing"
                onClick={() => setProfileMenuOpen(false)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors',
                  pathname.startsWith('/billing')
                    ? 'bg-surface-high dark:bg-white/[0.08] text-popover-foreground font-semibold'
                    : 'text-muted-foreground hover:text-popover-foreground hover:bg-surface-high dark:hover:bg-white/[0.06]'
                )}
              >
                <CreditCard size={15} className={pathname.startsWith('/billing') ? 'text-popover-foreground' : 'text-muted-foreground'} />
                <span>Billing & Subscription</span>
              </Link>

              <Link
                href="/usage"
                onClick={() => setProfileMenuOpen(false)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium transition-colors',
                  pathname.startsWith('/usage')
                    ? 'bg-surface-high dark:bg-white/[0.08] text-popover-foreground font-semibold'
                    : 'text-muted-foreground hover:text-popover-foreground hover:bg-surface-high dark:hover:bg-white/[0.06]'
                )}
              >
                <BarChart2 size={15} className={pathname.startsWith('/usage') ? 'text-popover-foreground' : 'text-muted-foreground'} />
                <span>Usage</span>
              </Link>
            </div>

            <div className="h-px bg-border my-1" />

            {/* Log Out option in dropdown */}
            <div className="pt-0.5">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        )}

        {/* Profile Strip: Avatar & Details + Quick Shortcuts */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              title={`${userName} (${userRole})`}
              aria-label="User profile menu"
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer select-none',
                profileMenuOpen
                  ? 'bg-surface-high text-foreground ring-2 ring-primary/40'
                  : 'bg-surface-high/70 hover:bg-surface-high text-foreground border border-border/60'
              )}
            >
              {userName[0]?.toUpperCase() || 'U'}
            </button>
            <ThemeToggle />
            <LogoutButton variant="icon" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-label="User profile menu"
              className={cn(
                'flex items-center gap-2 min-w-0 flex-1 p-1.5 rounded-lg text-left transition-colors cursor-pointer group',
                profileMenuOpen
                  ? 'bg-surface-high ring-1 ring-border/80'
                  : 'hover:bg-surface-high/60'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-surface-high border border-border/60 flex items-center justify-center font-bold text-xs text-foreground flex-shrink-0 select-none">
                {userName[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate leading-tight mt-0.5">
                  {userEmail || userRole}
                </p>
              </div>
              <ChevronsUpDown
                size={13}
                className="text-muted-foreground group-hover:text-foreground flex-shrink-0 transition-colors ml-0.5"
              />
            </button>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ThemeToggle />
              <LogoutButton variant="icon" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
