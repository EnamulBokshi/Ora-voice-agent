'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export function Start2Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="s2-footer">
      <div className="s2-container">
        <div className="s2-footer-grid">
          {/* Brand Col */}
          <div className="s2-footer-brand-col">
            <Link href="/start2" className="s2-nav-logo mb-3">
              <span className="s2-logo-mark">O</span>
              <span className="s2-logo-text">ORA</span>
            </Link>
            <p className="s2-footer-desc">
              Autonomous real-time voice agent engineered for website sales, after-hours lead conversion, and deterministic support.
            </p>
            <div className="s2-sys-status">
              <span className="s2-pulse-dot-green" />
              <span>All systems operational &middot; 99.99% SLA</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="s2-footer-links-col">
            <h4 className="s2-footer-title">Platform</h4>
            <ul className="s2-footer-list">
              <li><a href="#features">Voice Engine</a></li>
              <li><a href="#how-it-works">Storefront Embed</a></li>
              <li><a href="#capabilities">Integrations</a></li>
              <li><a href="#pricing">Pricing Plans</a></li>
              <li><a href="#demo-console">Live Telemetry</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="s2-footer-links-col">
            <h4 className="s2-footer-title">Company</h4>
            <ul className="s2-footer-list">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Security &amp; Privacy</a></li>
              <li><a href="#">Status Page</a></li>
              <li><a href="#">Contact Support</a></li>
              <li><a href="#">Documentation</a></li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div className="s2-footer-sub-col">
            <h4 className="s2-footer-title">Subscribe to newsletter</h4>
            <p className="s2-sub-desc">
              Get product updates, new voice archetypes, and conversion benchmarks delivered to your inbox.
            </p>

            {subscribed ? (
              <div className="s2-sub-success">
                <Check size={14} className="text-[#16A34A] dark:text-[#C8F031]" />
                <span>Thank you for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="s2-sub-form">
                <input
                  type="email"
                  placeholder="name@workemail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="s2-sub-input"
                  required
                />
                <button type="submit" className="s2-sub-btn" aria-label="Subscribe">
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="s2-footer-bottom">
          <div className="s2-social-strip">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer">Twitter / X</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>

          <div className="s2-legal-strip">
            <a href="#">Terms of use</a>
            <a href="#">Privacy policy</a>
            <a href="#">Security</a>
            <span>&copy; {new Date().getFullYear()} ORA Technologies Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
