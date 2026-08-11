'use client';

import { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { KnowledgeCategory, KnowledgeItem } from '../agent-types';

interface EditKnowledgeModalProps {
  isOpen: boolean;
  item: KnowledgeItem | null;
  onClose: () => void;
  onSave: (updatedItem: KnowledgeItem) => void;
}

const CATEGORIES: KnowledgeCategory[] = [
  'Store Policies',
  'Shipping & Delivery',
  'Returns & Refunds',
  'Payment',
  'Warranty',
  'FAQs',
  'Documents',
];

export function EditKnowledgeModal({ isOpen, item, onClose, onSave }: EditKnowledgeModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('Store Policies');
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setCategory(item.category);
      setHeading(item.previewContent.heading);
      setDescription(item.previewContent.description);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !heading.trim()) return;

    const updatedItem: KnowledgeItem = {
      ...item,
      title,
      category,
      lastEdited: 'Just now by Admin',
      previewContent: {
        ...item.previewContent,
        heading,
        description: description || item.previewContent.description,
      },
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 flex flex-col gap-5 shadow-2xl overflow-hidden"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Edit Knowledge Item</h3>
              <p className="text-xs text-muted-foreground">Update policy content and grounding rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title / Subject *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Main Heading *</label>
            <input
              type="text"
              required
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description / Overview</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--glass-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5"
              style={{
                background: 'var(--logo-gradient)',
                boxShadow: 'var(--logo-glow)',
              }}
            >
              <Edit3 size={14} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
