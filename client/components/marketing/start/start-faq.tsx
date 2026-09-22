'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';

export function StartFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Will ORA hallucinate discounts or invent product specifications?',
      a: 'No. ORA operates under strict deterministic grounding. It only accesses your verified Shopify/WooCommerce catalog, real-time warehouse inventory, and explicit store policy files. If an item is out of stock or a customer asks for an unapproved discount, ORA politely clarifies your official rules without fabricating answers.',
    },
    {
      q: 'Does the voice widget slow down my storefront or hurt SEO?',
      a: 'Not at all. ORA uses an asynchronous, non-blocking script loader that weighs under 15 kB gzipped. It defers heavy audio stream initialization until a shopper actually interacts, meaning your Google Lighthouse scores, Core Web Vitals, and page speed remain 100% unaffected.',
    },
    {
      q: 'What happens if a shopper speaks with background noise or a regional accent?',
      a: 'ORA’s streaming audio pipeline includes neural noise suppression and multi-dialect acoustic modeling. It handles ambient room noise, cafe sounds, and diverse English and regional accents (including bilingual code-switching with Bangla and South Asian dialects) with near-zero transcription error.',
    },
    {
      q: 'How does the 14-day free trial work?',
      a: 'You get complete, unrestricted access to the ORA platform for 14 days—including real-time catalog syncing, unlimited voice conversations, and direct cart actions. No credit card is required to begin. If you choose not to subscribe, the widget pauses automatically with zero hidden fees.',
    },
    {
      q: 'Can ORA handle massive traffic spikes like Black Friday / Cyber Monday?',
      a: 'Yes. ORA is architected on distributed Redis session clusters and autoscaling streaming microservices. Whether you have 10 shoppers or 10,000 shoppers browsing simultaneously, every customer receives dedicated sub-350ms voice turnaround with zero queuing.',
    },
    {
      q: 'Can I review transcripts and attributed sales in my dashboard?',
      a: 'Yes. Every session is logged with full audio transcripts, detected customer objections, items added to bag, and coupon redemption data. You can see the exact dollar amount of revenue ORA recovered for your business in real time.',
    },
  ];

  return (
    <section className="start-faq-section" id="faq" aria-labelledby="start-faq-title">
      <div className="lp-container">
        {/* Section Heading */}
        <div className="start-section-header">
          <div className="start-badge">
            <HelpCircle size={13} className="text-[#C8F031]" />
            <span>CLARITY &amp; ASSURANCE</span>
          </div>
          <h2 id="start-faq-title" className="start-section-title">
            Frequently Asked Questions.
          </h2>
          <p className="start-section-sub">
            Clear answers to common questions about installation, latency, reliability, and security.
          </p>
        </div>

        {/* Accordion List */}
        <div className="start-faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className={`start-faq-item ${isOpen ? 'open' : ''}`}
              >
                <button
                  type="button"
                  className="start-faq-trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <span className="start-faq-q">{faq.q}</span>
                  <div className="start-faq-icon-wrap">
                    <ChevronDown 
                      size={18} 
                      className={`start-faq-chevron ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </button>
                {isOpen && (
                  <div className="start-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
