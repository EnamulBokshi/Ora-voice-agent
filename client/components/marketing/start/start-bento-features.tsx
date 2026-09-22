'use client';

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Bot, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Tag, 
  Clock,
  ChevronRight
} from 'lucide-react';

export function StartBentoFeatures() {
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <section className="start-bento-section" id="features" aria-labelledby="start-bento-title">
      <div className="lp-container">
        {/* Section Heading */}
        <div className="start-section-header">
          <div className="start-badge">
            <Sparkles size={13} className="text-[#C8F031]" />
            <span>ENGINE ARCHITECTURE</span>
          </div>
          <h2 id="start-bento-title" className="start-section-title">
            Engineered for Revenue, <br className="hidden sm:inline" />
            Not Just Polite Conversation.
          </h2>
          <p className="start-section-sub">
            Most chatbots produce generic text summaries that shoppers ignore. 
            ORA is an active sales agent with direct access to your catalog, checkout engine, and inventory.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="start-bento-grid">
          {/* Card 1: Autonomous Cart Recovery Engine (Large Spanning Tile) */}
          <div className="start-bento-card start-bento-featured">
            <div className="start-bento-glow" aria-hidden="true" />
            <div className="start-bento-card-inner">
              <div className="start-bento-meta">
                <span className="start-bento-num">01 / PROACTIVE CONVERSION</span>
                <span className="start-bento-tag">
                  <span className="start-pulse-dot" />
                  Real-time Intervention
                </span>
              </div>

              <h3 className="start-bento-headline">
                Autonomous Cart Recovery Engine
              </h3>
              <p className="start-bento-desc">
                When a customer hesitates on a product page or sits idle in the cart drawer, ORA detects the drop-off pattern and initiates a polite, context-aware voice query to solve the objection before they bounce.
              </p>

              {/* Interactive Simulation Flow */}
              <div className="start-bento-flow-box">
                <div className="start-flow-header">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#C8F031]" />
                    <span className="text-xs font-mono text-[#FAFAFA]/70">TRIGGER: 32s Inactivity at Cart Drawer</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#C8F031] bg-[#C8F031]/10 px-2 py-0.5 rounded border border-[#C8F031]/20">
                    +34% Recovery Rate
                  </span>
                </div>

                <div className="start-flow-messages">
                  {/* Message 1: ORA Prompt */}
                  <div className="start-flow-msg ora">
                    <div className="start-msg-avatar ora">
                      <Bot size={13} />
                    </div>
                    <div className="start-msg-content">
                      <div className="start-msg-meta">ORA Sales Agent • 0.3s</div>
                      <p className="start-msg-bubble">
                        "Hey there! I noticed you are checking out the Merino Overshirt in Medium. Many customers ask—this cut runs slightly fitted. Would you like me to check chest measurements for you?"
                      </p>
                    </div>
                  </div>

                  {/* Message 2: Shopper Response */}
                  <div className="start-flow-msg user">
                    <div className="start-msg-avatar user">
                      <User size={13} />
                    </div>
                    <div className="start-msg-content">
                      <div className="start-msg-meta">Shopper Voice Input</div>
                      <p className="start-msg-bubble">
                        "Actually yes, I normally wear a 40 jacket. Should I size up to Large?"
                      </p>
                    </div>
                  </div>

                  {/* Message 3: Resolution & Action */}
                  <div className="start-flow-msg ora">
                    <div className="start-msg-avatar ora">
                      <Bot size={13} />
                    </div>
                    <div className="start-msg-content">
                      <div className="start-msg-meta">ORA Action Execution</div>
                      <p className="start-msg-bubble">
                        "For a 40 jacket, Large will give you the ideal layering drape. I have just updated your cart to Large in Charcoal and applied code <strong className="text-[#C8F031]">WELCOME10</strong> for 10% off. Ready to check out?"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Action Footer */}
                <div className="start-flow-footer">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#FAFAFA]/80">
                    <Tag size={13} className="text-[#C8F031]" />
                    <span>Cart updated: Merino Overshirt (Size L) • $135.00 (-$13.50)</span>
                  </div>
                  <div className="start-flow-btn">
                    <span>1-Click Checkout Session Ready</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Sub-350ms Latency Engine */}
          <div className="start-bento-card start-bento-speed">
            <div className="start-bento-card-inner">
              <div className="start-bento-meta">
                <span className="start-bento-num">02 / LATENCY BENCHMARK</span>
                <span className="start-bento-tag">Bi-directional WebSocket</span>
              </div>

              <h3 className="start-bento-headline">
                Sub-350ms Turnaround
              </h3>
              <p className="start-bento-desc">
                Human conversations happen in under 400ms. If an AI takes 2 seconds to answer, shoppers hang up. ORA uses streaming STT and direct audio synthesis for natural conversational rhythm.
              </p>

              {/* Latency Comparison Graph */}
              <div className="start-latency-bars">
                <div className="start-latency-row">
                  <div className="start-latency-info">
                    <span className="start-latency-name">Legacy Chatbots &amp; IVR</span>
                    <span className="start-latency-val">2,400ms</span>
                  </div>
                  <div className="start-latency-track">
                    <div className="start-latency-fill legacy" style={{ width: '92%' }} />
                  </div>
                  <span className="start-latency-caption text-[#EF4444]">Awkward delays, lost interest</span>
                </div>

                <div className="start-latency-row">
                  <div className="start-latency-info">
                    <span className="start-latency-name">Standard Cloud Voice AI</span>
                    <span className="start-latency-val">1,250ms</span>
                  </div>
                  <div className="start-latency-track">
                    <div className="start-latency-fill mid" style={{ width: '50%' }} />
                  </div>
                  <span className="start-latency-caption text-[#9CA3AF]">Noticeable audio lag</span>
                </div>

                <div className="start-latency-row highlighted">
                  <div className="start-latency-info">
                    <span className="start-latency-name font-bold text-[#FAFAFA]">ORA Streaming Engine</span>
                    <span className="start-latency-val text-[#C8F031] font-mono font-bold">310ms</span>
                  </div>
                  <div className="start-latency-track">
                    <div className="start-latency-fill ora" style={{ width: '14%' }} />
                  </div>
                  <span className="start-latency-caption text-[#C8F031] font-mono">Instant human response</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: 1-Click Direct Bag Modification */}
          <div className="start-bento-card start-bento-bag">
            <div className="start-bento-card-inner">
              <div className="start-bento-meta">
                <span className="start-bento-num">03 / MULTIMODAL ACTION</span>
                <span className="start-bento-tag">Dynamic Cart Sync</span>
              </div>

              <h3 className="start-bento-headline">
                1-Click Bag Modification
              </h3>
              <p className="start-bento-desc">
                ORA does not just say words; it executes storefront actions. It switches variant selections, applies active coupon rules, and prepares payment tokens.
              </p>

              {/* Cart Drawer Mock */}
              <div className="start-cart-mock">
                <div className="start-cart-header">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={15} className="text-[#C8F031]" />
                    <span className="text-xs font-semibold text-[#FAFAFA]">Active Shopper Cart</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#FAFAFA]/60">2 Items</span>
                </div>

                <div className="start-cart-item">
                  <div className="start-item-thumb" />
                  <div className="start-item-info">
                    <div className="start-item-title">Minimalist Leather Tote</div>
                    <div className="start-item-meta">Black / Full Grain • Qty: 1</div>
                  </div>
                  <div className="start-item-price">$180.00</div>
                </div>

                <div className="start-cart-action-badge">
                  <Sparkles size={13} className="text-[#C8F031]" />
                  <span>ORA added: Leather Care Wax (Bundle -20%)</span>
                </div>

                <div className="start-cart-total-row">
                  <span className="text-xs text-[#FAFAFA]/70">Subtotal with bundle discount:</span>
                  <span className="text-sm font-mono font-bold text-[#C8F031]">$196.00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Zero-Hallucination Catalog Sync */}
          <div className="start-bento-card start-bento-grounded">
            <div className="start-bento-card-inner">
              <div className="start-bento-meta">
                <span className="start-bento-num">04 / CATALOG GROUNDING</span>
                <span className="start-bento-tag">Zero Hallucinations</span>
              </div>

              <h3 className="start-bento-headline">
                Live Inventory & Policy Guard
              </h3>
              <p className="start-bento-desc">
                ORA will never promise free shipping if your threshold is $75, and will never sell out-of-stock items. It grounds every response in your live inventory database.
              </p>

              {/* Verification Checklist */}
              <div className="start-guard-list">
                <div className="start-guard-item">
                  <CheckCircle2 size={16} className="text-[#C8F031] shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[#FAFAFA]">Real-time Stock Checks</div>
                    <div className="text-[11px] text-[#FAFAFA]/60">Verifies warehouse quantities before recommending variants.</div>
                  </div>
                </div>

                <div className="start-guard-item">
                  <CheckCircle2 size={16} className="text-[#C8F031] shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[#FAFAFA]">Strict Price Guardrails</div>
                    <div className="text-[11px] text-[#FAFAFA]/60">Adheres strictly to merchant-configured discount codes and caps.</div>
                  </div>
                </div>

                <div className="start-guard-item">
                  <CheckCircle2 size={16} className="text-[#C8F031] shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[#FAFAFA]">Store Policy Compliance</div>
                    <div className="text-[11px] text-[#FAFAFA]/60">Answers returns, shipping, and warranty questions from your policy pages.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
