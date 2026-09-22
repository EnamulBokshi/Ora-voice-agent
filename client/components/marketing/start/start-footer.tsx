'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function StartFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="fs-footer">
      <div className="fs-container">
        {/* Top 5-Column Grid */}
        <div className="fs-footer-grid">
          {/* Column 1: About ORA */}
          <div className="fs-footer-col">
            <h4 className="fs-col-title">About ORA</h4>
            <p className="fs-footer-about-text">
              ORA is a powerful real-time voice AI sales and support agent designed to engage website visitors, 
              answer questions out loud, and capture qualified opportunities &mdash; all in one place.
            </p>
            <div className="fs-footer-brand">
              <span className="fs-logo-mark sm">O</span>
              <span className="fs-logo-text sm">ORA</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="fs-footer-col">
            <h4 className="fs-col-title">Quick Links</h4>
            <ul className="fs-footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#why-ora">About us</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#how-it-works">Capabilities</a></li>
              <li><a href="#integrations">Integrations</a></li>
            </ul>
          </div>

          {/* Column 3: Socials */}
          <div className="fs-footer-col">
            <h4 className="fs-col-title">Socials</h4>
            <ul className="fs-footer-links">
              <li><a href="https://x.com" target="_blank" rel="noopener noreferrer">X (Twitter)</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="fs-footer-col">
            <h4 className="fs-col-title">Contact</h4>
            <div className="fs-footer-contact-info">
              <p>support@tryora.live</p>
              <p>+1 (800) 555-0199</p>
              <p>San Francisco, CA &middot; London, UK</p>
            </div>
          </div>

          {/* Column 5: Stay Updated */}
          <div className="fs-footer-col">
            <h4 className="fs-col-title">Stay Updated</h4>
            <p className="fs-footer-sub-note">
              Receive our latest product updates to your inbox. No spam.
            </p>
            {subscribed ? (
              <p className="text-xs font-semibold text-[#16A34A] dark:text-[#C8F031] bg-[#16A34A]/10 dark:bg-[#C8F031]/15 p-2 rounded">
                Thank you for subscribing!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="fs-footer-form">
                <input
                  type="email"
                  placeholder="Enter your work email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fs-footer-input"
                  required
                />
                <button type="submit" className="fs-btn-dark sm w-full">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fs-footer-bottom">
          <span>&copy; {new Date().getFullYear()} ORA Technologies Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
