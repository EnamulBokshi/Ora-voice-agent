'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shirt, 
  Headphones, 
  Armchair, 
  Pipette, 
  Mountain, 
  Watch, 
  CheckCircle2
} from 'lucide-react';

interface StoreProfile {
  id: string;
  name: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  channel: string;
  sku: string;
  product: string;
  price: string;
  stockStatus: string;
  stockCount: string;
  shopperQuery: string;
  oraVoiceResponse: string;
  actionTitle: string;
  actionDetail: string;
  actionAmount: string;
  impactMetric: string;
  impactLabel: string;
  posX: number;
  posY: number;
}

const STORE_PROFILES: StoreProfile[] = [
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    shortLabel: 'Apparel',
    icon: Shirt,
    channel: 'nordicapparel.store',
    sku: 'SKU-8821 · Outerwear',
    product: 'Merino Wool Overcoat',
    price: '$340.00',
    stockStatus: 'Low Stock',
    stockCount: '3 units left in Size L (Camel)',
    shopperQuery: '“Does this run true to size, and what is the lining?”',
    oraVoiceResponse: '“Tailored cut with 100% cupro lining. For knitwear layering, size up to L. Pre-filled checkout link ready.”',
    actionTitle: 'Cart Link Dispatched',
    actionDetail: 'Size L · Camel · 1-Click Checkout Token',
    actionAmount: '$340.00',
    impactMetric: '+31%',
    impactLabel: 'Cart Completion Lift',
    posX: 50,
    posY: 18,
  },
  {
    id: 'electronics',
    name: 'Consumer Electronics',
    shortLabel: 'Electronics',
    icon: Headphones,
    channel: 'lumina-audio.com',
    sku: 'SKU-4409 · Hi-Fi Components',
    product: 'Balanced Hi-Fi DAC Amp',
    price: '$280.00',
    stockStatus: 'In Stock',
    stockCount: '18 units in warehouse',
    shopperQuery: '“Works with iPhone 15 USB-C and 4.4mm balanced output?”',
    oraVoiceResponse: '“Yes. Includes certified MFi lossless Type-C cable and native 4.4mm Pentaconn balanced port.”',
    actionTitle: 'Spec Verified & Applied',
    actionDetail: 'Includes 4.4mm Adapter · Free Courier',
    actionAmount: '$280.00',
    impactMetric: '3.4x',
    impactLabel: 'Faster Tech Inquiry Resolution',
    posX: 80,
    posY: 34,
  },
  {
    id: 'home',
    name: 'Home & Furniture',
    shortLabel: 'Furniture',
    icon: Armchair,
    channel: 'atelier-workstations.com',
    sku: 'SKU-1290 · Studio Furniture',
    product: 'Solid Oak Workstation (60")',
    price: '$1,150.00',
    stockStatus: 'Freight Ready',
    stockCount: 'White-glove courier available',
    shopperQuery: '“Clearance under drawer and delivery timeline to Denver?”',
    oraVoiceResponse: '“28.5" under-desk clearance fits executive armchairs. Freight arrives in Denver by Thursday.”',
    actionTitle: 'Freight Slot Reserved',
    actionDetail: 'White-Glove Delivery · Thursday Window',
    actionAmount: '$1,150.00',
    impactMetric: '+24%',
    impactLabel: 'Freight Order Conversion',
    posX: 80,
    posY: 66,
  },
  {
    id: 'beauty',
    name: 'Beauty & Skincare',
    shortLabel: 'Skincare',
    icon: Pipette,
    channel: 'botanical-skin.com',
    sku: 'SKU-3120 · Clinical Serums',
    product: '10% Niacinamide Serum (50ml)',
    price: '$48.00',
    stockStatus: 'In Stock',
    stockCount: 'Clinical formula verified',
    shopperQuery: '“Safe to layer with my evening retinol treatment?”',
    oraVoiceResponse: '“Yes. Niacinamide reinforces the lipid barrier to mitigate retinol dryness. Apply serum first.”',
    actionTitle: 'Regimen Bundle Added',
    actionDetail: 'Barrier Serum + Night Emulsion',
    actionAmount: '$82.00',
    impactMetric: '+28%',
    impactLabel: 'Routine Bundle Order Lift',
    posX: 50,
    posY: 82,
  },
  {
    id: 'outdoor',
    name: 'Sports & Outdoors',
    shortLabel: 'Outdoors',
    icon: Mountain,
    channel: 'summit-gear.co',
    sku: 'SKU-6781 · Mountaineering',
    product: 'Alpine 4-Season Geodesic Tent',
    price: '$620.00',
    stockStatus: 'Verified Spec',
    stockCount: '7001-T6 aluminum architecture',
    shopperQuery: '“Rated for 4-season Cascade winter snow loads and wind?”',
    oraVoiceResponse: '“Geodesic cross-pole design is certified for 50-knot gusts and heavy snow pack. Spec texted to you.”',
    actionTitle: 'Expedition Spec Sent',
    actionDetail: 'Winter Certification Verified · Cart Staged',
    actionAmount: '$620.00',
    impactMetric: '2.8x',
    impactLabel: 'High-Ticket Close Rate',
    posX: 20,
    posY: 66,
  },
  {
    id: 'luxury',
    name: 'Luxury & Jewelry',
    shortLabel: 'Jewelry',
    icon: Watch,
    channel: 'atelier-finejewelry.com',
    sku: 'SKU-9904 · Fine Solitaires',
    product: '1.80ct Oval Solitaire Diamond Ring',
    price: '$2,850.00',
    stockStatus: 'Vault Certified',
    stockCount: 'IGI Report #LG59201',
    shopperQuery: '“Includes verifiable IGI grading report and complimentary resizing?”',
    oraVoiceResponse: '“Yes. Includes verifiable IGI digital dossier and complimentary resizing within 60 days of delivery.”',
    actionTitle: 'Vault Hold Initiated',
    actionDetail: 'IGI #LG59201 Attached · Size 6.5 Held',
    actionAmount: '$2,850.00',
    impactMetric: '+38%',
    impactLabel: 'High-Trust Checkout Lift',
    posX: 20,
    posY: 34,
  },
];

