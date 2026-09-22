'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Check } from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  badge: string;
  customerPrompt: string;
  customerContext: string;
  oraReply: string;
  latencyMs: number;
  outcomeTag: string;
  outcomeDelta: string;
  language: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'sizing',
    title: 'Sizing & Fit Objection',
    badge: 'Conversion Booster',
    customerContext: 'Viewing Oxford Button-Down (Hesitating on size selection)',
    customerPrompt: "I'm 5'11 and 175 lbs. Should I get a Medium or Large in this Oxford shirt?",
    oraReply:
      "For 5'11 and 175 lbs, Large gives you the cleanest silhouette without pulling across the shoulders. Plus, all orders include free size exchanges. Want me to add Large in Sky Blue to your bag with 10% off?",
    latencyMs: 308,
    outcomeTag: 'Size Locked · 1-Click Bag Update',
    outcomeDelta: '+$58 AOV · 0% Returns',
    language: 'English (US)',
  },
  {
    id: 'cart-recovery',
    title: '2 AM Cart Recovery',
    badge: 'Cart Rescue',
    customerContext: 'Checkout page inactive for 45 seconds (Exit Intent)',
    customerPrompt: "I really like these boots, but will they arrive before Friday for my weekend trip?",
    oraReply:
      "Yes! If we confirm in the next 15 minutes, our express dispatch guarantees delivery by Thursday 4 PM. I can apply our Free Express Shipping code right now — should we complete this?",
    latencyMs: 295,
    outcomeTag: 'Exit Intent Intercepted · Express Code Applied',
    outcomeDelta: '+$145 Recovered · 2:14 AM',
    language: 'English (US)',
  },
  {
    id: 'multilingual',
    title: 'Multilingual / Regional',
    badge: 'Local Commerce',
    customerContext: 'Customer asking in Bengali on Dhaka store',
    customerPrompt: 'Delivery charge koto porbe aar ami ki bKash e payment korte parbo?',
    oraReply:
      'Dhaka city-te delivery charge matro ৳60 ebong 24 ghontay delivery hobe. Apni bKash 1-click checkout diye payment korte parben. Ami ki order-ti confirm kore dibo?',
    latencyMs: 322,
    outcomeTag: 'Bengali Voice · bKash Checkout Ready',
    outcomeDelta: '৳2,450 Order Closed',
    language: 'বাংলা / English',
  },
];

export function StartAudioSimulator() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [showOutcome, setShowOutcome] = useState<boolean>(false);

  // Simulation playback loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      setShowOutcome(false);
      const interval = 80;
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            setShowOutcome(true);
            return 100;
          }
          return prev + 2;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleScenarioChange = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setIsPlaying(false);
    setProgress(0);
    setShowOutcome(false);
  };

  const togglePlay = () => {
    if (progress >= 100) {
      setProgress(0);
      setShowOutcome(false);
    }
    setIsPlaying(!isPlaying);
  };

  const resetPlay = () => {
    setIsPlaying(false);
    setProgress(0);
    setShowOutcome(false);
  };

  return (
    <div className="start-sim-card">
      {/* Top Header / Status Bar */}
      <div className="start-sim-header">
        <div className="start-sim-status">
          <span className="start-status-dot" aria-hidden="true" />
          <span className="start-sim-mono">ORA SPEECH-TO-SPEECH ENGINE</span>
          <span className="start-sim-badge">{activeScenario.language}</span>
        </div>
        <div className="start-sim-latency">
          <span className="start-latency-tag">
            <span className="start-latency-val">{activeScenario.latencyMs}ms</span> LATENCY
          </span>
        </div>
      </div>

      {/* Scenario Pill Selectors */}
      <div className="start-sim-scenarios" role="tablist" aria-label="Conversation scenarios">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={activeScenario.id === s.id}
            className={`start-scenario-tab ${activeScenario.id === s.id ? 'active' : ''}`}
            onClick={() => handleScenarioChange(s)}
          >
            <span>{s.title}</span>
            <span className="start-tab-badge">{s.badge}</span>
          </button>
        ))}
      </div>

      {/* Main Conversation Window */}
      <div className="start-sim-conversation">
        {/* Context Strip */}
        <div className="start-context-strip">
          <span className="start-context-icon">⚡</span>
          <span>{activeScenario.customerContext}</span>
        </div>

        {/* Customer Voice Bubble */}
        <div className="start-bubble start-bubble-customer">
          <div className="start-bubble-meta">
            <span className="start-avatar-customer">Shopper</span>
            <span className="start-bubble-time">Live Voice</span>
          </div>
          <p className="start-bubble-text">"{activeScenario.customerPrompt}"</p>
        </div>

        {/* ORA Voice Bubble with Soundwave */}
        <div className="start-bubble start-bubble-ora">
          <div className="start-bubble-meta">
            <div className="start-ora-id">
              <span className="start-avatar-ora">
                <Sparkles size={12} />
              </span>
              <span className="start-ora-name">ORA Sales Brain</span>
            </div>
            <span className="start-ora-subspeech">
              Verified sub-{activeScenario.latencyMs}ms response
            </span>
          </div>

          <p className="start-bubble-text start-ora-text">"{activeScenario.oraReply}"</p>

          {/* Dynamic Waveform Visualizer */}
          <div className="start-waveform-box" aria-hidden="true">
            <div className="start-waveform-bars">
              {[28, 64, 42, 85, 96, 54, 78, 92, 40, 68, 88, 95, 34, 76, 52, 90, 62, 84, 48, 72].map(
                (h, idx) => (
                  <span
                    key={idx}
                    className={`start-wave-bar ${isPlaying ? 'animated' : ''}`}
                    style={{
                      height: isPlaying ? `${Math.max(16, (h * (progress > 30 ? 1 : 0.4))) % 100}%` : `${h * 0.35}%`,
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  />
                ),
              )}
            </div>
            <span className="start-waveform-label">
              {isPlaying ? 'Synthesizing voice stream...' : 'Click play to simulate conversation'}
            </span>
          </div>
        </div>

        {/* Real-Time Outcome Notification (Appears on Completion) */}
        <div className={`start-outcome-pill ${showOutcome ? 'visible' : ''}`}>
          <div className="start-outcome-left">
            <span className="start-check-icon">
              <Check size={14} />
            </span>
            <span className="start-outcome-text">{activeScenario.outcomeTag}</span>
          </div>
          <span className="start-outcome-delta">{activeScenario.outcomeDelta}</span>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="start-sim-footer">
        <div className="start-controls">
          <button
            type="button"
            className="start-play-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause audio simulation' : 'Play audio simulation'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
            <span>{isPlaying ? 'Pause Demo' : progress > 0 ? 'Resume Demo' : 'Play Live Interaction'}</span>
          </button>
          <button
            type="button"
            className="start-reset-btn"
            onClick={resetPlay}
            aria-label="Reset simulation"
            title="Reset simulation"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Progress meter */}
        <div className="start-progress-wrap">
          <div className="start-progress-bar">
            <div className="start-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="start-progress-time">
            {progress < 100 ? `00:0${Math.floor(progress / 33)}` : '00:03'} / 00:03
          </span>
        </div>
      </div>
    </div>
  );
}
