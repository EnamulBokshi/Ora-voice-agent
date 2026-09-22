'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Code2, 
  Share2, 
  ShieldCheck, 
  Radio, 
  Volume2, 
  Sparkles, 
  Activity,
  Mic,
  Cpu
} from 'lucide-react';

export function StartWhyGrid() {
  const [activeBars, setActiveBars] = useState<number[]>([]);
  const [activeScenario, setActiveScenario] = useState<number>(0);

  const scenarios = [
    {
      label: 'Clinic / Medical',
      query: '“Do you take Saturday walk-ins and how much is consultation?”',
      response: '“We are open Saturdays from 9 AM to 1 PM. General consultation is $45, credited to your treatment. Shall I reserve a slot?”',
      latency: '290ms',
      grounding: 'Verified · Clinic Schedule',
    },
    {
      label: 'Agency / Studio',
      query: '“Do you offer monthly retainers or fixed scope sprints?”',
      response: '“Both! Retainers start at $3,500/mo, and design sprints run 2 to 4 weeks. Would you like me to send our rate card?”',
      latency: '315ms',
      grounding: 'Verified · Studio Services',
    },
    {
      label: 'Retail Store',
      query: '“Does the merino overshirt run true to size in chest measurement?”',
      response: '“It has a tailored cut. For a relaxed fit or layering over knitwear, we recommend ordering one size up.”',
      latency: '302ms',
      grounding: 'Verified · Catalog Specs',
    },
  ];

  useEffect(() => {
    // Generate dynamic acoustic wave heights
    const interval = setInterval(() => {
      setActiveBars(
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 26) + 6)
      );
    }, 160);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="fs-why-section" id="why-fix">
      <div className="fs-container">
        {/* Section Header */}
        <div className="fs-section-head text-center">
          <span className="fs-pill-badge">Why ORA?</span>
          <h2 className="fs-section-title">
            ORA is Built to Fix That
          </h2>
          <p className="fs-section-sub">
            If you are losing after-hours visitors and tired of silent contact forms nobody fills out, ORA is your 24/7 autonomous sales and support voice agent.
          </p>
        </div>

        {/* Content Layout: Left ORA Acoustic Visualizer + Right 2x2 Clean Dashboard Cards */}
        <div className="fs-why-grid">
          {/* Left Column: Signature ORA Neural Voice Console */}
          <div className="fs-ora-visual-card">
            {/* Visualizer Header */}
            <div className="fs-ora-vis-top">
              <div className="flex items-center gap-2">
                <span className="fs-vis-pulse-dot" />
                <span className="text-xs font-mono font-bold tracking-wide">ORA NEURAL VOICE CORE</span>
              </div>
              <span className="fs-vis-badge">SUB-350MS</span>
            </div>

            {/* Central Animated Glowing ORA Orb with Acoustic Waves */}
            <div className="fs-ora-orb-stage">
              <div className="fs-ora-orb-core-wrap">
                {/* Concentric Sonic Rings */}
                <div className="fs-ora-ring ring-3" />
                <div className="fs-ora-ring ring-2" />
                <div className="fs-ora-ring ring-1" />
                
                {/* The Central Glowing Orb */}
                <div className="fs-ora-orb-sphere">
                  <Mic size={22} className="text-[#0E0F12] relative z-10" />
                  <div className="fs-ora-orb-glow" />
                </div>
              </div>

              {/* Dynamic Acoustic Equalizer Frequency Wave */}
              <div className="fs-spectrum-bars">
                {activeBars.map((h, i) => (
                  <span
                    key={i}
                    className="fs-spec-bar"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <div className="fs-spectrum-label">
                <Volume2 size={13} className="text-[#C8F031]" />
                <span>Streaming Bi-Directional Audio &middot; WebSocket 48kHz</span>
              </div>
            </div>

            {/* Scenario Switcher Tabs */}
            <div className="fs-scenario-tabs">
              {scenarios.map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveScenario(idx)}
                  className={`fs-scenario-tab ${activeScenario === idx ? 'active' : ''}`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {/* Live Verbal Dialogue Demonstration */}
            <div className="fs-vis-dialogue">
              <div className="fs-vis-bubble visitor">
                <span className="fs-vis-speaker">Visitor asks out loud:</span>
                <p className="fs-vis-text">{scenarios[activeScenario].query}</p>
              </div>

              <div className="fs-vis-bubble agent">
                <div className="flex items-center justify-between">
                  <span className="fs-vis-speaker agent">ORA responds in {scenarios[activeScenario].latency}:</span>
                  <span className="fs-vis-ground-tag">{scenarios[activeScenario].grounding}</span>
                </div>
                <p className="fs-vis-text agent">
                  {scenarios[activeScenario].response}
                </p>
              </div>
            </div>

            {/* Footer Status Indicators */}
            <div className="fs-vis-footer">
              <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-[#C8F031]" />
                <span>Zero Hallucinations</span>
              </div>
              <span>&middot;</span>
              <div>Deterministic Guard</div>
              <span>&middot;</span>
              <div>24/7 Autonomous</div>
            </div>
          </div>

          {/* Right Column: 2x2 Clean Dashboard Feature Cards */}
          <div className="fs-why-cards-grid">
            {/* Card 1 */}
            <div className="fs-clean-card">
              <div className="fs-clean-icon-wrap">
                <Clock size={16} />
              </div>
              <span className="fs-card-kicker">AUTOMATE INQUIRIES</span>
              <h3 className="fs-card-title">
                Save 15+ hours weekly on customer questions
              </h3>
              <p className="fs-card-desc">
                ORA handles repetitive pricing, scheduling, and policy questions autonomously without tiring or making errors.
              </p>
            </div>

            {/* Card 2 */}
            <div className="fs-clean-card">
              <div className="fs-clean-icon-wrap">
                <Code2 size={16} />
              </div>
              <span className="fs-card-kicker">NO-CODE DEPLOYMENT</span>
              <h3 className="fs-card-title">
                Train by talking: live in 2 minutes without coding
              </h3>
              <p className="fs-card-desc">
                Enter your website URL or speak your answers. ORA digests your business knowledge and catalogs automatically.
              </p>
            </div>

            {/* Card 3 */}
            <div className="fs-clean-card">
              <div className="fs-clean-icon-wrap">
                <Share2 size={16} />
              </div>
              <span className="fs-card-kicker">SEAMLESS INTEGRATION</span>
              <h3 className="fs-card-title">
                Connect with Shopify, WordPress, Webflow, and custom sites
              </h3>
              <p className="fs-card-desc">
                One-line script embed that runs asynchronously without impacting your site speed or Core Web Vitals.
              </p>
            </div>

            {/* Card 4 */}
            <div className="fs-clean-card">
              <div className="fs-clean-icon-wrap">
                <ShieldCheck size={16} />
              </div>
              <span className="fs-card-kicker">ENTERPRISE GROUNDING</span>
              <h3 className="fs-card-title">
                100% strictly grounded data with zero hallucinations
              </h3>
              <p className="fs-card-desc">
                ORA only quotes what is in your material. It never invents prices, policies, or claims not verified by you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
