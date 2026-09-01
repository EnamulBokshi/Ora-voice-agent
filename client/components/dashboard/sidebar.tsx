'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  MessageSquareText,
  Receipt,
  BarChart2,
  Bell,
  Settings,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  Mic,
  FileText,
  Package,
  Database,
  UserCheck,
  Code,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  LayoutGrid,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '../auth/LogoutButton';
import { ThemeToggle } from '../marketing/theme-toggle';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';
import { useSetupProgress, type SetupStepId } from '@/hooks/use-setup-progress';
import { ARCHETYPES, type SetupArchetype } from '@/components/setup/setup-section-nav';
import { ROLES, TRAIN_ITEMS, type AgentRole, type AgentView } from '@/components/agent/agent-section-nav';

const CONFIG_STEPS: { step: SetupStepId; label: string }[] = [
  { step: 'persona',     label: 'Persona & voice' },
  { step: 'integration', label: 'Widget embed'     },
  { step: 'knowledge',   label: 'Store knowledge'  },
  { step: 'voice_test',  label: 'Test ORA live'    },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Progress state
  const { progress, completedCount, totalSteps } = useSetupProgress();

  // URL state resolution
  const isAgentPage = pathname.startsWith('/agent');
  const isSetupPage = pathname.startsWith('/setup');

  const rawRole = searchParams.get('role');
  const activeRole: AgentRole | null =
    rawRole && ['voice', 'documents', 'products'].includes(rawRole)
      ? (rawRole as AgentRole)
      : null;

  const rawView = searchParams.get('view');
  const activeAgentView: AgentView =
    rawView && ['get-started', 'feed', 'knowledge', 'catalog'].includes(rawView)
      ? (rawView as AgentView)
      : 'get-started';

  const rawArch = searchParams.get('archetype');
  const activeArchetype: SetupArchetype | null =
    rawArch && ['ecommerce', 'saas', 'agency', 'portfolio', 'general'].includes(rawArch)
      ? (rawArch as SetupArchetype)
      : null;

  const rawStep = searchParams.get('step');
  const activeStep: SetupStepId | null =
    rawStep && ['persona', 'integration', 'knowledge', 'voice_test'].includes(rawStep)
      ? (rawStep as SetupStepId)
      : null;

  // Dropdown menus
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [archDropdownOpen, setArchDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const archDropdownRef = useRef<HTMLDivElement>(null);

  // Accordion state
  const [agentExpanded, setAgentExpanded] = useState(true);
  const [setupExpanded, setSetupExpanded] = useState(true);
  const [agentTrainExpanded, setAgentTrainExpanded] = useState(true);
  const [setupConfigExpanded, setSetupConfigExpanded] = useState(true);

  // User Profile
  const [userName, setUserName] = useState<string>('Profile');
  const [userRole, setUserRole] = useState<string>('Owner');

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (archDropdownRef.current && !archDropdownRef.current.contains(e.target as Node)) {
        setArchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let active = true;
    getMeApi()
      .then((data) => {
        if (active) {
          setUserName(data?.user?.name ?? demoProfile.user.name);
          const raw = (data?.user as { role?: string })?.role ?? 'owner';
          setUserRole(raw === 'super_admin' ? 'SuperAdmin' : raw[0].toUpperCase() + raw.slice(1));
        }
      })
      .catch(() => {
        if (active) {
          setUserName(demoProfile.user.name);
          setUserRole('Owner');
        }
      });
    return () => { active = false; };
  }, []);

  const currentRole = ROLES.find((r) => r.id === activeRole) ?? null;
  const currentArch = ARCHETYPES.find((a) => a.id === activeArchetype) ?? null;

  const handleRoleSelect = (role: AgentRole | null) => {
    setRoleDropdownOpen(false);
    if (role === null) router.push('/agent');
    else router.push(`/agent?role=${role}&view=get-started`);
  };

  const handleArchetypeSelect = (arch: SetupArchetype | null) => {
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
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col z-50 border-r border-border bg-surface-lowest transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-[240px]',
      )}
    >
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

            <Link
              href="/agent"
              title="ORA Agent"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                isAgentPage ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Bot size={16} />
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
              href="/billing"
              title="Invoices"
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

            <div className="h-px bg-border/40 w-6 my-1.5" />

            <Link
              href="/notifications"
              title="Notifications"
              className={cn(
                'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                pathname.startsWith('/notifications') ? 'bg-surface-high text-foreground dark:text-[#C8F031]' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
              )}
            >
              <Bell size={16} />
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
                  <Bot size={15} className={isAgentPage ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
                  <span className="truncate flex-1">ORA Agent</span>
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
                  {/* Role Selector Dropdown */}
                  <div className="relative mb-1" ref={roleDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen((o) => !o)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-surface-high/40 hover:bg-surface-high border border-border/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {currentRole ? <currentRole.Icon size={12} className="text-foreground" /> : <LayoutGrid size={12} className="text-foreground" />}
                        <span className="text-[11.5px] font-medium text-foreground truncate">
                          {currentRole ? currentRole.label : 'All roles'}
                        </span>
                      </div>
                      <ChevronDown size={11} className={cn('text-muted-foreground transition-transform', roleDropdownOpen && 'rotate-180')} />
                    </button>

                    {roleDropdownOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 bg-surface-container rounded-md border border-border shadow-xl p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleRoleSelect(null)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11.5px] font-medium transition-colors cursor-pointer',
                            activeRole === null ? 'text-foreground font-semibold bg-surface-high' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                          )}
                        >
                          <LayoutGrid size={12} />
                          <span className="flex-1 truncate">All roles</span>
                          {activeRole === null && <Check size={11} />}
                        </button>
                        {ROLES.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleRoleSelect(role.id)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11.5px] font-medium transition-colors cursor-pointer',
                              activeRole === role.id ? 'text-foreground font-semibold bg-surface-high' : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                            )}
                          >
                            <role.Icon size={12} />
                            <span className="flex-1 truncate">{role.label}</span>
                            {activeRole === role.id && <Check size={11} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* When role is active: Train items */}
                  {activeRole !== null ? (
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setAgentTrainExpanded((e) => !e)}
                        className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <span>Train</span>
                        <ChevronDown size={11} className={cn('transition-transform', agentTrainExpanded && 'rotate-180')} />
                      </button>

                      {agentTrainExpanded && (
                        <div className="space-y-0.5 ml-1 pl-1.5 border-l border-border/40">
                          {TRAIN_ITEMS[activeRole].map((item) => {
                            const isActive = isAgentPage && activeRole === activeRole && activeAgentView === item.view;
                            return (
                              <Link
                                key={item.view}
                                href={`/agent?role=${activeRole}&view=${item.view}`}
                                className={cn(
                                  'flex items-center px-2 py-1 rounded-md text-[12px] transition-colors',
                                  isActive
                                    ? 'text-foreground font-semibold bg-surface-high'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                                )}
                              >
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* When All Roles: quick links */
                    <div className="space-y-0.5">
                      <Link
                        href="/agent?role=voice&view=feed"
                        className="flex items-center justify-between px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-high/50 transition-colors"
                      >
                        <span>Voice Feed</span>
                        <ChevronRight size={11} className="opacity-40" />
                      </Link>
                      <Link
                        href="/agent?role=documents&view=feed"
                        className="flex items-center justify-between px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-high/50 transition-colors"
                      >
                        <span>Upload Files</span>
                        <ChevronRight size={11} className="opacity-40" />
                      </Link>
                      <Link
                        href="/agent?role=products&view=catalog"
                        className="flex items-center justify-between px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-high/50 transition-colors"
                      >
                        <span>Product Catalog</span>
                        <ChevronRight size={11} className="opacity-40" />
                      </Link>
                    </div>
                  )}
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

            {/* ── Section Divider ── */}
            <div className="h-px bg-border/40 my-2" />

            {/* 6. Invoices */}
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
              <span className="truncate flex-1">Invoices</span>
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

            {/* 8. Notifications */}
            <Link
              href="/notifications"
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-2 pl-[calc(0.75rem-2px)]',
                pathname.startsWith('/notifications')
                  ? 'bg-surface-high text-foreground border-foreground dark:border-[#C8F031] font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/50 border-transparent',
              )}
            >
              <Bell size={15} className={pathname.startsWith('/notifications') ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground group-hover:text-foreground'} />
              <span className="truncate flex-1">Notifications</span>
            </Link>

            {/* 9. Settings */}
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

      {/* ── Footer: Profile + Theme ──────────────────────────────────────── */}
      <div className="p-3 border-t border-border flex-shrink-0 flex items-center justify-between gap-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <ThemeToggle />
            <LogoutButton variant="icon" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-surface-high border border-border/60 flex items-center justify-center font-bold text-[11px] text-foreground flex-shrink-0 select-none">
                {userName[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-foreground truncate leading-none mb-1">
                  {userName}
                </p>
                <p className="text-[10.5px] font-mono text-muted-foreground truncate leading-none">
                  {userRole}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ThemeToggle />
              <LogoutButton variant="icon" />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
