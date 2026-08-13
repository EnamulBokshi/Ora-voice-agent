'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { KNOWLEDGE_CATEGORIES } from './feed-types';
import { cn } from '@/lib/utils';

interface VoiceFeedTabProps {
  onFed: () => void;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: { 0: SpeechRecognitionResultItem };
}

interface SpeechRecognitionResultEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceFeedTab({ onFed }: VoiceFeedTabProps) {
  const [categoryId, setCategoryId] = useState(KNOWLEDGE_CATEGORIES[0].id);
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const lastIdx = event.results.length - 1;
      const text = event.results[lastIdx][0].transcript?.trim();
      if (!text) return;
      setTranscript((prev) => (prev ? `${prev} ${text}` : text));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        setError(`Microphone error: ${event.error}`);
        stopListening();
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      stopListening();
      setError('Could not start the microphone. Check mic permissions and try again.');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !transcript.trim()) {
      setError('Add a title and record or type some content first.');
      return;
    }

    const category = KNOWLEDGE_CATEGORIES.find((c) => c.id === categoryId)!;
    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: title.trim(),
        docType: category.docType,
        content: transcript.trim(),
        metadata: { source: 'voice_feed' },
      });
      setTranscript('');
      setTitle('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to feed knowledge to ORA.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          What are you telling ORA about?
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                categoryId === cat.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface-low hover:bg-surface-high',
              )}
            >
              <p className="text-xs font-semibold text-foreground">{cat.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. About our store, Summer collection pricing, Return policy..."
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Recorder */}
      <div className="rounded-2xl border border-border bg-surface-low p-5 flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!speechSupported}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-40',
            isListening
              ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30 animate-pulse'
              : 'bg-primary hover:bg-primary/90 shadow-primary/25',
          )}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? (
            <Square size={22} className="text-white" />
          ) : (
            <Mic size={24} className="text-primary-foreground" />
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          {!speechSupported
            ? 'Voice input requires Chrome or Edge. You can still type below.'
            : isListening
              ? 'Listening... speak naturally about your business or products. Tap to stop.'
              : 'Tap the mic and speak — ORA will turn it into knowledge.'}
        </p>
      </div>

      {/* Transcript */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Transcript {isListening && <span className="text-red-400 normal-case">(recording...)</span>}
          </label>
          {transcript && (
            <button
              onClick={() => setTranscript('')}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          placeholder="Your spoken words appear here. You can also type or edit directly..."
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <CheckCircle2 size={14} /> Fed to ORA
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || isListening}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Feeding ORA...
            </>
          ) : (
            'Feed to ORA'
          )}
        </button>
      </div>
    </div>
  );
}
