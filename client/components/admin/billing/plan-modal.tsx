'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, SlidersHorizontal, Check, Plus, Trash2, Shield, Layers, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPlanItem, CreatePlanPayload } from '@/types/admin-billing';
import { createAdminPlan, updateAdminPlan } from '@/services/admin-billing-service';
import { cn } from '@/lib/utils';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: AdminPlanItem | null;
  onSaved: (plan: AdminPlanItem) => void;
}

const DEFAULT_FEATURE_PRESETS = [
  'Real-time Voice AI Engine',
  'Automated Order Tracking & Cart Recovery',
  'Product Catalog Auto-Sync',
  'Advanced Analytics & Conversation Transcripts',
  'Priority 24/7 Merchant Support',
  'Custom Voice Agent Persona & Tone',
  'Dedicated Account Manager',
];

export function PlanModal({ isOpen, onClose, plan, onSaved }: PlanModalProps) {
  const isEditing = !!plan;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  // Pricing (in dollars and BDT)
  const [usdPrice, setUsdPrice] = useState<string>('49');
  const [bdtPrice, setBdtPrice] = useState<string>('5000');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [trialDays, setTrialDays] = useState<number>(14);

  // Limits
  const [conversationMinutes, setConversationMinutes] = useState<number>(500);
  const [ordersPerMonth, setOrdersPerMonth] = useState<number>(1000);
  const [connectedStores, setConnectedStores] = useState<number>(1);
  const [seats, setSeats] = useState<number>(3);

  // Features
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState('');

  useEffect(() => {
    if (plan) {
      setPlanId(plan.planId);
      setName(plan.name);
      setDescription(plan.description || '');
      setBadge(plan.badge || '');
      setSortOrder(plan.sortOrder ?? 1);
      setIsActive(plan.isActive ?? true);
      setIsCustom(plan.isCustom ?? false);
      setUsdPrice((plan.priceUsdCents / 100).toString());
      setBdtPrice((plan.priceBdtPaisa / 100).toString());
      setBillingInterval(plan.billingInterval || 'monthly');
      setTrialDays(plan.trialDays ?? 0);
      setConversationMinutes(plan.limits?.conversationMinutes ?? 500);
      setOrdersPerMonth(plan.limits?.ordersPerMonth ?? 1000);
      setConnectedStores(plan.limits?.connectedStores ?? 1);
      setSeats(plan.limits?.seats ?? 1);
      setFeatures(plan.features || []);
    } else {
      // Default reset for new plan
      setPlanId('');
      setName('');
      setDescription('');
      setBadge('');
      setSortOrder(1);
      setIsActive(true);
      setIsCustom(false);
      setUsdPrice('49');
      setBdtPrice('5000');
      setBillingInterval('monthly');
      setTrialDays(14);
      setConversationMinutes(500);
      setOrdersPerMonth(1000);
      setConnectedStores(1);
      setSeats(3);
      setFeatures([
        'Real-time Voice AI Engine',
        'Product Catalog Auto-Sync',
        'Automated Order Tracking & Cart Recovery',
      ]);
    }
    setError(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleAddFeature = (feat: string) => {
    const trimmed = feat.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures([...features, trimmed]);
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceUsdCents = Math.round(parseFloat(usdPrice || '0') * 100);
    const priceBdtPaisa = Math.round(parseFloat(bdtPrice || '0') * 100);

    if (!name.trim()) {
      setError('Plan name is required.');
      return;
    }

    if (!isEditing && !planId.trim()) {
      setError('Plan ID/Slug is required (e.g. starter, pro, growth).');
      return;
    }

    setLoading(true);
    try {
      const payload: CreatePlanPayload = {
        planId: planId.trim().toLowerCase().replace(/\s+/g, '-'),
        name: name.trim(),
        description: description.trim() || undefined,
        badge: badge.trim() || undefined,
        priceUsdCents,
        priceBdtPaisa,
        billingInterval,
        trialDays: Number(trialDays) || 0,
        sortOrder: Number(sortOrder) || 1,
        isActive,
        isCustom,
        limits: {
          conversationMinutes: Number(conversationMinutes) || 0,
          ordersPerMonth: Number(ordersPerMonth) || 0,
          connectedStores: Number(connectedStores) || 1,
          seats: Number(seats) || 1,
        },
        features: features.length > 0 ? features : ['Standard Access'],
      };

      let savedPlan: AdminPlanItem;
      if (isEditing && plan) {
        savedPlan = await updateAdminPlan(plan._id, payload);
      } else {
        savedPlan = await createAdminPlan(payload);
      }

      onSaved(savedPlan);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save subscription plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-border bg-surface-lowest shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground font-heading">
                {isEditing ? `Edit ${plan.name}` : 'New Plan'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Set pricing, quotas, and included features.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield size={13} className="text-primary" /> Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growth Pro"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isEditing && !planId) {
                      setPlanId(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Slug <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  placeholder="e.g. growth-pro"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary disabled:opacity-50"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Identifier for payment providers.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-velocity stores with 1,000+ monthly orders and multichannel sync"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. Most Popular, Enterprise"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                />
                <span>Active</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={isCustom}
                  onChange={(e) => setIsCustom(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary"
                />
                <span>Custom (unlisted)</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Order:</span>
                <input
                  type="number"
                  min="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-xs rounded-lg bg-surface-high border border-border text-foreground text-center tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Billing */}
          <div className="space-y-4 pt-3 border-t border-border/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign size={13} className="text-primary" /> Pricing
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  USD price <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={usdPrice}
                    onChange={(e) => setUsdPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  BDT price <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    ৳
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={bdtPrice}
                    onChange={(e) => setBdtPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Trial (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Quotas & Resource Limits */}
          <div className="space-y-4 pt-3 border-t border-border/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-muted-foreground" /> Limits
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Voice minutes
                </label>
                <input
                  type="number"
                  min="0"
                  value={conversationMinutes}
                  onChange={(e) => setConversationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Orders / month
                </label>
                <input
                  type="number"
                  min="0"
                  value={ordersPerMonth}
                  onChange={(e) => setOrdersPerMonth(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Connected stores
                </label>
                <input
                  type="number"
                  min="1"
                  value={connectedStores}
                  onChange={(e) => setConnectedStores(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-foreground mb-1">
                  Seats
                </label>
                <input
                  type="number"
                  min="1"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-surface-high border border-border text-foreground tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Features */}
          <div className="space-y-3 pt-3 border-t border-border/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Check size={13} className="text-primary" /> Features
            </h3>

            {/* Existing features chips */}
            <div className="space-y-2">
              {features.map((feat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-high border border-border text-xs text-foreground group"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px]">
                      ✓
                    </span>
                    <span>{feat}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-60 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Feature */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add feature..."
                value={newFeatureInput}
                onChange={(e) => setNewFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature(newFeatureInput);
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-surface-high border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddFeature(newFeatureInput)}
                disabled={!newFeatureInput.trim()}
              >
                <Plus size={13} className="mr-1" /> Add
              </Button>
            </div>

            {/* Feature Suggestions */}
            <div className="pt-1">
              <span className="text-[10px] text-muted-foreground block mb-1.5">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_FEATURE_PRESETS.filter((p) => !features.includes(p)).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddFeature(preset)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-container px-2 py-1 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Plus size={10} />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-container shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {loading && <Loader2 size={13} className="animate-spin mr-1.5" />}
            <span>{isEditing ? 'Save Plan Changes' : 'Create Plan'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
