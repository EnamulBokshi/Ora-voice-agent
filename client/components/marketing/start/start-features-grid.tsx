'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

export function StartFeaturesGrid() {
  const features = [
    {
      title: 'AI-Powered Voice Turnaround',
      desc: 'Automate complex visitor questions with sub-350ms intelligent voice conversation.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="fs-wire-row">
            <span className="fs-wire-pill active">310ms Latency</span>
            <span className="fs-wire-pill">Neural Voice</span>
          </div>
          <div className="fs-wire-bars">
            <div className="fs-wire-bar" style={{ width: '40%' }} />
            <div className="fs-wire-bar active" style={{ width: '75%' }} />
            <div className="fs-wire-bar" style={{ width: '55%' }} />
          </div>
        </div>
      ),
    },
    {
      title: 'Real-Time Voice Analytics',
      desc: 'Monitor live visitor calls, track customer intents, and capture qualified leads.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="fs-wire-metric-row">
            <div>
              <span className="text-[10px] text-gray-400 block">Total Answered</span>
              <strong className="text-xs text-foreground">1,842 calls</strong>
            </div>
            <span className="text-[10px] font-semibold text-[#16A34A] dark:text-[#C8F031] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">
              +38% conv
            </span>
          </div>
          <div className="fs-wire-chart-line" />
        </div>
      ),
    },
    {
      title: 'Multi-Sector Workflows',
      desc: 'Seamlessly connects tailored playbooks for clinics, agencies, shops, and consultancies.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="flex gap-1.5 flex-wrap">
            <span className="fs-wire-chip">Healthcare</span>
            <span className="fs-wire-chip active">Agency</span>
            <span className="fs-wire-chip">Retail</span>
          </div>
          <div className="fs-wire-subtext">Playbook: Service Retainer Intake</div>
        </div>
      ),
    },
    {
      title: 'Strict Grounding Guard',
      desc: 'Zero hallucinations. ORA only answers from your verified website pages and documents.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="flex items-center gap-1.5 text-xs text-foreground bg-accent p-1.5 rounded">
            <ShieldCheck size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
            <span className="text-[11px] font-medium">100% Policy Grounded</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Real-time database validation</div>
        </div>
      ),
    },
    {
      title: '1-Click Direct Actions',
      desc: 'Generate instant booking slots, checkout cart links, and calendar invites right in voice.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="flex justify-between items-center text-[11px] bg-accent p-1.5 rounded">
            <span>Consultation Reservation</span>
            <span className="font-bold text-foreground">$45.00</span>
          </div>
          <div className="fs-wire-action-btn">Direct Token Ready</div>
        </div>
      ),
    },
    {
      title: 'Lightning-Fast Execution',
      desc: 'Experience natural conversational pauses and interruption handling without awkward delays.',
      mock: (
        <div className="fs-card-mock-wire">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-muted-foreground">Turnaround</span>
            <span className="text-xs font-mono font-bold text-[#16A34A] dark:text-[#C8F031]">310ms</span>
          </div>
          <div className="fs-wire-progress-track">
            <div className="fs-wire-progress-fill" style={{ width: '85%' }} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="fs-features-section" id="features">
      <div className="fs-container">
        {/* Header */}
        <div className="fs-section-head text-center">
          <span className="fs-pill-badge">Features</span>
          <h2 className="fs-section-title">
            Features That Set us Apart
          </h2>
          <p className="fs-section-sub">
            ORA goes beyond basic automation — our real-time streaming voice engine, seamless grounding, 
            and enterprise security make customer engagement effortless.
          </p>

          <div className="fs-features-btn-row">
            <Link href="/auth" className="fs-btn-dark sm">
              Talk to expert
            </Link>
            <a href="#how-it-works" className="fs-btn-ghost sm">
              Explore all features
            </a>
          </div>
        </div>

        {/* 3x2 Cards Grid */}
        <div className="fs-features-grid">
          {features.map((feat, idx) => (
            <div className="fs-feature-card" key={idx}>
              <h3 className="fs-feat-title">{feat.title}</h3>
              <p className="fs-feat-desc">{feat.desc}</p>
              
              <div className="fs-feat-link-row">
                <span className="fs-feat-link">
                  Learn more <ArrowUpRight size={13} />
                </span>
              </div>

              {/* Wireframe Mockup */}
              <div className="fs-feat-mock-container">
                {feat.mock}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
