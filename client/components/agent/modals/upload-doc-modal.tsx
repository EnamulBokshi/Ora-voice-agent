'use client';

import { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { UploadedDoc } from '../agent-types';

interface UploadDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newDoc: UploadedDoc) => void;
}

export function UploadDocModal({ isOpen, onClose, onUpload }: UploadDocModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);

    setTimeout(() => {
      const ext = selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF';
      const newDoc: UploadedDoc = {
        id: `doc-${Date.now()}`,
        name: selectedFile.name,
        type: ext,
        status: 'synced',
      };

      onUpload(newDoc);
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-5 shadow-2xl overflow-hidden"
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
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Upload Policy Document</h3>
              <p className="text-xs text-muted-foreground">Upload PDF, TXT or DOCX store policy documents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form & Drop Zone */}
        <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
          <div
            className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all hover:bg-[var(--surface-high)] relative"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <input
              type="file"
              accept=".pdf,.txt,.docx,.doc"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
            >
              <FileText size={24} />
            </div>
            {selectedFile ? (
              <div>
                <p className="font-semibold text-xs text-[var(--primary)] flex items-center gap-1.5 justify-center">
                  <CheckCircle2 size={14} /> {selectedFile.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click to change file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-xs text-foreground">
                  Drag & drop file here, or <span className="text-[var(--primary)] underline">browse</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Supports PDF, TXT, DOCX up to 10MB</p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border flex items-center gap-3 text-xs text-muted-foreground" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <span className="text-[var(--primary)] font-bold">Auto-Sync:</span>
            Uploaded documents are automatically learned by ORA to answer customer questions accurately.
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
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--logo-gradient)',
                boxShadow: 'var(--logo-glow)',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Processing Document...
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload & Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
