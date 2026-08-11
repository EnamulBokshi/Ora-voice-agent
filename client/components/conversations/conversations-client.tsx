'use client';

import { useState } from 'react';
import { MOCK_CONVERSATIONS } from './conversation-data';
import { ConversationListPanel } from './conversation-list-panel';
import { ConversationTranscript } from './conversation-transcript';
import { ConversationIntelligenceSidebar } from './conversation-intelligence-sidebar';

export function ConversationsClient() {
  const [selectedId, setSelectedId] = useState<string>('conv-1');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredConversations = MOCK_CONVERSATIONS.filter((item) => {
    if (activeTab === 'active' && item.status !== 'active') return false;
    if (activeTab === 'completed' && item.status !== 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.previewMessage.toLowerCase().includes(q) ||
        item.sessionRef.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedConversation =
    MOCK_CONVERSATIONS.find((c) => c.id === selectedId) || MOCK_CONVERSATIONS[0];

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden relative">
      {/* Left fixed 320px conversation list */}
      <ConversationListPanel
        conversations={filteredConversations}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* Middle flex-1 conversation transcript stream */}
      <ConversationTranscript conversation={selectedConversation} />

      {/* Right fixed 280px intelligence sidebar */}
      <ConversationIntelligenceSidebar intelligence={selectedConversation.intelligence} />
    </div>
  );
}
