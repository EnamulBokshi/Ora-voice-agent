'use client';

import { useState } from 'react';
import { X, BookPlus, Sparkles } from 'lucide-react';
import { KnowledgeCategory, KnowledgeItem } from '../agent-types';

interface AddKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newItem: KnowledgeItem) => void;
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

export function AddKnowledgeModal({ isOpen, onClose, onAdd }: AddKnowledgeModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KnowledgeCategory>('Store Policies');
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [bulletPoint1, setBulletPoint1] = useState('');
  const [bulletPoint2, setBulletPoint2] = useState('');
  const [sampleQuestion, setSampleQuestion] = useState('');
  const [sampleAnswer, setSampleAnswer] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !heading.trim()) return;

    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}`,
      title,
      category,
      status: 'active',
      usesCount: 0,
      lastEdited: 'Just now',
      previewContent: {
        heading,
        description: description || 'Standard store policy guidelines.',
        sections: [
          {
            title: 'General Terms',
            items: [
              bulletPoint1 || 'Applies to all eligible orders.',
              bulletPoint2 || 'Contact support for further assistance.',
            ].filter(Boolean),
          },
        ],
      },
      groundingSimulation: {
        question: sampleQuestion || `What is the ${title}?`,
        answer: sampleAnswer || `${heading}: ${description || 'Please refer to store policy for details.'}`,
        sourceTag: title,
      },
      usageStats: {
        retrievals: 0,
        trendPct: 0,
      },
      knowledgeGaps: [],
    };

    onAdd(newItem);
    onClose();
    // Reset form
    setTitle('');
    setHeading('');
    setDescription('');
    setBulletPoint1('');
    setBulletPoint2('');
    setSampleQuestion('');
    setSampleAnswer('');
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
              <BookPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Add Knowledge Item
              </h3>
              <p className="text-xs text-muted-foreground">Add store rules or policy details for ORA AI Assistant</p>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title / Subject *</label>
            <input
              type="text"
              required
              placeholder="e.g. Express Delivery Terms"
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
            <label className="block text-xs font-semibold text-foreground mb-1.5">Main Policy Heading *</label>
            <input
              type="text"
              required
              placeholder="e.g. Same-Day Delivery Inside Dhaka"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description / Overview</label>
            <textarea
              rows={2}
              placeholder="Brief description of this policy or topic..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Rule / Detail #1</label>
              <input
                type="text"
                placeholder="e.g. Orders placed before 12 PM"
                value={bulletPoint1}
                onChange={(e) => setBulletPoint1(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Rule / Detail #2</label>
              <input
                type="text"
                placeholder="e.g. Shipping charge is ৳100"
                value={bulletPoint2}
                onChange={(e) => setBulletPoint2(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
              <Sparkles size={13} /> Sample Customer Question & Answer
            </div>
            <div>
              <input
                type="text"
                placeholder="Customer question (e.g. Do you offer express delivery?)"
                value={sampleQuestion}
                onChange={(e) => setSampleQuestion(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors mb-2"
                style={{ borderColor: 'var(--glass-border)' }}
              />
              <input
                type="text"
                placeholder="ORA Answer (e.g. Yes! Same-day delivery is available...)"
                value={sampleAnswer}
                onChange={(e) => setSampleAnswer(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-lg py-1.5 px-2.5 text-[11px] text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
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
              <BookPlus size={14} /> Add to Knowledge Base
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
