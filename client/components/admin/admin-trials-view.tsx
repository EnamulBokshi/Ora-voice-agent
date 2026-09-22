'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Megaphone,
  Search,
  Send,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminHeader } from './admin-header';
import { PlatformStatCard } from './platform-stat-card';
import { contactTrialLead, fetchTrialLeads } from '@/services/admin-service';
import { CampaignComposer } from './campaign-composer';
import { TrialLead, TrialLeadStatus, TrialLeadsStats } from '@/types/admin';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Running' },
  { value: 'expiring_soon', label: 'Expiring ≤3d' },
  { value: 'expired', label: 'Expired' },
  { value: 'converted', label: 'Converted' },
];

const STATUS_STYLE: Record<TrialLeadStatus, { label: string; className: string }> = {
  active: {
    label: 'Running',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  expiring_soon: {
    label: 'Expiring',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  expired: {
    label: 'Expired',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  lapsed: {
    label: 'Lapsed',
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  converted: {
    label: 'Converted',
    className: 'border-primary/40 bg-primary text-primary-foreground',
  },
};

const inputClass =
  'w-full rounded-lg border border-border bg-surface-high px-3 py-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Trial pipeline for platform admins.
 *
 * One row per merchant who ever started a free trial: when it began, what is left of
 * it, and whether it turned into a subscription. The point is to show where an
 * admin's attention is worth most — the trials about to lapse — and let them write
 * to that merchant without leaving the page.
 */
export function AdminTrialsView() {
  const [leads, setLeads] = useState<TrialLead[]>([]);
  const [stats, setStats] = useState<TrialLeadsStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [showCampaign, setShowCampaign] = useState(false);
  const [contactLead, setContactLead] = useState<TrialLead | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadData = useCallback(
    async (page = 1, isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchTrialLeads({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter,
        });
        setLeads(res.leads);
        setStats(res.stats);
        setPagination(res.pagination);
      } catch (err) {
        toast.error('Could not load trial leads', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    const timer = setTimeout(() => loadData(1), 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const toggleOne = (businessId: string) => {
    setSelected((prev) =>
      prev.includes(businessId)
        ? prev.filter((id) => id !== businessId)
        : [...prev, businessId],
    );
  };

  const allOnPageSelected =
    leads.length > 0 && leads.every((lead) => selected.includes(lead.businessId));

  const toggleAllOnPage = () => {
    const pageIds = leads.map((lead) => lead.businessId);
    setSelected((prev) =>
      allOnPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds])),
    );
  };

  const openContact = (lead: TrialLead) => {
    setContactLead(lead);
    // A default that states the specific situation, which the admin can rewrite.
    setSubject(
      lead.status === 'converted'
        ? `Thanks for subscribing to ORA, ${lead.storeName}`
        : lead.daysRemaining > 0
          ? `Your ORA trial ends in ${lead.daysRemaining} day${lead.daysRemaining === 1 ? '' : 's'}`
          : `Your ORA trial for ${lead.storeName} has ended`,
    );
    setMessage('');
  };

  const closeContact = () => {
    setContactLead(null);
    setSubject('');
    setMessage('');
  };

  const sendOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactLead) return;

    setSending(true);
    try {
      const res = await contactTrialLead(contactLead.businessId, {
        subject: subject.trim(),
        message: message.trim(),
      });
      toast.success(`Email sent to ${res.to}`, { description: res.storeName });
      closeContact();
    } catch (err) {
      toast.error('Email not sent', {
        description: err instanceof Error ? err.message : 'Nothing was delivered.',
      });
    } finally {
      setSending(false);
    }
  };

  const remainingLabel = (lead: TrialLead) => {
    if (lead.status === 'converted') return 'Subscribed';
    if (lead.daysRemaining > 0) return `${lead.daysRemaining}d left`;
    if (lead.hoursRemaining > 0) return `${lead.hoursRemaining}h left`;
    return 'Ended';
  };

  return (
    <div className="flex flex-col min-h-full">
      <AdminHeader
        title="Trial Leads & Conversion"
        description="Who started a free trial, how much of it is left, and who converted."
        onRefresh={() => loadData(pagination.page, true)}
        isRefreshing={refreshing}
      >
        <button
          onClick={() => setShowCampaign(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 sm:px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 shadow-xs"
        >
          <Megaphone size={13} />
          <span className="hidden sm:inline">
            {selected.length > 0 ? `Email ${selected.length} selected` : 'New campaign'}
          </span>
        </button>
      </AdminHeader>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformStatCard
            title="Trials Started"
            value={stats?.totalTrials ?? 0}
            subtitle={`${stats?.active ?? 0} running now`}
            icon={<Zap size={18} />}
          />
          <PlatformStatCard
            title="Expiring ≤ 3 Days"
            value={stats?.expiringSoon ?? 0}
            subtitle="Contact these first"
            icon={<Clock size={18} />}
            highlight
          />
          <PlatformStatCard
            title="Converted"
            value={stats?.converted ?? 0}
            subtitle={`$${(stats?.convertedMrrUsd ?? 0).toLocaleString()} MRR from trials`}
            icon={<CheckCircle2 size={18} />}
          />
          <PlatformStatCard
            title="Conversion Rate"
            value={`${stats?.conversionRate ?? 0}%`}
            subtitle={`${stats?.expired ?? 0} expired without subscribing`}
            icon={<TrendingUp size={18} />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-container p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store, domain, or email"
              className={cn(inputClass, 'pl-8')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-high p-0.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  statusFilter === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold text-foreground">
              {selected.length} merchant{selected.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-lg border border-border bg-surface-high px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-bright"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowCampaign(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Megaphone size={13} />
                <span>Email these merchants</span>
              </button>
            </div>
          </div>
        )}

        {/* Leads table */}
        <div className="rounded-xl border border-border bg-surface-container overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-high/50 text-muted-foreground uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all leads on this page"
                    className="h-3.5 w-3.5 cursor-pointer accent-[color:var(--primary)]"
                  />
                </th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
                    Loading trial leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    No trials match this filter.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const tone = STATUS_STYLE[lead.status];
                  return (
                    <tr
                      key={lead.businessId}
                      className={cn(
                        'transition-colors hover:bg-surface-high/40',
                        selected.includes(lead.businessId) && 'bg-primary/5',
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(lead.businessId)}
                          onChange={() => toggleOne(lead.businessId)}
                          aria-label={`Select ${lead.storeName}`}
                          className="h-3.5 w-3.5 cursor-pointer accent-[color:var(--primary)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{lead.storeName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {lead.domain}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{lead.ownerName || '—'}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {lead.ownerEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {lead.planName}
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          ${lead.planPriceUsd}/mo
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(lead.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(lead.expiresAt)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 font-semibold tabular-nums',
                          lead.status === 'expiring_soon'
                            ? 'text-amber-400'
                            : lead.status === 'expired' || lead.status === 'lapsed'
                              ? 'text-destructive'
                              : 'text-foreground',
                        )}
                      >
                        {remainingLabel(lead)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            tone.className,
                          )}
                        >
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openContact(lead)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-high px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-bright"
                        >
                          <Mail size={12} />
                          <span>Contact</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
                className="rounded-lg border border-border bg-surface-high px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-bright disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
                className="rounded-lg border border-border bg-surface-high px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-bright disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCampaign && (
        <CampaignComposer
          selectedBusinessIds={selected}
          selectionLabel={
            selected.length > 0
              ? `${selected.length} merchant${selected.length === 1 ? '' : 's'} picked from this list`
              : undefined
          }
          onClose={() => setShowCampaign(false)}
          onSent={() => setSelected([])}
        />
      )}

      {/* Contact modal */}
      {contactLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface-container p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold font-heading text-foreground">
                  Email {contactLead.storeName}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {contactLead.ownerEmail} · {remainingLabel(contactLead)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeContact}
                aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={sendOutreach} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  maxLength={4000}
                  placeholder={`Hi ${contactLead.ownerName || 'there'}, I noticed your trial…`}
                  className={cn(inputClass, 'resize-y leading-relaxed')}
                />
              </label>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Sent from ORA to the store owner on record.
                </p>
                <button
                  type="submit"
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>{sending ? 'Sending...' : 'Send email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
