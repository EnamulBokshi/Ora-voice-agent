'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
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
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported] = useState(() => getSpeechRecognitionCtor() !== null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);

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
    if (!transcript.trim()) {
      setError('Record or type some content first.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createKnowledgeDocApi({
        title: 'Voice input',
        docType: DocType.BRAND_RULE,
        content: transcript.trim(),
        metadata: { source: 'voice_feed' },
      });
      setTranscript('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onFed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice note.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Recorder */}
      <div className="rounded-lg border border-border bg-surface-low p-6 flex flex-col items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!speechSupported}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md disabled:opacity-40',
            isListening
              ? 'bg-red-500 hover:bg-red-400 shadow-red-500/30 animate-pulse'
              : 'bg-primary hover:bg-primary-hover text-primary-foreground shadow-primary/25',
          )}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? (
            <Square size={20} className="text-white" />
          ) : (
            <Mic size={22} className="text-primary-foreground" />
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          {!speechSupported
            ? 'Voice input requires Chrome or Edge. You can also type notes directly below.'
            : isListening
              ? 'Recording... speak naturally about your store policies, products, or FAQs. Tap to stop.'
              : 'Click the mic and speak store guidelines, product specifics, or common customer answers.'}
        </p>
      </div>

      {/* Transcript */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Voice Note Transcript {isListening && <span className="text-red-400 normal-case">(recording...)</span>}
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
          placeholder="Your spoken transcript appears here. You can edit or type directly..."
          className="w-full rounded-md border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary leading-relaxed"
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-[color:var(--status-online)]">
            <CheckCircle2 size={14} /> Saved to knowledge base
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving || isListening}
          className="px-5 py-2 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving...
            </>
          ) : (
            'Save Note'
          )}
        </button>
      </div>
    </div>
  );
}
