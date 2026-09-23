'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  Smartphone,
  ShieldAlert,
  Copy,
  Check,
  Edit2,
  Plus,
  Trash2,
  SlidersHorizontal,
  MessageSquare,
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { updateCustomerApi } from '@/services/customers-service';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { ShopperErasureModal } from './shopper-erasure-modal';

interface CustomerDetailPanelProps {
  customer: Customer;
  onReload: () => void;
  onCloseMobile?: () => void;
}

type DetailTab = 'preferences' | 'devices' | 'privacy';

export function CustomerDetailPanel({
  customer,
  onReload,
  onCloseMobile,
}: CustomerDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('preferences');
  const [name, setName] = useState(customer.name);
  const [prevCustomerName, setPrevCustomerName] = useState(customer.name);
  if (customer.name !== prevCustomerName) {
    setPrevCustomerName(customer.name);
    setName(customer.name);
  }

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isErasureModalOpen, setIsErasureModalOpen] = useState(false);

  // Preference editing state
  const [isAddingPref, setIsAddingPref] = useState(false);
  const [newPrefKey, setNewPrefKey] = useState('');
  const [newPrefValue, setNewPrefValue] = useState('');
  const [isSavingPref, setIsSavingPref] = useState(false);

  const customerId = customer._id || customer.id || '';
  const preferences = customer.extractedPreferences || {};
  const prefEntries = Object.entries(preferences);
  const isAnonymous = customer.isAnonymous ?? (!customer.email && !customer.phone);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveName = async () => {
    if (!name.trim() || name === customer.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await updateCustomerApi(customerId, { name: name.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
      onReload();
    } catch {
      setName(customer.name);
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefKey.trim() || !newPrefValue.trim()) return;
    setIsSavingPref(true);
    try {
      const updatedPreferences = {
        ...preferences,
        [newPrefKey.trim()]: newPrefValue.trim(),
      };
      await updateCustomerApi(customerId, {
        extractedPreferences: updatedPreferences,
      });
      setNewPrefKey('');
      setNewPrefValue('');
      setIsAddingPref(false);
      onReload();
    } catch (err) {
      console.error('Failed to add preference:', err);
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleDeletePreference = async (keyToDelete: string) => {
    setIsSavingPref(true);
    try {
      const updatedPreferences = { ...preferences };
      delete updatedPreferences[keyToDelete];
      await updateCustomerApi(customerId, {
        extractedPreferences: updatedPreferences,
      });
      onReload();
    } catch (err) {
      console.error('Failed to delete preference:', err);
    } finally {
      setIsSavingPref(false);
    }
  };

  return (
    <div className="rounded-md border border-border/60 bg-background overflow-hidden flex flex-col h-full shadow-xs">
      {/* ── Header ── */}
      <div className="p-5 sm:p-6 border-b border-border/40 bg-surface-lowest/40 space-y-4">
        {/* Top line with ID & Conversations link */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded bg-surface-high border border-border"
              >
                ← Back
              </button>
            )}
            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
              <span>ID:</span>
              <span className="text-foreground">{customerId.slice(0, 8)}…</span>
              <button
                type="button"
                onClick={() => handleCopy(customerId, 'id')}
                className="hover:text-foreground cursor-pointer p-0.5 rounded"
                title="Copy customer ID"
              >
                {copiedKey === 'id' ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
              </button>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/conversations?search=${encodeURIComponent(customer.name)}`}
              className="px-2.5 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground bg-surface-high/40 hover:bg-surface-high border border-border/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="View conversations"
            >
              <MessageSquare size={12} className="text-primary" />
              <span>Conversations</span>
            </Link>
          </div>
        </div>

        {/* Identity row */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold bg-surface-high border border-border/60 text-foreground select-none">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                isAnonymous ? 'bg-muted-foreground/40' : 'bg-primary'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 w-full max-w-xs">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setName(customer.name);
                        setIsEditingName(false);
                      }
                    }}
                    autoFocus
                    disabled={isSavingName}
                    className="text-xs font-semibold text-foreground bg-surface-high border border-primary/70 rounded px-2 py-1 w-full outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary-hover"
                    title="Save name"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h2 className="text-[14px] font-semibold text-foreground truncate tracking-tight">
                    {customer.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer p-0.5"
                    title="Edit name"
                  >
                    <Edit2 size={11} />
                  </button>
                  {nameSaved && (
                    <span className="text-[10.5px] text-primary flex items-center gap-1">
                      <Check size={10} /> Saved
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] ${
                  isAnonymous
                    ? 'bg-surface-high/50 text-muted-foreground border border-border/50'
                    : 'bg-primary/10 text-primary border border-primary/30 font-medium'
                }`}
              >
                {isAnonymous ? 'Guest' : 'Verified Contact'}
              </span>

              {customer.externalCustomerId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] bg-surface-high/50 text-muted-foreground border border-border/50">
                  Shopify Synced
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-surface-high/20 border border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={12} className="text-muted-foreground shrink-0" />
              <span className="text-foreground truncate select-all text-[11.5px]">
                {customer.email ?? 'No email'}
              </span>
            </div>
            {customer.email && (
              <button
                type="button"
                onClick={() => handleCopy(customer.email!, 'email')}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Copy email"
              >
                {copiedKey === 'email' ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-surface-high/20 border border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={12} className="text-muted-foreground shrink-0" />
              <span className="text-foreground truncate select-all text-[11.5px]">
                {customer.phone ?? 'No phone'}
              </span>
            </div>
            {customer.phone && (
              <button
                type="button"
                onClick={() => handleCopy(customer.phone!, 'phone')}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Copy phone"
              >
                {copiedKey === 'phone' ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center border-b border-border/40 px-5 sm:px-6 text-xs font-medium overflow-x-auto no-scrollbar gap-5">
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`py-2.5 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-[12px] ${
            activeTab === 'preferences'
              ? 'text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <SlidersHorizontal size={12} />
          <span>Preferences</span>
          {prefEntries.length > 0 && (
            <span className="text-[10.5px] text-primary/80 tabular-nums">
              ({prefEntries.length})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`py-2.5 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-[12px] ${
            activeTab === 'devices'
              ? 'text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone size={12} />
          <span>Devices</span>
          <span className="text-[10.5px] text-muted-foreground tabular-nums">
            ({customer.deviceIds?.length ?? 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`py-2.5 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-[12px] ${
            activeTab === 'privacy'
              ? 'text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert size={12} />
          <span>Privacy</span>
        </button>
      </div>

      {/* ── Tab Body ── */}
      <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 text-xs">
        {/* TAB 1: Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Saved Attributes & Notes
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPref(!isAddingPref)}
                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus size={11} /> Add attribute
              </button>
            </div>

            {/* Inline add attribute form */}
            {isAddingPref && (
              <form
                onSubmit={handleAddPreference}
                className="p-3.5 rounded-md bg-surface-high/30 border border-border/60 space-y-2.5"
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newPrefKey}
                    onChange={(e) => setNewPrefKey(e.target.value)}
                    placeholder="Key (e.g. RingSize)"
                    className="bg-surface-high/50 border border-border/60 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    required
                    value={newPrefValue}
                    onChange={(e) => setNewPrefValue(e.target.value)}
                    placeholder="Value (e.g. 7.5 US)"
                    className="bg-surface-high/50 border border-border/60 rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPref(false)}
                    className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPref}
                    className="px-3 py-1 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {prefEntries.length === 0 ? (
              <div className="p-6 rounded border border-dashed border-border/60 text-center space-y-1.5">
                <p className="font-medium text-foreground text-xs">No saved preferences</p>
                <p className="text-muted-foreground text-[11.5px] max-w-xs mx-auto">
                  Attributes noted from customer interactions (e.g. size, color, or preferred styles) will be listed here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {prefEntries.map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                  const formattedValue =
                    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

                  return (
                    <div
                      key={key}
                      className="p-3 rounded border border-border/40 bg-surface-high/20 flex items-start justify-between gap-3 group hover:bg-surface-high/30 hover:border-border/60 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-muted-foreground text-[10.5px] uppercase tracking-wide">
                          {label}
                        </div>
                        <p className="text-foreground text-[12.5px] break-words leading-relaxed">
                          {formattedValue}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePreference(key)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer p-1"
                        title="Remove attribute"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-3 text-[11px] tabular-nums">
              <div className="p-2.5 rounded bg-surface-high/15 border border-border/30 space-y-1">
                <span className="text-muted-foreground uppercase block text-[10px]">
                  First Seen
                </span>
                <span className="text-foreground">
                  {formatDateTime(customer.createdAt)}
                </span>
              </div>
              <div className="p-2.5 rounded bg-surface-high/15 border border-border/30 space-y-1">
                <span className="text-muted-foreground uppercase block text-[10px]">
                  Last Active
                </span>
                <span className="text-foreground">
                  {customer.lastActiveAt
                    ? formatRelativeTime(customer.lastActiveAt)
                    : 'Recently'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Connected Devices */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Storefront Devices
            </span>

            {!customer.deviceIds || customer.deviceIds.length === 0 ? (
              <div className="p-6 rounded border border-dashed border-border/60 text-center space-y-1.5">
                <p className="font-medium text-foreground text-xs">No devices recorded</p>
                <p className="text-muted-foreground text-[11.5px]">
                  No storefront device sessions currently associated with this profile.
                </p>
              </div>
            ) : (
              <div className="space-y-2 tabular-nums">
                {customer.deviceIds.map((devId) => (
                  <div
                    key={devId}
                    className="p-3 rounded border border-border/40 bg-surface-high/20 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Smartphone size={14} className="text-primary shrink-0" />
                      <span className="text-foreground truncate text-[12px]">{devId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customer.externalCustomerId && (
              <div className="p-3 rounded border border-border/40 bg-surface-high/15 space-y-1.5 text-xs tabular-nums">
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  Shopify Customer ID
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-foreground select-all text-[12px]">
                    {customer.externalCustomerId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(customer.externalCustomerId!, 'externalId')}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {copiedKey === 'externalId' ? (
                      <Check size={11} className="text-primary" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Privacy */}
        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Data Privacy & Erasure
            </span>

            <div className="p-4 rounded border border-border/40 bg-surface-high/15 space-y-3 text-xs">
              <div className="space-y-1.5">
                <h4 className="font-medium text-foreground text-xs">Delete Customer Record</h4>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Permanently delete encrypted contact details, names, and saved preferences according to privacy regulations.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsErasureModalOpen(true)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors cursor-pointer"
                >
                  Erase Customer Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shopper Erasure Modal */}
      <ShopperErasureModal
        customer={customer}
        isOpen={isErasureModalOpen}
        onClose={() => setIsErasureModalOpen(false)}
        onSuccess={() => onReload()}
      />
    </div>
  );
}
