'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CatalogProfile {
  id: string;
  name: string;
  short: string;
  note2: string;
  product: string;
  sku: string;
  price: string;
  question: string;
  answer: string;
  turn: string;
  source: string;
  note: string;
}

const CATALOG_PROFILES: CatalogProfile[] = [
  {
    id: 'fashion',
    name: 'Fashion & Apparel',
    short: 'Fashion',
    note2: 'Sizing, care, returns',
    product: 'Merino Crew Knit',
    sku: 'SKU-1180 · 4 left',
    price: '$125',
    question: 'Will this shrink if I machine wash it?',
    answer: 'Cold wash on wool cycle, dry flat. Machine drying shrinks it about one size.',
    turn: '284 ms turn',
    source: 'Answered from care guide',
    note: 'Added to cart',
  },
  {
    id: 'jewelry',
    name: 'Luxury & Jewelry',
    short: 'Jewelry',
    note2: 'Certificates and appraisal',
    product: '1.80ct Solitaire Lab Diamond',
    sku: 'SKU-LG59201 · IGI certified',
    price: '$2,850',
    question: 'Does it include the certificate and resizing?',
    answer: 'Yes. The IGI certificate ships with the piece, and resizing is free within 60 days.',
    turn: '301 ms turn',
    source: 'Answered from policy',
    note: 'Vault reserved',
  },
  {
    id: 'electronics',
    name: 'Consumer Electronics',
    short: 'Electronics',
    note2: 'Specs and compatibility',
    product: 'Studio ANC Headphones',
    sku: 'SKU-4420 · in stock',
    price: '$299',
    question: 'How long does the battery last with noise cancelling on?',
    answer: 'Thirty hours with ANC on, forty with it off. Ten minutes of charge gives five hours.',
    turn: '276 ms turn',
    source: 'Answered from spec sheet',
    note: 'Added to cart',
  },
  {
    id: 'home',
    name: 'Home & Furniture',
    short: 'Home',
    note2: 'Freight and lead times',
    product: 'Oak Dining Table, 6-seater',
    sku: 'SKU-OAK6S · made to order',
    price: '$890',
    question: 'Can you deliver to Seattle by Friday?',
    answer: 'Freight takes three to five business days, so yes. White-glove delivery is included.',
    turn: '298 ms turn',
    source: 'Answered from shipping matrix',
    note: 'Checkout link sent',
  },
  {
    id: 'outdoors',
    name: 'Sports & Outdoors',
    short: 'Outdoors',
    note2: 'Fit and field use',
    product: 'Alpine 45L Pack',
    sku: 'SKU-2260 · in stock',
    price: '$210',
    question: 'Is the frame adjustable for a shorter torso?',
    answer: 'Yes, the harness adjusts from 15 to 19 inches. The small frame fits down to 14.',
    turn: '289 ms turn',
    source: 'Answered from size chart',
    note: 'Added to cart',
  },
  {
    id: 'beauty',
    name: 'Beauty & Skincare',
    short: 'Beauty',
    note2: 'Ingredients and routines',
    product: '10% Niacinamide Serum',
    sku: 'SKU-3120 · in stock',
    price: '$48',
    question: 'Safe to layer with my evening retinol?',
    answer: 'Yes. Apply the serum first — niacinamide reinforces the barrier retinol dries out.',
    turn: '312 ms turn',
    source: 'Answered from formulary',
    note: 'Bundle added',
  },
];

const CYCLE_DURATION_MS = 2200;

