'use client';

import { useState } from 'react';
import { MOCK_KNOWLEDGE_ITEMS, MOCK_UPLOADED_DOCS } from './agent-data';
import { KnowledgeCategory, KnowledgeItem, UploadedDoc } from './agent-types';
import { AgentHeader } from './agent-header';
import { AgentPersonaBar } from './agent-persona-bar';
import { AgentCategoryTabs } from './agent-category-tabs';
import { AgentKnowledgeList } from './agent-knowledge-list';
import { AgentInspector } from './agent-inspector';
import { AgentPersonaSettings } from './agent-persona-settings';
import { AddKnowledgeModal } from './modals/add-knowledge-modal';
import { UploadDocModal } from './modals/upload-doc-modal';
import { EditKnowledgeModal } from './modals/edit-knowledge-modal';
import { BookOpen, Sliders } from 'lucide-react';

export function AgentClient() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'persona'>('knowledge');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(MOCK_KNOWLEDGE_ITEMS);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>(MOCK_UPLOADED_DOCS);
  const [selectedId, setSelectedId] = useState<string>('kb-1');
  const [activeCategory, setActiveCategory] = useState<'All' | KnowledgeCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Filtered knowledge list
  const filteredItems = knowledgeItems.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.previewContent.heading.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedItem =
    knowledgeItems.find((k) => k.id === selectedId) || knowledgeItems[0] || null;

  // Handlers for Knowledge Items & Docs
  const handleAddKnowledge = (newItem: KnowledgeItem) => {
    setKnowledgeItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
  };

  const handleUploadDoc = (newDoc: UploadedDoc) => {
    setUploadedDocs((prev) => [newDoc, ...prev]);
  };

  const handleSaveEdit = (updatedItem: KnowledgeItem) => {
    setKnowledgeItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this knowledge item?')) {
      const updated = knowledgeItems.filter((item) => item.id !== id);
      setKnowledgeItems(updated);
      if (selectedId === id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
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

          {/* Two Column Organized Workspace */}
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

            {/* Right Column: Detailed Knowledge Inspector, Preview & AI Sandbox */}
            {selectedItem ? (
              <AgentInspector
                item={selectedItem}
                onEdit={() => setEditingItem(selectedItem)}
                onDelete={() => handleDeleteItem(selectedItem.id)}
              />
            ) : (
              <div
                className="flex-1 rounded-2xl border p-12 flex flex-col items-center justify-center text-center text-muted-foreground"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
              >
                <BookOpen size={40} className="mb-3 text-[var(--primary)] opacity-60" />
                <h3 className="font-bold text-sm text-foreground mb-1">No Knowledge Item Selected</h3>
                <p className="text-xs max-w-sm">
                  Select an item from the left list or click &quot;Add Knowledge&quot; to create a new entry for ORA AI Assistant.
                </p>
              </div>
            )}
          </div>
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
        onAdd={handleAddKnowledge}
      />

      <UploadDocModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDoc}
      />

      <EditKnowledgeModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
