'use client';

import { useState, useEffect, useCallback } from 'react';
import { MOCK_CONVERSATIONS } from './conversation-data';
import { ConversationItem } from './conversation-types';
import { mapApiConversationToUi, mapApiMessagesToUi } from './conversation-adapter';
import {
  getConversationsApi,
  getConversationTranscriptApi,
  closeConversationApi,
} from '@/services/conversations-service';
import { ConversationListPanel } from './conversation-list-panel';
import { ConversationTranscript } from './conversation-transcript';
import { ConversationIntelligenceSidebar } from './conversation-intelligence-sidebar';
import { Loader2 } from 'lucide-react';

export function ConversationsClient() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial conversations list from backend API
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getConversationsApi({ page: 1, limit: 50 });
      if (res && res.items && res.items.length > 0) {
        // Real DB data available -> display dynamic database records
        const mapped = res.items.map((conv) => mapApiConversationToUi(conv));
        setConversations(mapped);
        setSelectedId(mapped[0].id);
      } else {
        // DB empty -> fall back to mock data
        setConversations(MOCK_CONVERSATIONS);
        setSelectedId(MOCK_CONVERSATIONS[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to fetch conversations from API, using mock data:', err);
      setError(err?.message || 'Failed to connect to backend server');
      setConversations(MOCK_CONVERSATIONS);
      setSelectedId(MOCK_CONVERSATIONS[0].id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch transcript when selectedId changes (if it's a real API ID)
  useEffect(() => {
    if (!selectedId || selectedId.startsWith('conv-')) return; // Skip API fetch for mock item IDs

    async function fetchTranscript() {
      setIsLoadingTranscript(true);
      try {
        const data = await getConversationTranscriptApi(selectedId);
        if (data && data.messages) {
          const uiMessages = mapApiMessagesToUi(data.messages);
          setConversations((prev) =>
            prev.map((item) =>
              item.id === selectedId
                ? {
                    ...item,
                    transcript: uiMessages,
                    previewMessage:
                      uiMessages.length > 0
                        ? `"${uiMessages[uiMessages.length - 1].text.slice(0, 80)}"`
                        : item.previewMessage,
                  }
                : item,
            ),
          );
        }
      } catch (err) {
        console.error('Failed to load transcript:', err);
      } finally {
        setIsLoadingTranscript(false);
      }
    }

    fetchTranscript();
  }, [selectedId]);



  // Close session action
  const handleCloseSession = async () => {
    if (!selectedId || isClosing) return;
    setIsClosing(true);
    try {
      if (!selectedId.startsWith('conv-')) {
        await closeConversationApi(selectedId);
      }
      setConversations((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, status: 'completed' } : item)),
      );
    } catch (err) {
      console.error('Failed to close conversation session:', err);
    } finally {
      setIsClosing(false);
    }
  };

  const filteredConversations = conversations.filter((item) => {
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
    conversations.find((c) => c.id === selectedId) || filteredConversations[0] || conversations[0];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span className="text-sm font-medium">Loading ORA Conversations...</span>
        </div>
      </div>
    );
  }

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
      {selectedConversation ? (
        <ConversationTranscript
          conversation={selectedConversation}
          onCloseSession={handleCloseSession}
          isClosing={isClosing}
          isLoadingTranscript={isLoadingTranscript}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No conversation selected.
        </div>
      )}

      {/* Right fixed 280px intelligence sidebar */}
      {selectedConversation && (
        <ConversationIntelligenceSidebar intelligence={selectedConversation.intelligence} />
      )}
    </div>
  );
}