export function Start2Verticals() {
  const [activeIdx, setActiveIdx] = useState(3); // Start on Home & Furniture matching reference
  const [displayedIdx, setDisplayedIdx] = useState(3);
  const [isFading, setIsFading] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Transition data with fade
  const switchTo = (nextIdx: number) => {
    if (nextIdx === activeIdx) return;
    setIsFading(true);
    setActiveIdx(nextIdx);
    setAnimKey((k) => k + 1);

    setTimeout(() => {
      setDisplayedIdx(nextIdx);
      setIsFading(false);
    }, 120);
  };

  // Automated step loop
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % CATALOG_PROFILES.length;
        setIsFading(true);
        setAnimKey((k) => k + 1);
        setTimeout(() => {
          setDisplayedIdx(next);
          setIsFading(false);
        }, 120);
        return next;
      });
    }, CYCLE_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIdx]);

  const handleStepClick = (idx: number) => {
    switchTo(idx);
  };

  return (
    <section
      className="s2-stepper-section"
      id="verticals"
      role="region"
      aria-label="Tuned to your catalogue"
      style={{ '--s2-stepper-duration': `${CYCLE_DURATION_MS}ms` } as React.CSSProperties}
    >
      <div className="s2-container">
        <div className="s2-stepper-wrap">

          {/* Header Block: Space Grotesk + Inter (No Newsreader) */}
          <div className="s2-stepper-head">
            <h2>Tuned to your catalogue</h2>
            {/* <p>Six profiles, each with its own voice and inventory rules.</p> */}
          </div>

          {/* Split Stepper Layout */}
          <div className="s2-stepper-split">
            {/* Left Steps Navigation */}
            <ul className="s2-stepper-list" role="tablist">
              {CATALOG_PROFILES.map((p, i) => {
                const isActive = i === activeIdx;
                return (
                  <li
                    key={p.id}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={0}
                    className={`s2-stepper-item ${isActive ? 'on' : ''}`}
                    onClick={() => handleStepClick(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleStepClick(i);
                      }
                    }}
                  >
                    <span
                      key={`${p.id}-${animKey}-${isActive}`}
                      className="s2-stepper-bar"
                    />
                    {p.name}
                    <em>{p.note2}</em>
                  </li>
                );
              })}
            </ul>

            {/* Right Live Interaction Card */}
            <div className="s2-stepper-card" role="tabpanel">
              {/* Every profile renders in the same grid cell; only the displayed one is
                  visible. The card keeps the height of the tallest profile, so the
                  section never changes height and the page below never moves. */}
              <div className="s2-stepper-stack">
                {CATALOG_PROFILES.map((profile, i) => {
                  const shown = i === displayedIdx;
                  const hideClass = shown && !isFading ? '' : 'out';
                  return (
                    <div
                      key={profile.id}
                      className={`s2-stepper-layer${shown ? '' : ' hidden-layer'}`}
                      aria-hidden={!shown}
                    >
                      {/* Card Top: Category name + turn latency */}
                      <div className="s2-stepper-ctop">
                        <b className={`s2-stepper-fade ${hideClass}`}>
                          {profile.name}
                        </b>
                        <span className={`s2-stepper-fade ${hideClass}`}>
                          {profile.turn}
                        </span>
                      </div>

                      {/* Product row: Title, SKU status, price */}
                      <div className="s2-stepper-prod">
                        <div>
                          <h3 className={`s2-stepper-fade ${hideClass}`}>
                            {profile.product}
                          </h3>
                          <div className={`s2-stepper-sku s2-stepper-fade ${hideClass}`}>
                            {profile.sku}
                          </div>
                        </div>
                        <b className={`s2-stepper-fade ${hideClass}`}>
                          {profile.price}
                        </b>
                      </div>

                      {/* QA dialogue */}
                      <div className="s2-stepper-qa">
                        <div className="s2-stepper-turn ask">
                          <span className="s2-stepper-who">Shopper</span>
                          <p className={`s2-stepper-fade ${hideClass}`}>
                            {profile.question}
                          </p>
                        </div>
                        <div className="s2-stepper-turn ora">
                          <span className="s2-stepper-who">ORA</span>
                          <p className={`s2-stepper-fade ${hideClass}`}>
                            {profile.answer}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer: citation source and live action outcome */}
                      <div className="s2-stepper-foot">
                        <span className={`s2-stepper-fade ${hideClass}`}>
                          {profile.source}
                        </span>
                        <b className={`s2-stepper-fade ${hideClass}`}>
                          {profile.note}
                        </b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
