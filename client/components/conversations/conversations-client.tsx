'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConversationItem } from './conversation-types';
import { mapApiConversationToUi, mapApiMessagesToUi } from './conversation-adapter';
import {
  getConversationsApi,
  getConversationTranscriptApi,
  closeConversationApi,
} from '@/services/conversations-service';
import { ConversationListPanel } from './conversation-list-panel';
import { ConversationTranscript } from './conversation-transcript';
import { demoConversationItems } from '@/lib/demo-data';
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

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getConversationsApi({ page: 1, limit: 50 });
      const mapped = (res?.items ?? []).map((conv) => mapApiConversationToUi(conv));
      const items = mapped.length > 0 ? mapped : demoConversationItems;
      setConversations(items);
      setSelectedId((prev) => prev || items[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;

    let active = true;
    async function fetchTranscript() {
      setIsLoadingTranscript(true);
      try {
        const data = await getConversationTranscriptApi(selectedId);
        if (!active) return;
        const uiMessages = mapApiMessagesToUi(data.messages ?? []);
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
      } catch (err) {
        if (active) console.error('Failed to load transcript:', err);
      } finally {
        if (active) setIsLoadingTranscript(false);
      }
    }

    fetchTranscript();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const handleCloseSession = async () => {
    if (!selectedId || isClosing) return;
    setIsClosing(true);
    try {
      await closeConversationApi(selectedId);
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
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-sm font-medium">Loading conversations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden">
      <ConversationListPanel
        conversations={filteredConversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {selectedConversation ? (
        <ConversationTranscript
          conversation={selectedConversation}
          onCloseSession={handleCloseSession}
          isClosing={isClosing}
          isLoadingTranscript={isLoadingTranscript}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No conversations yet. Conversations from the ORA widget will appear here.
        </div>
      )}
    </div>
  );
}
