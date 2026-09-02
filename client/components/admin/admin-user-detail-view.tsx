'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Crown,
  User,
  Store,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Mail,
  LogOut,
  Ban,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  ShoppingBag,
  DollarSign,
  Copy,
  Check,
  Loader2,
  Calendar,
  Layers,
  ShieldAlert,
  Timer,
  RotateCcw,
  Sliders,
  CheckCheck,
  X,
} from 'lucide-react';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { MetricDisplay, NumberText } from '@/components/ui/metric-display';
import {
  fetchAdminUserById,
  updateAdminUser,
  executeAdminUserAction,
  updateMerchantBudgetCap,
  updateMerchantSessionLimit,
} from '@/services/admin-service';
import { AdminUserDetail, UpdateAdminUserPayload } from '@/types/admin';
import { cn } from '@/lib/utils';

interface AdminUserDetailViewProps {
  userId: string;
}

export function AdminUserDetailView({ userId }: AdminUserDetailViewProps) {
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline Profile Edit State
  const [profileForm, setProfileForm] = useState<UpdateAdminUserPayload>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Budget Cap Inline State
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Session Duration Limit Inline State
  const [sessionInput, setSessionInput] = useState<string>('');
  const [savingSession, setSavingSession] = useState(false);

  // Action feedback states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'activate' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadUser = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchAdminUserById(userId);
        if (!res?.user) {
          setError('User record could not be found.');
        } else {
          setUserDetail(res.user);
          setProfileForm({
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            emailVerified: res.user.emailVerified,
          });

          // Set budget and session inputs from telemetry
          const budget = res.user.usage?.budgetCapUsd ?? res.user.business?.monthlyAiBudgetUsd;
          setBudgetInput(budget !== null && budget !== undefined ? budget.toString() : '');

          const sessionSecs =
            res.user.usage?.maxSessionDurationSeconds ??
            res.user.business?.maxSessionDurationSeconds;
          setSessionInput(sessionSecs ? (sessionSecs / 60).toString() : '');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load user detail.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTriggerAction = (action: 'suspend' | 'activate') => {
    setConfirmAction(action);
  };

  const handleConfirmAction = async () => {
    if (!userDetail || !confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);

    setActionLoading(action);
    try {
      const res = await executeAdminUserAction(userDetail.id, action);
      showNotification(
        'success',
        res.message ||
          (action === 'suspend'
            ? 'Store suspended successfully.'
            : 'Store reactivated successfully.'),
      );
      loadUser(true);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to execute store action.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDetail) return;

    setSavingProfile(true);
    try {
      await updateAdminUser(userDetail.id, profileForm);
      showNotification('success', 'User profile and role updated successfully.');
      loadUser(true);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update user profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBudget = async (customValue?: number | null) => {
    if (!userDetail?.business?.id) return;
    setSavingBudget(true);
    try {
      let capValue: number | null = null;
      if (customValue !== undefined) {
        capValue = customValue;
        setBudgetInput(customValue !== null ? customValue.toString() : '');
      } else {
        capValue = budgetInput.trim() === '' ? null : parseFloat(budgetInput);
        if (isNaN(capValue as number)) capValue = null;
      }

      await updateMerchantBudgetCap(userDetail.business.id, capValue);
      showNotification(
        'success',
        capValue ? `Monthly budget cap updated to $${capValue}.` : 'Budget cap set to Unlimited.',
      );
      loadUser(true);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update budget limit.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleSaveSessionLimit = async (minutesVal?: number | null) => {
    if (!userDetail?.business?.id) return;
    setSavingSession(true);
    try {
      let durationSeconds: number | null = null;
      if (minutesVal !== undefined) {
        durationSeconds = minutesVal !== null ? Math.round(minutesVal * 60) : null;
        setSessionInput(minutesVal !== null ? minutesVal.toString() : '');
      } else if (sessionInput.trim() !== '') {
        const mins = parseFloat(sessionInput);
        if (!isNaN(mins) && mins >= 1 && mins <= 60) {
          durationSeconds = Math.round(mins * 60);
        }
      }

      await updateMerchantSessionLimit(userDetail.business.id, durationSeconds);
      showNotification(
        'success',
        durationSeconds
          ? `Max session duration set to ${Math.round(durationSeconds / 60)} minutes.`
          : 'Session duration reset to platform default (5 min).',
      );
      loadUser(true);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update session limit.');
    } finally {
      setSavingSession(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/40 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
            <Crown size={11} />
            SUPERADMIN
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-chart-2/15 border border-chart-2/40 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-chart-2">
            <Shield size={11} />
            STORE OWNER
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-info/15 border border-info/40 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-info">
            <Shield size={11} />
            ADMIN
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 border border-warning/40 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-warning">
            <User size={11} />
            STAFF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-high border border-border px-2.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
            <User size={11} />
            USER
          </span>
        );
    }
  };

  // Loading skeleton state
  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <AdminHeader
          title="User & Tenant Inspection"
          description="Loading user identity and telemetry..."
        />
        <div className="flex-1 p-6 space-y-6 animate-pulse max-w-[1400px] mx-auto w-full">
          <div className="h-28 w-full rounded-2xl bg-surface-container border border-border" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container border border-border" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-surface-container border border-border" />
            <div className="h-72 rounded-2xl bg-surface-container border border-border" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !userDetail) {
    return (
      <div className="flex flex-col min-h-full">
        <AdminHeader
          title="User & Tenant Inspection"
          description="User drilldown context and telemetry"
        />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-heading font-bold text-foreground">User Record Not Found</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {error || 'The requested user ID does not exist or has been removed.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-high border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-bright transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Users Directory
            </Link>
            <button
              onClick={() => loadUser()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const usage = userDetail.usage;

  return (
    <div className="flex flex-col min-h-full">
      {/* Interactive Confirmation Toast Modal */}
      {confirmAction && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 rounded-2xl border border-border bg-surface-container/95 p-4 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 max-w-sm">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                confirmAction === 'suspend'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-primary/15 text-primary',
              )}
            >
              {confirmAction === 'suspend' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="flex-1 pr-1">
              <h4 className="font-bold text-foreground text-sm">
                {confirmAction === 'suspend' ? 'Suspend Merchant Store?' : 'Reactivate Merchant Store?'}
              </h4>
              <p className="text-xs text-muted-foreground font-normal mt-0.5 leading-relaxed">
                {confirmAction === 'suspend'
                  ? `Are you sure you want to suspend ${userDetail.name}'s store and pause all active AI services?`
                  : `Are you sure you want to reactivate ${userDetail.name}'s store and resume all AI services?`}
              </p>
            </div>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground bg-surface-high hover:bg-surface-bright hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={handleConfirmAction}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-opacity shadow-xs',
                confirmAction === 'suspend'
                  ? 'bg-amber-500 text-black hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {actionLoading && <Loader2 size={12} className="animate-spin" />}
              <span>{confirmAction === 'suspend' ? 'Confirm Suspend' : 'Confirm Reactivate'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification Modal */}
      {feedback && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200',
            feedback.type === 'success'
              ? 'border-primary/40 bg-surface-container/95 text-foreground shadow-primary/10'
              : 'border-destructive/40 bg-surface-container/95 text-foreground shadow-destructive/10',
          )}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              feedback.type === 'success'
                ? 'bg-primary/15 text-primary'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-bold text-foreground">
              {feedback.type === 'success' ? 'Success' : 'Error'}
            </span>
            <span className="text-xs text-muted-foreground font-normal">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Global Admin Header */}
      <AdminHeader
        title="User & Tenant Inspection"
        description="User identity, token telemetry, and store settings."
        onRefresh={() => loadUser(true)}
        isRefreshing={refreshing}
      >
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-bright transition-colors shadow-xs"
        >
          <ArrowLeft size={13} />
          <span>Back to Users</span>
        </Link>
      </AdminHeader>

      {/* Main Content Body */}
      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1400px] w-full mx-auto">
        {/* ── User Master Identity Banner Card ── */}
        <div className="rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Avatar & Identity Details */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-high border border-border text-xl font-serif font-bold text-foreground">
                {userDetail.name ? userDetail.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-heading font-bold tracking-tight text-foreground">
                    {userDetail.name}
                  </h2>
                  {getRoleBadge(userDetail.role)}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground font-medium">{userDetail.email}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px]">ID: {userDetail.id}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                    <Calendar size={12} />
                    Joined {new Date(userDetail.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Operational Action Button */}
            {userDetail.business && (
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                <button
                  onClick={() =>
                    handleTriggerAction(
                      userDetail.business?.status === 'suspended' ? 'activate' : 'suspend',
                    )
                  }
                  disabled={actionLoading === 'suspend' || actionLoading === 'activate'}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shadow-xs',
                    userDetail.business.status === 'suspended'
                      ? 'text-primary hover:bg-surface-bright'
                      : 'text-amber-400 hover:bg-surface-bright',
                  )}
                >
                  {actionLoading === 'suspend' || actionLoading === 'activate' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Ban size={13} />
                  )}
                  <span>
                    {userDetail.business.status === 'suspended' ? 'Reactivate Store' : 'Suspend Store'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 5-KPI Telemetry Ribbon (Standard ORA Newsreader Serif + Tabular Numbers) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Tokens */}
          <PlatformStatCard
            title="Total Tokens"
            value={usage?.totalTokens ? usage.totalTokens.toLocaleString() : '0'}
            subtitle="In + Out token aggregate"
            icon={<Layers className="h-4 w-4" />}
          />

          {/* AI Compute Cost */}
          <PlatformStatCard
            title="AI Compute Cost"
            value={usage?.aiCostUsd ? usage.aiCostUsd.toFixed(3) : '0.000'}
            prefix="$"
            subtitle="Monthly LLM & Voice OpEx"
            icon={<DollarSign className="h-4 w-4" />}
            valueColor="text-primary"
            highlight={true}
          />

          {/* Voice Stream */}
          <PlatformStatCard
            title="Voice Stream"
            value={usage?.voiceMinutes || userDetail.metrics?.voiceMinutes || 0}
            suffix="mins"
            subtitle="Live Gemini audio stream"
            icon={<PhoneCall className="h-4 w-4" />}
          />

          {/* Conversations */}
          <PlatformStatCard
            title="Conversations"
            value={userDetail.metrics?.conversationsCount || 0}
            subtitle="Customer dialogue sessions"
            icon={<MessageSquare className="h-4 w-4" />}
          />

          {/* Converted GMV */}
          <PlatformStatCard
            title="Converted GMV"
            value={Number(userDetail.metrics?.totalGmv || 0).toFixed(2)}
            prefix="$"
            subtitle="Total store orders GMV"
            icon={<ShoppingBag className="h-4 w-4" />}
          />
        </div>

        {/* ── AI Token Spend & Voice Session Duration Controls (2-Column Grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Consumption & Monthly Budget Cap Guard */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                  <ShieldAlert size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-foreground">AI Token Usage & Spend Cap</h3>
                  <p className="text-[11px] text-muted-foreground">Monitor LLM telemetry and configure monthly budget limits</p>
                </div>
              </div>
              {usage?.budgetCapUsd ? (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border',
                    usage.budgetStatus === 'exceeded'
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : usage.budgetStatus === 'warning'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-primary/10 text-primary border-primary/20',
                  )}
                >
                  Cap: ${usage.budgetCapUsd}
                </span>
              ) : (
                <span className="rounded-full bg-surface-high px-2.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border">
                  Unlimited Spend
                </span>
              )}
            </div>

            {/* Token Breakdown Split */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface-lowest p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Input (Prompt)</span>
                <div>
                  <MetricDisplay
                    value={(usage?.promptTokens || 0).toLocaleString()}
                    size="sm"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-lowest p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output (Completion)</span>
                <div>
                  <MetricDisplay
                    value={(usage?.completionTokens || 0).toLocaleString()}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Inline Budget Cap Setter */}
            {userDetail.business && (
              <div className="rounded-xl border border-border bg-surface-lowest p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Monthly Budget Cap</span>
                  <span className="text-[11px] text-muted-foreground">Auto-throttles when exceeded</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSaveBudget(preset)}
                      disabled={savingBudget}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-mono font-semibold border transition-colors tabular-nums',
                        usage?.budgetCapUsd === preset
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-surface-high text-muted-foreground hover:text-foreground hover:bg-surface-bright',
                      )}
                    >
                      ${preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSaveBudget(null)}
                    disabled={savingBudget}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-mono font-semibold border transition-colors',
                      !usage?.budgetCapUsd
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-surface-high text-muted-foreground hover:text-foreground hover:bg-surface-bright',
                    )}
                  >
                    Unlimited
                  </button>
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Custom spend cap (leave blank for unlimited)"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-surface-high text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveBudget()}
                    disabled={savingBudget}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                  >
                    {savingBudget && <Loader2 size={12} className="animate-spin" />}
                    <span>Save Cap</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voice Session Duration Controls */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                  <Timer size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-foreground">Voice Session Duration Limits</h3>
                  <p className="text-[11px] text-muted-foreground">Configure maximum per-customer dialogue session time</p>
                </div>
              </div>
              {usage?.maxSessionDurationSeconds ? (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                  {Math.round(usage.maxSessionDurationSeconds / 60)} min limit
                </span>
              ) : (
                <span className="rounded-full bg-surface-high px-2.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border">
                  5 min default
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed">
              Customer voice & chat sessions automatically close after this duration to prevent idle stream accumulation.
            </div>

            {/* Direct Duration Controls */}
            {userDetail.business && (
              <div className="rounded-xl border border-border bg-surface-lowest p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Duration Limit Presets</span>
                  <span className="text-[11px] text-muted-foreground">Auto-close session timer</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[3, 5, 10, 15].map((presetMins) => (
                    <button
                      key={presetMins}
                      type="button"
                      onClick={() => handleSaveSessionLimit(presetMins)}
                      disabled={savingSession}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-mono font-semibold border transition-colors tabular-nums',
                        usage?.maxSessionDurationSeconds === presetMins * 60
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-surface-high text-muted-foreground hover:text-foreground hover:bg-surface-bright',
                      )}
                    >
                      {presetMins} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSaveSessionLimit(null)}
                    disabled={savingSession}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold border transition-colors',
                      !usage?.maxSessionDurationSeconds
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-surface-high text-muted-foreground hover:text-foreground hover:bg-surface-bright',
                    )}
                  >
                    <RotateCcw size={11} />
                    <span>Default (5m)</span>
                  </button>
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step={1}
                      placeholder="Custom duration in minutes (1–60)"
                      value={sessionInput}
                      onChange={(e) => setSessionInput(e.target.value)}
                      className="w-full pr-10 pl-3 py-1.5 rounded-lg border border-border bg-surface-high text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground font-medium">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSessionLimit()}
                    disabled={savingSession || sessionInput.trim() === ''}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                  >
                    {savingSession && <Loader2 size={12} className="animate-spin" />}
                    <span>Set Limit</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Inline User Profile & RBAC Role Editor (Direct on page, NO MODAL) ── */}
        <div className="rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                <Sliders size={15} />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-foreground">User Profile & RBAC Role Management</h3>
                <p className="text-[11px] text-muted-foreground">Directly update user credentials, security role, and email verification status</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface-high p-2.5 text-xs text-foreground outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full rounded-xl border border-border bg-surface-high p-2.5 text-xs font-mono text-foreground outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Assigned Platform Role</label>
                <select
                  value={profileForm.role || 'user'}
                  onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value as any })}
                  className="w-full rounded-xl border border-border bg-surface-high p-2.5 text-xs font-mono text-foreground outline-none focus:border-primary transition-colors"
                >
                  <option value="user">Standard User</option>
                  <option value="staff">Store Staff</option>
                  <option value="admin">Store Admin</option>
                  <option value="owner">Store Owner</option>
                  <option value="super_admin">Platform SuperAdmin</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inlineEmailVerifiedCheckbox"
                  checked={Boolean(profileForm.emailVerified)}
                  onChange={(e) => setProfileForm({ ...profileForm, emailVerified: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <label htmlFor="inlineEmailVerifiedCheckbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Email OTP Verified (Authorized for store operations)
                </label>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
              >
                {savingProfile ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── Store Tenant & Subscription Core Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Tenant Platform Details */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                  <Store size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-foreground">Merchant Store Tenant</h3>
                  <p className="text-[11px] text-muted-foreground">Multi-tenant boundary and platform integration</p>
                </div>
              </div>
              {userDetail.business && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                    userDetail.business.status === 'active'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                  )}
                >
                  {userDetail.business.status}
                </span>
              )}
            </div>

            {userDetail.business ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Store Name:</span>
                  <span className="font-heading font-bold text-foreground">{userDetail.business.name}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Store Domain:</span>
                  {userDetail.business.domain ? (
                    <a
                      href={
                        userDetail.business.domain.startsWith('http')
                          ? userDetail.business.domain
                          : `https://${userDetail.business.domain}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                    >
                      <span>{userDetail.business.domain}</span>
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="font-mono text-muted-foreground">N/A</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Connected Platform:</span>
                  <span className="font-mono uppercase font-bold text-foreground">
                    {userDetail.business.connectedPlatform || 'custom'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tenant Business ID:</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {userDetail.business.id}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Publishable Key:</span>
                  {userDetail.business.publishableKey ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground bg-surface-lowest px-2 py-0.5 rounded border border-border">
                        {userDetail.business.publishableKey.substring(0, 18)}...
                      </span>
                      <button
                        onClick={() => handleCopyKey(userDetail.business!.publishableKey)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
                        title="Copy publishable key"
                      >
                        {copiedKey ? (
                          <Check size={13} className="text-primary" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-[11px] text-muted-foreground">Not Provisioned</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Provisioned Date:</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(userDetail.business.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-lowest rounded-xl border border-dashed border-border p-4">
                <Store size={28} className="text-muted-foreground/50 mb-2" />
                <p className="text-xs font-semibold text-foreground">No Store Tenant Linked</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This user account is not currently assigned to an active storefront tenant.
                </p>
              </div>
            )}
          </div>

          {/* Subscription & Billing Card */}
          <div className="flex flex-col rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                  <CreditCard size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-bold text-foreground">Subscription & Billing</h3>
                  <p className="text-[11px] text-muted-foreground">Plan tier, payment gateway, and renewal cycles</p>
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                  userDetail.subscription?.isSubscriber
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface-high text-muted-foreground border border-border',
                )}
              >
                {userDetail.subscription?.isSubscriber ? 'PAID TIER' : 'STANDARD'}
              </span>
            </div>

            {userDetail.subscription ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Plan Tier:</span>
                  <span className="font-heading font-bold text-primary capitalize text-sm">
                    {userDetail.subscription.planName || userDetail.subscription.planId || 'Free'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Billing Provider:</span>
                  <span className="font-mono uppercase font-bold text-foreground">
                    {userDetail.subscription.billingProvider || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Subscription Status:</span>
                  <span className="capitalize font-semibold text-foreground">
                    {userDetail.subscription.status || 'Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Subscriber State:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      userDetail.subscription.isSubscriber ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {userDetail.subscription.isSubscriber
                      ? 'Active Paid Subscriber'
                      : 'Standard / Community Free'}
                  </span>
                </div>

                {userDetail.subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Renewal / Expiry Date:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {new Date(userDetail.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Auto-Renewal:</span>
                  <span className="font-semibold text-foreground">
                    {userDetail.subscription.cancelAtPeriodEnd
                      ? 'Cancels at Period End'
                      : 'Auto-Renewing Active'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-lowest rounded-xl border border-dashed border-border p-4">
                <CreditCard size={28} className="text-muted-foreground/50 mb-2" />
                <p className="text-xs font-semibold text-foreground">No Active Subscription Record</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Customer Conversations ── */}
        <div className="rounded-2xl border border-border bg-surface-container p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-high text-primary border border-border">
                <MessageSquare size={15} />
              </div>
              <div>
                <h3 className="text-sm font-heading font-bold text-foreground">Recent Customer Conversations</h3>
                <p className="text-[11px] text-muted-foreground">
                  Live and historical shopper interactions handled by this merchant agent
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {userDetail.recentConversations?.length || 0} Recent Sessions
            </span>
          </div>

          {userDetail.recentConversations && userDetail.recentConversations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Customer Identifier</th>
                    <th className="py-2.5 px-3">Session ID</th>
                    <th className="py-2.5 px-3 text-center">Dialogue Turns</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3 text-right">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {userDetail.recentConversations.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-high/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {c.customerIdentifier || 'Anonymous Shopper'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        <span className="bg-surface-lowest px-2 py-0.5 rounded border border-border/80">
                          {c.sessionId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-serif font-semibold text-foreground tabular-nums">
                        {c.turnCount || 0}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                            c.status === 'active'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : c.status === 'closed'
                              ? 'bg-surface-high text-muted-foreground border border-border'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          )}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                        {new Date(c.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-lowest rounded-xl border border-dashed border-border p-4">
              <MessageSquare size={26} className="text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">No Recorded Conversations</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Shopper conversations with this merchant's ORA agent will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
