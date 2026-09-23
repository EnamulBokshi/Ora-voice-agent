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
import { withDemoFallback } from '@/lib/demo-config';
import { Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConversationsClient() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileTranscript, setShowMobileTranscript] = useState<boolean>(false);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getConversationsApi({ page: 1, limit: 50 });
      const mapped = (res?.items ?? []).map((conv) => mapApiConversationToUi(conv));
      const items = withDemoFallback(mapped, demoConversationItems);
      setConversations(items);
      setSelectedId((prev) => prev || items[0]?.id || '');
    } catch (err) {
      console.error('Failed to load conversations:', err);
      const items = withDemoFallback(null, demoConversationItems);
      setConversations(items);
      setSelectedId((prev) => prev || items[0]?.id || '');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;

    // Demo conversation transcripts are already bundled locally
    if (selectedId.startsWith('demo-')) {
      return;
    }

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
      if (!selectedId.startsWith('demo-')) {
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
          <Loader2 className="animate-spin text-muted-foreground" size={18} />
          <span className="text-sm font-medium">Loading conversations…</span>
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
    <div className="flex-1 min-h-0 min-w-0 flex h-full w-full overflow-hidden bg-background divide-x divide-border/40">
      <div className={cn(
        'w-full md:w-auto h-full min-h-0 flex flex-col shrink-0',
        showMobileTranscript ? 'hidden md:flex' : 'flex',
      )}>
        <ConversationListPanel
          conversations={filteredConversations}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            setShowMobileTranscript(true);
          }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div className={cn(
        'flex-1 h-full min-h-0 flex flex-col min-w-0 overflow-hidden',
        !showMobileTranscript ? 'hidden md:flex' : 'flex',
      )}>
        {selectedConversation ? (
          <ConversationTranscript
            conversation={selectedConversation}
            onCloseSession={handleCloseSession}
            isClosing={isClosing}
            isLoadingTranscript={isLoadingTranscript}
            onBack={() => setShowMobileTranscript(false)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <MessageSquare size={24} className="text-muted-foreground/30" />
            <p className="font-medium text-foreground">No conversation selected</p>
            <p className="text-xs text-muted-foreground/60">
              Select a conversation from the left to view the transcript.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
