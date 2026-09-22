'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  Check, 
  Copy, 
  CheckCircle2, 
  Sliders, 
  Code, 
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  Layers,
  Zap,
  ArrowRight
} from 'lucide-react';

interface PlatformOption {
  id: string;
  name: string;
  placeholder: string;
  count: string;
}

const PLATFORMS: PlatformOption[] = [
  { id: 'shopify', name: 'Shopify', placeholder: 'yourstore.myshopify.com', count: '248 items' },
  { id: 'woo', name: 'WooCommerce', placeholder: 'store.domain.com/wp-json', count: '180 items' },
  { id: 'api', name: 'Custom Feed', placeholder: 'api.store.com/v1/products', count: '520 items' },
];

export function Start2Steps() {
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0.15);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('shopify');
  const [urgencyEnabled, setUrgencyEnabled] = useState(true);
  const [oneClickEnabled, setOneClickEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null)
  ];

  // Scroll tracking to drive dynamic timeline beam fill & step detection
  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate scroll progress through the timeline container
      const totalHeight = rect.height;
      const currentPos = (windowHeight * 0.45) - rect.top;
      const progress = Math.max(0.1, Math.min(1, currentPos / totalHeight));
      setScrollProgress(progress);

      if (!isAutoStepping) {
        if (progress < 0.38) {
          setActiveStep(0);
        } else if (progress < 0.72) {
          setActiveStep(1);
        } else {
          setActiveStep(2);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAutoStepping]);

  // Optional auto-progression mode
  useEffect(() => {
    if (!isAutoStepping) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4500);

    return () => clearInterval(timer);
  }, [isAutoStepping]);

  const scrollToStep = (index: number) => {
    setIsAutoStepping(false);
    setActiveStep(index);
    const target = stepRefs[index].current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('<script src="https://cdn.ora.ai/widget/loader.js" data-ora-id="biz_live_891" async></script>');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

  return (
    <section className="s2-steps-section" id="how-it-works" role="region" aria-label="Setup timeline: three steps to launch">
      <div className="s2-container">
        
        {/* Section Header: Sentence Case, Zero Eyebrows, Clean & Authoritative */}
        <div className="s2-section-head text-center">
          <h2 className="s2-section-title">
            Three steps to launch
          </h2>
          <p className="s2-section-sub">
            From store catalog to live voice sales in under 3 minutes.
          </p>

          {/* Timeline Jump Pills & Auto-Play Control */}
          <div className="s2-timeline-nav-row">
            <button
              type="button"
              onClick={() => scrollToStep(0)}
              className={`s2-timeline-nav-pill ${activeStep === 0 ? 'active' : ''}`}
              aria-pressed={activeStep === 0}
            >
              <span className="s2-nav-pill-num">01</span>
              <span>Connect</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToStep(1)}
              className={`s2-timeline-nav-pill ${activeStep === 1 ? 'active' : ''}`}
              aria-pressed={activeStep === 1}
            >
              <span className="s2-nav-pill-num">02</span>
              <span>Configure</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToStep(2)}
              className={`s2-timeline-nav-pill ${activeStep === 2 ? 'active' : ''}`}
              aria-pressed={activeStep === 2}
            >
              <span className="s2-nav-pill-num">03</span>
              <span>Launch</span>
            </button>

            {/* Play/Pause Demonstration Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoStepping(!isAutoStepping)}
              className="s2-timeline-play-btn"
              aria-label={isAutoStepping ? 'Pause timeline progression' : 'Play timeline progression'}
              title={isAutoStepping ? 'Pause auto-cycle' : 'Auto-cycle demonstration'}
            >
              {isAutoStepping ? <Pause size={11} /> : <Play size={11} />}
            </button>
          </div>
        </div>

        {/* Vertical Connected Timeline Wrapper */}
        <div className="s2-timeline-wrapper" ref={timelineRef}>
          
          {/* Continuous Vertical Timeline Spine */}
          <div className="s2-timeline-spine-track" aria-hidden="true">
            {/* Background inactive track */}
            <div className="s2-spine-base-line" />
            
            {/* Illuminated dynamic fill beam */}
            <div 
              className="s2-spine-fill-beam"
              style={{ height: `${Math.min(100, Math.max(10, scrollProgress * 100))}%` }}
            />

            {/* Animated energetic travelling spark */}
            <div 
              className="s2-spine-spark-particle"
              style={{ top: `${Math.min(98, Math.max(2, scrollProgress * 100))}%` }}
            />
          </div>

          {/* =================================================================
              TIMELINE STAGE 01: CONNECT STORE CATALOG
             ================================================================= */}
          <div 
            ref={stepRefs[0]}
            className={`s2-timeline-stage ${activeStep === 0 ? 'stage-active' : ''}`}
            onClick={() => setActiveStep(0)}
          >
            {/* Left Node Milestone */}
            <div className="s2-timeline-milestone">
              <div className="s2-milestone-aura" />
              <div className="s2-milestone-circle">
                <span className="s2-milestone-num">01</span>
              </div>
              <div className="s2-milestone-branch" />
            </div>

            {/* Stage Body Grid: Left Info & Right Mockup */}
            <div className="s2-timeline-card-grid">
              
              {/* Left Column: Context & Spec Tags */}
              <div className="s2-timeline-info">
                <div className="s2-stage-meta-row">
                  <span className="s2-stage-status-chip active">Phase 01 · Catalog Sync</span>
                </div>
                <h3 className="s2-stage-title">Connect store catalog</h3>
                <p className="s2-stage-desc">
                  Authorize via 1-click Shopify OAuth or WooCommerce REST API. ORA automatically parses your products, variants, real-time stock levels, and store return policies.
                </p>
                <div className="s2-stage-tags">
                  <span className="s2-stage-tag">Shopify &amp; WooCommerce</span>
                  <span className="s2-stage-tag">Live Webhook Sync</span>
                  <span className="s2-stage-tag">&lt; 90s Ingestion</span>
                </div>
              </div>

              {/* Right Column: Live Interactive Ingestion Deck */}
              <div className="s2-timeline-mockup">
                <div className="s2-deck-top">
                  <div className="s2-platform-switcher">
                    {PLATFORMS.map((plat) => (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlatform(plat.id);
                          setActiveStep(0);
                        }}
                        className={`s2-micro-platform-chip ${selectedPlatform === plat.id ? 'active' : ''}`}
                      >
                        <span>{plat.name}</span>
                      </button>
                    ))}
                  </div>
                  <span className="s2-deck-ping-dot" title="Live connector active" />
                </div>

                {/* URL Input Box */}
                <div className="s2-step-url-box">
                  <Globe size={13} className="text-muted-foreground flex-shrink-0" />
                  <span className="s2-url-text">{currentPlatform.placeholder}</span>
                  <span className="s2-sync-badge">Sync</span>
                </div>

                {/* Live Sync Progress Visual */}
                <div className="s2-step-progress-box">
                  <div className="flex justify-between items-center text-[11px] font-mono mb-1">
                    <span className="text-muted-foreground">Catalog sync</span>
                    <span className="text-[#16A34A] dark:text-[#C8F031] font-bold">{currentPlatform.count} ready</span>
                  </div>
                  <div className="s2-mini-progress-bar">
                    <div className="s2-progress-fill" />
                  </div>
                </div>

                {/* Status Verification Chips */}
                <div className="s2-step-chips-footer">
                  <div className="s2-status-chip">
                    <CheckCircle2 size={11} className="text-[#16A34A] dark:text-[#C8F031]" />
                    <span>Real-time stock hook</span>
                  </div>
                  <div className="s2-status-chip">
                    <CheckCircle2 size={11} className="text-[#16A34A] dark:text-[#C8F031]" />
                    <span>Store policies indexed</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* =================================================================
              TIMELINE STAGE 02: CONFIGURE CONVERSATION RULES
             ================================================================= */}
          <div 
            ref={stepRefs[1]}
            className={`s2-timeline-stage ${activeStep === 1 ? 'stage-active' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            {/* Left Node Milestone */}
            <div className="s2-timeline-milestone">
              <div className="s2-milestone-aura" />
              <div className="s2-milestone-circle">
                <span className="s2-milestone-num">02</span>
              </div>
              <div className="s2-milestone-branch" />
            </div>

            {/* Stage Body Grid: Left Info & Right Mockup */}
            <div className="s2-timeline-card-grid">
              
              {/* Left Column: Context & Spec Tags */}
              <div className="s2-timeline-info">
                <div className="s2-stage-meta-row">
                  <span className="s2-stage-status-chip">Phase 02 · Sales Playbook</span>
                </div>
                <h3 className="s2-stage-title">Tune rules &amp; urgency</h3>
                <p className="s2-stage-desc">
                  Establish brand tone, out-of-stock alternative policies, and low-inventory urgency triggers. Zero hallucinations guaranteed through catalog-bound RAG.
                </p>
                <div className="s2-stage-tags">
                  <span className="s2-stage-tag">Sub-350ms Turnaround</span>
                  <span className="s2-stage-tag">Zero Hallucinations</span>
                  <span className="s2-stage-tag">SMS Checkout Ready</span>
                </div>
              </div>

              {/* Right Column: Tactile Switch Deck */}
              <div className="s2-timeline-mockup">
                <div className="s2-mock-toggles">
                  {/* Toggle 1: Stock Urgency */}
                  <div 
                    className="s2-toggle-row clickable"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUrgencyEnabled(!urgencyEnabled);
                      setActiveStep(1);
                    }}
                  >
                    <div>
                      <span className="s2-toggle-name">Stock Urgency</span>
                      <span className="s2-toggle-sub">Alert shopper when &le; 3 units left</span>
                    </div>
                    <div className={`s2-toggle-switch ${urgencyEnabled ? 'on' : 'off'}`}>
                      <div className="s2-switch-knob" />
                    </div>
                  </div>

                  {/* Toggle 2: Instant Checkout */}
                  <div 
                    className="s2-toggle-row clickable"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOneClickEnabled(!oneClickEnabled);
                      setActiveStep(1);
                    }}
                  >
                    <div>
                      <span className="s2-toggle-name">Instant Checkout Link</span>
                      <span className="s2-toggle-sub">Pre-filled cart dispatched mid-call</span>
                    </div>
                    <div className={`s2-toggle-switch ${oneClickEnabled ? 'on' : 'off'}`}>
                      <div className="s2-switch-knob" />
                    </div>
                  </div>

                  {/* Grounding Shield Status */}
                  <div className="s2-toggle-row locked">
                    <div>
                      <span className="s2-toggle-name">Zero Hallucinations Shield</span>
                      <span className="s2-toggle-sub">Catalog truth strictly bound</span>
                    </div>
                    <span className="s2-locked-tag">
                      <ShieldCheck size={12} />
                      <span>Locked</span>
                    </span>
                  </div>
                </div>

                {/* Rules Ready Status Tag */}
                <div className="s2-rules-ready-badge">
                  <Sparkles size={12} />
                  <span>Sales playbook active · Grounded speech engine</span>
                </div>
              </div>

            </div>
          </div>

          {/* =================================================================
              TIMELINE STAGE 03: EMBED ASYNC SCRIPT & GO LIVE
             ================================================================= */}
          <div 
            ref={stepRefs[2]}
            className={`s2-timeline-stage ${activeStep === 2 ? 'stage-active' : ''}`}
            onClick={() => setActiveStep(2)}
          >
            {/* Left Node Milestone */}
            <div className="s2-timeline-milestone">
              <div className="s2-milestone-aura" />
              <div className="s2-milestone-circle">
                <span className="s2-milestone-num">03</span>
              </div>
              <div className="s2-milestone-branch" />
            </div>

            {/* Stage Body Grid: Left Info & Right Mockup */}
            <div className="s2-timeline-card-grid">
              
              {/* Left Column: Context & Spec Tags */}
              <div className="s2-timeline-info">
                <div className="s2-stage-meta-row">
                  <span className="s2-stage-status-chip">Phase 03 · Production Go-Live</span>
                </div>
                <h3 className="s2-stage-title">Embed snippet &amp; launch</h3>
                <p className="s2-stage-desc">
                  Paste one 18KB asynchronous tag into your store header or Google Tag Manager. Shadow DOM architecture guarantees zero theme collision and zero PageSpeed impact.
                </p>
                <div className="s2-stage-tags">
                  <span className="s2-stage-tag">18KB Bundle</span>
                  <span className="s2-stage-tag">Shadow DOM</span>
                  <span className="s2-stage-tag">0 Speed Penalty</span>
                </div>
              </div>

              {/* Right Column: Code Snippet & Copy Action */}
              <div className="s2-timeline-mockup">
                <div className="s2-mockup-top flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-muted-foreground">Universal Tag</span>
                  <span className="s2-live-indicator">
                    <span className="s2-live-pulse-dot" />
                    <span>Ready to paste</span>
                  </span>
                </div>

                {/* Code Snippet Box */}
                <div className="s2-mock-code-box">
                  <code className="text-[11px] leading-relaxed">
                    &lt;script src=&quot;https://cdn.ora.ai/widget/loader.js&quot; <br />
                    &nbsp;&nbsp;data-ora-id=&quot;biz_live_891&quot; async&gt;&lt;/script&gt;
                  </code>
                </div>

                {/* Interactive Copy Button */}
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                    setActiveStep(2);
                  }}
                  className="s2-copy-btn"
                  aria-label="Copy snippet to clipboard"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Script Tag'}</span>
                </button>

                {/* Frontend Guarantee Strip */}
                <div className="s2-step-chips-footer mt-2">
                  <div className="s2-status-chip">
                    <span>18KB gzip</span>
                  </div>
                  <div className="s2-status-chip">
                    <span>Zero layout shift</span>
                  </div>
                  <div className="s2-status-chip">
                    <span>Universal compatibility</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Slender Telemetry Stat Strips (Inspired by one_agent.png) */}
        <div className="s2-steps-stats-bar">
          <div className="s2-stat-pill">
            <span className="s2-stat-pill-num">1</span>
            <span className="s2-stat-pill-text">script tag to go live</span>
          </div>
          <div className="s2-stat-pill">
            <span className="s2-stat-pill-num">312ms</span>
            <span className="s2-stat-pill-text">average voice turnaround</span>
          </div>
          <div className="s2-stat-pill">
            <span className="s2-stat-pill-num">100%</span>
            <span className="s2-stat-pill-text">catalog grounded truth</span>
          </div>
          <div className="s2-stat-pill">
            <span className="s2-stat-pill-num">0</span>
            <span className="s2-stat-pill-text">theme code modifications</span>
          </div>
        </div>

      </div>
    </section>
  );
}
