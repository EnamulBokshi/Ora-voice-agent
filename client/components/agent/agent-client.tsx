'use client';

import { useState } from 'react';
import { MOCK_KNOWLEDGE_ITEMS, MOCK_UPLOADED_DOCS } from './agent-data';
import { KnowledgeCategory } from './agent-types';
import { AgentHeader } from './agent-header';
import { AgentPersonaBar } from './agent-persona-bar';
import { AgentCategoryTabs } from './agent-category-tabs';
import { AgentKnowledgeList } from './agent-knowledge-list';
import { AgentInspector } from './agent-inspector';
import { AgentPersonaSettings } from './agent-persona-settings';
import { BookOpen, Sliders } from 'lucide-react';

export function AgentClient() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'persona'>('knowledge');
  const [selectedId, setSelectedId] = useState<string>('kb-1');
  const [activeCategory, setActiveCategory] = useState<'All' | KnowledgeCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = MOCK_KNOWLEDGE_ITEMS.filter((item) => {
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
    MOCK_KNOWLEDGE_ITEMS.find((k) => k.id === selectedId) || MOCK_KNOWLEDGE_ITEMS[0];

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex flex-col h-full">
      {/* Header & Health Banner */}
      <AgentHeader />

      {/* ORA Agent Voice & Persona Status Hero Bar */}
      <AgentPersonaBar />

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3 mb-5 border-b pb-3" style={{ borderColor: 'var(--glass-border)' }}>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'knowledge'
              ? 'shadow-md'
              : 'hover:text-foreground hover:bg-[var(--surface-high)]'
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
          <BookOpen size={14} /> Knowledge Base & Grounding
        </button>

        <button
          onClick={() => setActiveTab('persona')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
            activeTab === 'persona'
              ? 'shadow-md'
              : 'hover:text-foreground hover:bg-[var(--surface-high)]'
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
          <Sliders size={14} /> Voice & Persona Tuning
        </button>
      </div>

      {activeTab === 'knowledge' ? (
        <>
          {/* Categories Filter Tabs */}
          <AgentCategoryTabs
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />

          {/* Two Column Workspace */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pb-6">
            {/* Left Column: Knowledge List & Uploaded Docs */}
            <AgentKnowledgeList
              items={filteredItems}
              uploadedDocs={MOCK_UPLOADED_DOCS}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
            />

            {/* Right Column: Knowledge Inspector with Live Sandbox & Auto-Fill */}
            <AgentInspector item={selectedItem} />
          </div>
        </>
      ) : (
        <AgentPersonaSettings />
      )}
    </div>
  );
}
