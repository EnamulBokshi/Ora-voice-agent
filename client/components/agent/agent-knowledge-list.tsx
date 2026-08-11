'use client';

import { Search, Truck, RotateCcw, CreditCard, ShieldCheck, FolderOpen, FileText, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { KnowledgeItem, UploadedDoc } from './agent-types';

interface AgentKnowledgeListProps {
  items: KnowledgeItem[];
  uploadedDocs: UploadedDoc[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Shipping & Delivery': <Truck size={16} />,
  'Returns & Refunds':  <RotateCcw size={16} />,
  'Payment':            <CreditCard size={16} />,
  'Warranty':           <ShieldCheck size={16} />,
};

export function AgentKnowledgeList({
  items,
  uploadedDocs,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: AgentKnowledgeListProps) {
  return (
    <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative w-full">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search knowledge..."
          className="w-full bg-[var(--surface-high)] border rounded-2xl py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
          style={{ borderColor: 'var(--glass-border)' }}
        />
      </div>

      {/* Knowledge Items List */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const Icon = CATEGORY_ICONS[item.category] || <FileText size={16} />;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="p-4 rounded-2xl border cursor-pointer relative overflow-hidden transition-all duration-200"
              style={{
                background: isSelected
                  ? 'color-mix(in srgb, var(--primary) 10%, var(--surface-container))'
                  : 'var(--glass-bg)',
                borderColor: isSelected ? 'var(--primary)' : 'var(--glass-border)',
                boxShadow: isSelected ? '0 0 12px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
              }}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: 'var(--primary)' }} />
              )}

              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                    {Icon}
                  </span>
                  <h3 className="font-bold text-xs text-foreground">{item.title}</h3>
                </div>

                {item.status === 'active' ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border"
                    style={{
                      background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                      color: 'var(--ora-success)',
                    }}
                  >
                    Active
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border"
                    style={{
                      background: 'color-mix(in srgb, var(--ora-warning) 12%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--ora-warning) 25%, transparent)',
                      color: 'var(--ora-warning)',
                    }}
                  >
                    Needs Review
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
                <span>{item.category}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye size={11} /> {item.usesCount} Uses
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Uploaded Documents Card */}
      <div
        className="rounded-2xl border overflow-hidden backdrop-blur-md"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div
          className="px-4 py-3 border-b flex justify-between items-center"
          style={{
            background: 'var(--surface-high)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <h4 className="text-xs font-bold text-foreground">Uploaded Documents</h4>
          <FolderOpen size={15} className="text-muted-foreground" />
        </div>

        <div className="p-2 space-y-1">
          {uploadedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-[var(--surface-high)] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: 'var(--secondary)' }} />
                <span className="font-medium text-foreground text-xs">{doc.name}</span>
              </div>
              <CheckCircle2 size={13} style={{ color: 'var(--ora-success)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
