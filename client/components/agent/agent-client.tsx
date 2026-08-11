'use client';

import { useState, useEffect, useCallback } from 'react';
import { KnowledgeCategory, KnowledgeItem, UploadedDoc, mapKnowledgeDocToItem } from './agent-types';
import { AgentHeader } from './agent-header';
import { AgentPersonaBar } from './agent-persona-bar';
import { AgentCategoryTabs } from './agent-category-tabs';
import { AgentKnowledgeList } from './agent-knowledge-list';
import { AgentInspector } from './agent-inspector';
import { AgentPersonaSettings } from './agent-persona-settings';
import { AddKnowledgeModal } from './modals/add-knowledge-modal';
import { UploadDocModal } from './modals/upload-doc-modal';
import { EditKnowledgeModal } from './modals/edit-knowledge-modal';
import { ReindexModal } from '@/components/rag/reindex-modal';
import { RagPlaygroundModal } from '@/components/rag/rag-playground-modal';
import {
  getKnowledgeDocsApi,
  getKnowledgeDocChunksApi,
  deleteKnowledgeDocApi,
} from '@/services/knowledge-service';
import { BookOpen, Sliders, Loader2 } from 'lucide-react';
import { DocType } from '@/types/knowledge';

export function AgentClient() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'persona'>('knowledge');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'All' | KnowledgeCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReindexModalOpen, setIsReindexModalOpen] = useState(false);
  const [isRagPlaygroundModalOpen, setIsRagPlaygroundModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  const fetchKnowledgeDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all store knowledge docs and filter dynamically
      const docs = await getKnowledgeDocsApi({
        search: searchQuery || undefined,
      });

      // Map docs and fetch chunks for each document
      const itemsWithChunks = await Promise.all(
        docs.map(async (doc) => {
          try {
            const chunks = await getKnowledgeDocChunksApi(doc._id);
            return mapKnowledgeDocToItem(doc, chunks);
          } catch {
            return mapKnowledgeDocToItem(doc, []);
          }
        }),
      );

      setKnowledgeItems(itemsWithChunks);

      if (itemsWithChunks.length > 0 && !selectedId) {
        setSelectedId(itemsWithChunks[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load knowledge base:', err);
      setError(err.message || 'Failed to connect to backend Knowledge Base.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedId]);

  useEffect(() => {
    fetchKnowledgeDocs();
  }, [fetchKnowledgeDocs]);

  // Derived uploaded docs list (docs with type uploaded_doc)
  const uploadedDocs: UploadedDoc[] = knowledgeItems
    .filter((k) => k.docType === DocType.UPLOADED_DOC)
    .map((k) => ({
      id: k.id,
      name: k.title,
      type: 'Text/Markdown Document',
      status: 'synced',
      rawDoc: k.rawDoc,
    }));

  // Dynamic filtering by category tab & search query
  const filteredItems = knowledgeItems.filter((item) => {
    if (activeCategory !== 'All') {
      if (activeCategory === 'Store Policies') {
        if (item.docType === DocType.UPLOADED_DOC) return false;
      } else if (activeCategory === 'Documents') {
        if (item.docType !== DocType.UPLOADED_DOC && item.category !== 'Documents') return false;
      } else if (activeCategory === 'FAQs') {
        if (item.docType !== DocType.FAQ && item.category !== 'FAQs') return false;
      } else {
        // Category tab filtering: Shipping & Delivery, Returns & Refunds, Payment, Warranty
        if (item.category !== activeCategory) {
          const matchKeywords =
            activeCategory === 'Shipping & Delivery' ? ['ship', 'deliver', 'express', 'courier', 'dhaka'] :
            activeCategory === 'Returns & Refunds' ? ['return', 'refund', 'exchange', 'replace'] :
            activeCategory === 'Payment' ? ['pay', 'bkash', 'cod', 'cash', 'card', 'bank'] :
            activeCategory === 'Warranty' ? ['warrant', 'guarant', 'claim', 'repair'] : [];

          const text = `${item.title} ${item.content}`.toLowerCase();
          const hasMatch = matchKeywords.some((kw) => text.includes(kw));
          if (!hasMatch) return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Auto-select first item when tab changes if current selection is not in filtered list
  useEffect(() => {
    if (filteredItems.length > 0) {
      const exists = filteredItems.some((k) => k.id === selectedId);
      if (!exists) {
        setSelectedId(filteredItems[0].id);
      }
    }
  }, [activeCategory, filteredItems, selectedId]);

  const selectedItem =
    filteredItems.find((k) => k.id === selectedId) || filteredItems[0] || null;

  // Handlers for Knowledge Items & Docs
  const handleAddKnowledge = (newItem: KnowledgeItem) => {
    setKnowledgeItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
  };

  const handleSaveEdit = (updatedItem: KnowledgeItem) => {
    setKnowledgeItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store policy document?')) {
      return;
    }

    try {
      await deleteKnowledgeDocApi(id);
      const updated = knowledgeItems.filter((item) => item.id !== id);
      setKnowledgeItems(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete knowledge document.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col h-full">
      {/* Top Header & Quick Action Bar */}
      <AgentHeader
        itemsCount={knowledgeItems.length}
        docsCount={uploadedDocs.length}
        onUploadDoc={() => setIsUploadModalOpen(true)}
        onAddKnowledge={() => setIsAddModalOpen(true)}
        onOpenRagPlayground={() => setIsRagPlaygroundModalOpen(true)}
        onOpenReindex={() => setIsReindexModalOpen(true)}
      />

      {/* Mode Navigation Bar */}
      <div
        className="flex items-center gap-3 mb-6 border-b pb-3 shrink-0"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'knowledge' ? 'shadow-md' : 'hover:text-foreground hover:bg-[var(--surface-high)]'
          }`}
          style={
            activeTab === 'knowledge'
              ? {
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                }
              : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: 'var(--muted-foreground)',
                }
          }
        >
          <BookOpen size={15} /> Store Policies & Knowledge Base
        </button>

        <button
          onClick={() => setActiveTab('persona')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'persona' ? 'shadow-md' : 'hover:text-foreground hover:bg-[var(--surface-high)]'
          }`}
          style={
            activeTab === 'persona'
              ? {
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                }
              : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: 'var(--muted-foreground)',
                }
          }
        >
          <Sliders size={15} /> Voice & Persona Tuning
        </button>
      </div>

      {activeTab === 'knowledge' ? (
        <>
          {/* Category Filters */}
          <AgentCategoryTabs
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />

          {error && (
            <div className="mb-4 p-3 rounded-xl border text-xs bg-red-500/10 border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {/* Two Column Organized Workspace */}
          {loading && knowledgeItems.length === 0 ? (
            <div
              className="flex-1 rounded-2xl border p-12 flex flex-col items-center justify-center text-muted-foreground min-h-[400px]"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              <Loader2 size={32} className="animate-spin mb-3 text-[var(--primary)]" />
              <p className="text-xs font-semibold">Loading Store Policies & AI Knowledge Base...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 pb-8 min-h-[550px]">
              {/* Left Column: Search, List of Knowledge items & Uploaded Documents */}
              <AgentKnowledgeList
                items={filteredItems}
                uploadedDocs={uploadedDocs}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
                searchQuery={searchQuery}
                onSearchChange={(q) => setSearchQuery(q)}
              />

              {/* Right Column: Detailed Knowledge Inspector */}
              {selectedItem ? (
                <AgentInspector
                  item={selectedItem}
                  onEdit={() => setEditingItem(selectedItem)}
                  onDelete={() => handleDeleteItem(selectedItem.id)}
                />
              ) : (
                <div
                  className="flex-1 rounded-2xl border p-12 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[400px]"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
                >
                  <BookOpen size={40} className="mb-3 text-[var(--primary)] opacity-60" />
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    {filteredItems.length === 0
                      ? `No documents found in "${activeCategory}"`
                      : 'No Knowledge Item Selected'}
                  </h3>
                  <p className="text-xs max-w-sm">
                    {filteredItems.length === 0
                      ? `Click "Add Policy Info" or "Upload Doc" to add information under ${activeCategory}.`
                      : 'Select a policy document from the list on the left to inspect its content.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Voice & Persona Status Hero Banner */}
          <AgentPersonaBar />

          {/* Persona Tuning Form Controls */}
          <AgentPersonaSettings />
        </div>
      )}

      {/* Modals */}
      <AddKnowledgeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleAddKnowledge}
      />

      <UploadDocModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={handleAddKnowledge}
      />

      <EditKnowledgeModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={handleSaveEdit}
      />

      <ReindexModal
        isOpen={isReindexModalOpen}
        onClose={() => setIsReindexModalOpen(false)}
        onSuccess={fetchKnowledgeDocs}
      />

      <RagPlaygroundModal
        isOpen={isRagPlaygroundModalOpen}
        onClose={() => setIsRagPlaygroundModalOpen(false)}
      />
    </div>
  );
}
