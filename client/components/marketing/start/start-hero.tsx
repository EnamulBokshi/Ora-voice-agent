'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Play, 
  Pause, 
  Search, 
  Plus, 
  Bell, 
  ArrowUpRight, 
  CheckCircle2, 
  Users, 
  Activity, 
  MessageSquare,
  Sparkles,
  Volume2
} from 'lucide-react';

export function StartHero() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRow, setActiveRow] = useState(0);

  const sampleCalls = [
    {
      company: 'Aurora Wellness Clinic',
      category: 'Healthcare',
      question: 'Do you take appointments on Saturday, and what does a consultation cost?',
      answer: 'Saturdays 9 AM to 1 PM. Consultation is $45, credited to your treatment.',
      status: 'Answered · 310ms',
      badgeClass: 'lime',
    },
    {
      company: 'Studio Form Agency',
      category: 'Design & Dev',
      question: 'Do you offer monthly retainers or fixed scope sprints?',
      answer: 'Both. Retainers start at $3,500/mo, and design sprints run 2 to 4 weeks.',
      status: 'Qualified · 295ms',
      badgeClass: 'neutral',
    },
    {
      company: 'Knitwear Atelier',
      category: 'E-Commerce',
      question: 'Does the merino overshirt run true to size in chest measurement?',
      answer: 'It has a tailored cut. For a relaxed fit, we recommend ordering one size up.',
      status: 'Cart Updated · 320ms',
      badgeClass: 'lime',
    },
  ];

  return (
    <section className="fs-hero-section">
      <div className="fs-container">
        {/* Hero Head */}
        <div className="fs-hero-content">
          <h1 className="fs-hero-title">
            Your ultimate solution for <br />
            website Voice AI
          </h1>
          <p className="fs-hero-sub">
            ORA engages visitors in natural sub-350ms conversations, answers questions from your material only, 
            and captures leads 24/7 so you never miss an after-hours opportunity.
          </p>

          <div className="fs-hero-cta-group">
            <Link href="/auth" className="fs-btn-dark">
              Start 14-Day Free Trial
            </Link>
            <a href="#demo-preview" className="fs-btn-ghost">
              Hear Live Demo
            </a>
          </div>
        </div>

        {/* Floating App Dashboard Mockup */}
        <div className="fs-dashboard-container" id="demo-preview">
          <div className="fs-dashboard-window">
            {/* Window Top Navigation Bar */}
            <div className="fs-dash-topbar">
              <div className="fs-dash-logo">
                <span className="fs-dash-dot" />
                <span className="font-semibold text-xs fs-dash-brand-title">ORA Command Center</span>
              </div>

              <div className="fs-dash-search">
                <Search size={13} className="text-gray-400" />
                <span>Search visitor inquiries, knowledge base...</span>
              </div>

              <div className="fs-dash-user-actions">
                <button type="button" className="fs-dash-icon-btn" aria-label="Notifications">
                  <Bell size={14} />
                </button>
                <div className="fs-dash-btn-primary">
                  <Plus size={13} />
                  <span>Connect Website</span>
                </div>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="fs-dash-workspace">
              {/* Left Mini-Sidebar */}
              <div className="fs-dash-sidebar">
                <div className="fs-sidebar-item active">
                  <Activity size={14} />
                  <span>Overview</span>
                </div>
                <div className="fs-sidebar-item">
                  <MessageSquare size={14} />
                  <span>Conversations</span>
                </div>
                <div className="fs-sidebar-item">
                  <Users size={14} />
                  <span>Leads</span>
                </div>
                <div className="fs-sidebar-item">
                  <Sparkles size={14} />
                  <span>Knowledge</span>
                </div>
              </div>

              {/* Main App Content Area */}
              <div className="fs-dash-main">
                {/* 3 Metric Cards */}
                <div className="fs-metrics-grid">
                  <div className="fs-metric-card">
                    <span className="fs-metric-label">Total Inquiries</span>
                    <div className="fs-metric-value-row">
                      <span className="fs-metric-val">2,420</span>
                      <span className="fs-metric-tag green">
                        <ArrowUpRight size={11} />
                        24%
                      </span>
                    </div>
                  </div>

                  <div className="fs-metric-card">
                    <span className="fs-metric-label">Voice Resolution</span>
                    <div className="fs-metric-value-row">
                      <span className="fs-metric-val">96.4%</span>
                      <span className="fs-metric-tag lime">Sub-350ms</span>
                    </div>
                  </div>

                  <div className="fs-metric-card">
                    <span className="fs-metric-label">Active Visitors Handled</span>
                    <div className="fs-metric-value-row">
                      <span className="fs-metric-val">316</span>
                      <span className="fs-metric-tag live">
                        <span className="fs-pulse-dot" />
                        Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* Central Audio / Video Play Overlay */}
                <div className="fs-audio-center-banner">
                  <button
                    type="button"
                    className="fs-center-play-btn"
                    onClick={() => setIsPlaying(!isPlaying)}
                    aria-label={isPlaying ? 'Pause conversation audio' : 'Play conversation audio'}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                  </button>
                  <div className="fs-audio-meta">
                    <span className="fs-audio-title">Sample Voice Session • Sub-350ms Turnaround</span>
                    <span className="fs-audio-sub">Click to hear ORA answer a real patient query without delay</span>
                  </div>
                </div>

                {/* Table View of Active Live Sessions */}
                <div className="fs-table-wrap">
                  <div className="fs-table-header">
                    <span>Business Domain</span>
                    <span>Visitor Question &amp; ORA Voice Resolution</span>
                    <span>Status</span>
                  </div>

                  {sampleCalls.map((call, idx) => (
                    <div 
                      key={idx} 
                      className={`fs-table-row ${activeRow === idx ? 'selected' : ''}`}
                      onClick={() => setActiveRow(idx)}
                    >
                      <div className="fs-table-domain">
                        <strong className="fs-domain-name">{call.company}</strong>
                        <span className="fs-domain-cat">{call.category}</span>
                      </div>

                      <div className="fs-table-dialogue">
                        <div className="fs-table-q">&ldquo;{call.question}&rdquo;</div>
                        <div className="fs-table-a">
                          <Volume2 size={12} className="text-[#C8F031] shrink-0" />
                          <span>&ldquo;{call.answer}&rdquo;</span>
                        </div>
                      </div>

                      <div className="fs-table-status">
                        <span className={`fs-status-chip ${call.badgeClass}`}>
                          <CheckCircle2 size={11} />
                          {call.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="fs-trust-wrap">
          <p className="fs-trust-caption">
            Trusted by Visionaries, Embraced by leading businesses Worldwide
          </p>
          <div className="fs-trust-logos">
            <span className="fs-logo-partner">Shopify</span>
            <span className="fs-logo-partner">WooCommerce</span>
            <span className="fs-logo-partner">WordPress</span>
            <span className="fs-logo-partner">Webflow</span>
            <span className="fs-logo-partner">Stripe</span>
          </div>
        </div>
      </div>
    </section>
  );
}
