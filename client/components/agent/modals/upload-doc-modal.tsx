'use client';

import { useState } from 'react';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { KnowledgeItem, mapKnowledgeDocToItem } from '../agent-types';

interface UploadDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (newItem: KnowledgeItem) => void;
}

export function UploadDocModal({ isOpen, onClose, onUploaded }: UploadDocModalProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>(DocType.UPLOADED_DOC);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !fileContent.trim()) {
      setError('Please provide a document title and select a valid text file.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await createKnowledgeDocApi({
        title: title.trim(),
        docType,
        content: fileContent.trim(),
        metadata: {
          originalFileName: fileName,
        },
      });

      const newItem = mapKnowledgeDocToItem(result.document, []);
      onUploaded(newItem);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error('Failed to upload knowledge document:', err);
      setError(err.message || 'Failed to process and index uploaded document.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDocType(DocType.UPLOADED_DOC);
    setFileContent('');
    setFileName('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl overflow-hidden flex flex-col gap-5"
        style={{
          background: 'var(--surface-container-high)',
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
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Upload Policy Document
              </h3>
              <p className="text-xs text-muted-foreground">Upload text or markdown files for AI assistant training.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border text-xs bg-red-500/10 border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Return Policy Guide 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2 px-3 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Select Text / Markdown File</label>
            <label
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-[var(--surface-high)]/50 transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <FileText size={32} className="text-[var(--primary)] mb-2 opacity-80" />
              <span className="text-xs font-semibold text-foreground">
                {fileName ? fileName : 'Click to select .txt, .md, .csv file'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">Text content will be automatically processed for AI search</span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {fileContent && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Extracted Content Preview</label>
              <textarea
                rows={4}
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)] transition-colors resize-none leading-relaxed font-mono"
                style={{ borderColor: 'var(--glass-border)' }}
              />
            </div>
          )}

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
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'var(--logo-gradient)',
                boxShadow: 'var(--logo-glow)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Indexing Document...
                </>
              ) : (
                <>
                  <UploadCloud size={14} /> Upload & Index Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
