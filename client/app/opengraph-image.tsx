import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ORA | The AI Sales Brain for Every Merchant';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #090A09 0%, #111410 50%, #060706 100%)',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow Accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(200,240,49,0.18) 0%, rgba(0,0,0,0) 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Top bar: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#C8F031',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#111111',
                fontWeight: 900,
                fontSize: '24px',
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: '#FAFAFA' }}>
              ORA
            </span>
          </div>

          <div
            style={{
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(200,240,49,0.12)',
              border: '1px solid rgba(200,240,49,0.3)',
              color: '#C8F031',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Live Voice AI • v2.0
          </div>
        </div>

        {/* Center: Main Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', zIndex: 1, maxWidth: '960px' }}>
          <h1
            style={{
              fontSize: '60px',
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              margin: 0,
              background: 'linear-gradient(180deg, #FFFFFF 30%, #A0A5A0 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            The AI sales brain for every merchant.
          </h1>
          <p
            style={{
              fontSize: '24px',
              lineHeight: 1.4,
              color: '#9CA3AF',
              margin: 0,
              maxWidth: '820px',
            }}
          >
            Real-time voice selling, instant catalog intelligence, abandoned cart recovery, and native automated checkout.
          </p>
        </div>

        {/* Bottom bar: Feature chips & Domain */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '28px',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#1A1E1A',
                border: '1px solid #2A302A',
                fontSize: '15px',
                color: '#E5E7EB',
                fontWeight: 600,
              }}
            >
              Shopify & WooCommerce
            </span>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#1A1E1A',
                border: '1px solid #2A302A',
                fontSize: '15px',
                color: '#E5E7EB',
                fontWeight: 600,
              }}
            >
              Sub-350ms Voice
            </span>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#1A1E1A',
                border: '1px solid #2A302A',
                fontSize: '15px',
                color: '#E5E7EB',
                fontWeight: 600,
              }}
            >
              Stripe & bKash Checkout
            </span>
          </div>

          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#C8F031',
              letterSpacing: '0.02em',
            }}
          >
            tryora.live
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
