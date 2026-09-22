'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, ShieldCheck, MessageCircle, Globe2, Radio, Check } from 'lucide-react';

export function StartSplitFeature() {
  return (
    <section className="fs-split-section" id="why-ora">
      <div className="fs-container">
        <div className="fs-split-grid">
          {/* Left Column: Copy & Actions */}
          <div className="fs-split-left">
            <span className="fs-pill-badge">About ORA</span>
            <h2 className="fs-split-title">
              AI-Driven Voice Agent <br />
              Designed for Any Business
            </h2>
            <p className="fs-split-desc">
              All in one place! Whether you are a healthcare clinic, an agency, an e-commerce brand, 
              or a professional consultancy, ORA engages visitors, answers questions in natural voice, 
              and captures opportunities without human overhead.
            </p>

            <div className="fs-split-actions">
              <Link href="/auth" className="fs-btn-dark">
                How it works
              </Link>
              <a href="#features" className="fs-btn-ghost">
                Learn more
              </a>
            </div>
          </div>

          {/* Right Column: Interactive ORA Voice Pipeline Console */}
          <div className="fs-split-right">
            <div className="fs-pipeline-card">
              <div className="fs-pipe-header">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-[#C8F031]" />
                  <span className="text-xs font-mono font-semibold">ORA Streaming Architecture</span>
                </div>
                <span className="fs-pipe-tag">Sub-350ms Pipeline</span>
              </div>

              {/* 3 Pipeline Stages */}
              <div className="fs-pipe-stages">
                <div className="fs-stage-item">
                  <div className="fs-stage-dot active" />
                  <div className="fs-stage-info">
                    <span className="fs-stage-name">01 &middot; Streaming STT Audio Ingestion</span>
                    <span className="fs-stage-latency">75ms</span>
                  </div>
                </div>

                <div className="fs-stage-item">
                  <div className="fs-stage-dot active" />
                  <div className="fs-stage-info">
                    <span className="fs-stage-name">02 &middot; Deterministic Grounding &amp; Policy Guard</span>
                    <span className="fs-stage-latency">110ms</span>
                  </div>
                </div>

                <div className="fs-stage-item">
                  <div className="fs-stage-dot active" />
                  <div className="fs-stage-info">
                    <span className="fs-stage-name">03 &middot; Neural Speech Synthesis &amp; Interruption</span>
                    <span className="fs-stage-latency">125ms</span>
                  </div>
                </div>
              </div>

              {/* Stacked Metric Chips */}
              <div className="fs-pipe-chips-grid">
                <div className="fs-pipe-chip">
                  <Zap size={14} className="text-[#C8F031]" />
                  <span>Sub-350ms Speed</span>
                </div>
                <div className="fs-pipe-chip">
                  <ShieldCheck size={14} className="text-[#C8F031]" />
                  <span>100% Grounded</span>
                </div>
                <div className="fs-pipe-chip">
                  <MessageCircle size={14} className="text-[#C8F031]" />
                  <span>96% Resolution</span>
                </div>
                <div className="fs-pipe-chip">
                  <Globe2 size={14} className="text-[#C8F031]" />
                  <span>24/7 Coverage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