export function Start2Verticals() {
  const [activeId, setActiveId] = useState<string>('fashion');
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(true);

  // Subtle auto-cycling across catalog profiles unless paused by user interaction
  useEffect(() => {
    if (!isAutoCycling) return;
    const timer = setInterval(() => {
      setActiveId((prev) => {
        const currIdx = STORE_PROFILES.findIndex((p) => p.id === prev);
        const nextIdx = (currIdx + 1) % STORE_PROFILES.length;
        return STORE_PROFILES[nextIdx].id;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [isAutoCycling]);

  const activeProfile = STORE_PROFILES.find((p) => p.id === activeId) || STORE_PROFILES[0];
  const ActiveIcon = activeProfile.icon;

  // Center coordinate of tree hub in 500x400 SVG space
  const centerX = 250;
  const centerY = 200;
  const hubRadius = 28;

  return (
    <section className="s2-verticals-section" id="verticals" role="region" aria-label="E-Commerce catalog intelligence tree">
      <div className="s2-container">
        
        {/* Section Header: Pure Sentence Case, Zero Eyebrows */}
        <div className="s2-section-head text-center">
          <h2 className="s2-section-title">
            Engineered for your store&apos;s catalog
          </h2>
          <p className="s2-section-sub">
            Six catalog profiles. Each with its own voice persona and live inventory logic.
          </p>
        </div>

        {/* Unified Two-Column Workbench: Left Tree Network + Right Live Store Session Card */}
        <div className="s2-tree-workbench">
          
          {/* =================================================================
              LEFT: Fixed Geometry Connection Tree Canvas (work_connections.png)
             ================================================================= */}
          <div className="s2-tree-canvas-panel">
            <div className="s2-tree-viewport">
              
              {/* SVG Connecting Branches & Perspective Orbits (Fixed 500x400 geometry) */}
              <svg 
                className="s2-tree-svg" 
                viewBox="0 0 500 400" 
                preserveAspectRatio="none"
                fill="none"
              >
                <defs>
                  {/* Soft ambient glow filter */}
                  <filter id="s2-branch-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Fixed Perspective Orbit Ring Outer */}
                <ellipse 
                  cx={centerX} 
                  cy={centerY} 
                  rx="180" 
                  ry="125" 
                  className="s2-orbit-ring s2-orbit-outer"
                  strokeWidth="1.2" 
                  strokeDasharray="4 4" 
                />

                {/* Fixed Perspective Orbit Ring Inner */}
                <ellipse 
                  cx={centerX} 
                  cy={centerY} 
                  rx="120" 
                  ry="82" 
                  className="s2-orbit-ring s2-orbit-inner"
                  strokeWidth="1" 
                  strokeDasharray="3 3" 
                />

                {/* 6 Fixed Radial Connector Rays from Hub Perimeter to Node Endpoints (ALL VISIBLE ALL THE TIME) */}
                {STORE_PROFILES.map((p) => {
                  const targetX = (p.posX / 100) * 500;
                  const targetY = (p.posY / 100) * 400;
                  const dx = targetX - centerX;
                  const dy = targetY - centerY;
                  const dist = Math.hypot(dx, dy) || 1;
                  
                  // Origin point strictly anchored at outer edge of ORA center sphere (r=28)
                  const startX = centerX + (dx / dist) * hubRadius;
                  const startY = centerY + (dy / dist) * hubRadius;
                  
                  const isActive = p.id === activeId;

                  return (
                    <g key={p.id} className={`s2-branch-group ${isActive ? 'active' : ''}`}>
                      {/* Fixed Connector Ray Line — Always visible, solid, and fixed */}
                      <line 
                        x1={startX} 
                        y1={startY} 
                        x2={targetX} 
                        y2={targetY} 
                        className={isActive ? 's2-branch-line-active' : 's2-branch-line-muted'}
                      />

                      {/* Port Anchor Node on ORA Hub Perimeter */}
                      <circle 
                        cx={startX} 
                        cy={startY} 
                        r={isActive ? 3.5 : 2.5} 
                        className={isActive ? 's2-branch-hub-dot-active' : 's2-branch-hub-dot-muted'}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Central Glowing ORA Hub (work_connections.png & one_agent.png) */}
              <div className="s2-tree-center-hub" title="ORA Catalog Brain">
                <div className="s2-hub-ambient-aura" />
                <div className="s2-hub-core-circle">
                  <span className="s2-hub-ora-text">ORA</span>
                </div>
              </div>

              {/* 6 Fixed Interactive Profile Node Pills */}
              {STORE_PROFILES.map((p) => {
                const NodeIcon = p.icon;
                const isActive = p.id === activeId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveId(p.id);
                      setIsAutoCycling(false);
                    }}
                    className={`s2-tree-node-pill ${isActive ? 'active' : ''}`}
                    style={{
                      left: `${p.posX}%`,
                      top: `${p.posY}%`,
                    }}
                    aria-label={`Inspect ${p.name}`}
                    aria-pressed={isActive}
                  >
                    <div className="s2-node-icon-box">
                      <NodeIcon size={13} />
                    </div>
                    <span className="s2-node-pill-label">{p.name}</span>
                  </button>
                );
              })}

            </div>
          </div>

          {/* =================================================================
              RIGHT: Industry-Standard Live Storefront Session Sheet
              Crafted per /impeccable: Zero nested card clutter, high typography hierarchy
             ================================================================= */}
          <div className="s2-session-sheet">
            
            {/* Sheet Header: Channel Telemetry & Real-Time Audio Indicator */}
            <div className="s2-session-header">
              <div className="s2-channel-meta">
                <div className="s2-channel-badge">
                  <ActiveIcon size={14} />
                </div>
                <div className="s2-channel-info">
                  <span className="s2-channel-name">{activeProfile.name}</span>
                  <span className="s2-channel-url">{activeProfile.channel}</span>
                </div>
              </div>

              <div className="s2-session-stream-chip">
                <div className="s2-audio-bars">
                  <span className="s2-hbar bar-1" />
                  <span className="s2-hbar bar-2" />
                  <span className="s2-hbar bar-3" />
                  <span className="s2-hbar bar-4" />
                </div>
                <span className="s2-stream-label">48kHz Duplex</span>
              </div>
            </div>

            {/* Product Focus & Live Inventory Ledger */}
            <div className="s2-session-product-row">
              <div className="s2-product-main">
                <div className="s2-sku-meta-line">
                  <span className="s2-sku-tag">{activeProfile.sku}</span>
                  <span className="s2-stock-status-pill">{activeProfile.stockStatus}</span>
                </div>
                <h3 className="s2-product-name">{activeProfile.product}</h3>
              </div>
              <div className="s2-product-pricing">
                <span className="s2-price-tag">{activeProfile.price}</span>
                <span className="s2-stock-detail">{activeProfile.stockCount}</span>
              </div>
            </div>

            {/* Authentic Conversation Transcript Stream */}
            <div className="s2-session-transcript">
              
              {/* Customer Turn */}
              <div className="s2-turn shopper-turn">
                <div className="s2-turn-header">
                  <span className="s2-turn-role">Customer Inquiry</span>
                  <span className="s2-turn-time">0:04</span>
                </div>
                <p className="s2-turn-bubble">{activeProfile.shopperQuery}</p>
              </div>

              {/* ORA Voice Turn */}
              <div className="s2-turn agent-turn">
                <div className="s2-turn-header">
                  <span className="s2-turn-role agent-role">ORA Voice Response</span>
                  <span className="s2-turn-latency">312ms turnaround</span>
                </div>
                <p className="s2-turn-bubble agent-bubble">{activeProfile.oraVoiceResponse}</p>
              </div>

            </div>

            {/* Real Storefront Action Execution Dock (built_for_conversation.png) */}
            <div className="s2-session-action-dock">
              <div className="s2-action-left">
                <div className="s2-action-badge">
                  <CheckCircle2 size={13} className="s2-action-check-icon" />
                  <span>{activeProfile.actionTitle}</span>
                </div>
                <span className="s2-action-summary">{activeProfile.actionDetail}</span>
              </div>
              <div className="s2-action-right">
                <span className="s2-action-amt-label">Order Intent</span>
                <span className="s2-action-amt">{activeProfile.actionAmount}</span>
              </div>
            </div>

            {/* Bottom Verified Impact Metric & Catalog Synchronization Ledger */}
            <div className="s2-session-footer">
              <div className="s2-footer-metric">
                <span className="s2-impact-val">{activeProfile.impactMetric}</span>
                <span className="s2-impact-label">{activeProfile.impactLabel}</span>
              </div>
              <div className="s2-footer-sync">
                <span className="s2-sync-beacon" />
                <span className="s2-sync-text">Store Catalog Synchronized</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
