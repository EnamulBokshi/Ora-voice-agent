'use client';

import React from 'react';
import { Sparkles, MessageSquare, ShoppingBag, Globe, Share2, Layers } from 'lucide-react';

export function StartIntegrationSection() {
  return (
    <section className="fs-integration-section" id="integrations">
      <div className="fs-container">
        {/* Section Header */}
        <div className="fs-section-head text-center">
          <span className="fs-pill-badge">Integration</span>
          <h2 className="fs-section-title">
            Connect, Automate, and Scale
          </h2>

        </div>

        {/* Integration Hub Box */}
        <div className="fs-integration-hub-box">
          {/* Constellation Nodes Graphic */}
          <div className="fs-nodes-constellation">
            {/* Top Row Nodes */}
            <div className="fs-node-item node-left">
              <ShoppingBag size={18} className="text-gray-600 dark:text-gray-300" />
              <span>Shopify</span>
            </div>
            <div className="fs-node-item node-center-left">
              <Globe size={18} className="text-gray-600 dark:text-gray-300" />
              <span>WordPress</span>
            </div>

            {/* Central ORA Core Node */}
            <div className="fs-central-node">
              <div className="fs-central-core">
                <span className="fs-core-letter">O</span>
              </div>
            </div>

            <div className="fs-node-item node-center-right">
              <Layers size={18} className="text-gray-600 dark:text-gray-300" />
              <span>Webflow</span>
            </div>
            <div className="fs-node-item node-right">
              <Share2 size={18} className="text-gray-600 dark:text-gray-300" />
              <span>Stripe</span>
            </div>
          </div>

          {/* Testimonial Quote Card Placed Beneath Constellation */}
          <div className="fs-hub-quote-card">
            <p className="fs-hub-quote-text">
              &ldquo;ORA has transformed how we engage night visitors. Inquiries get answered in real-time
              with zero hallucinations, saving our team 15+ hours per week. The best voice AI tool we have used.&rdquo;
            </p>
            <div className="fs-hub-author">
              <div className="fs-hub-author-avatar">ER</div>
              <div className="fs-hub-author-info">
                <strong>Elena Rostova</strong>
                <span>Founder, Sonus Studio</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
