import Link from 'next/link';

const footerLinks = {
  Product: ['Features', 'Solutions', 'Pricing', 'Changelog'],
  Resources: ['Docs', 'Guides', 'Blog', 'Help Center'],
  Company: ['About', 'Careers', 'Privacy', 'Terms'],
};

export function MarketingFooter() {
  return (
    <footer className="lp-footer" role="contentinfo">
      <div
        className="lp-container"
        style={{
          paddingTop: '5rem',
          paddingBottom: '2.5rem',
        }}
      >
        {/* Top grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '3rem',
            marginBottom: '4rem',
          }}
        >
          {/* Brand col */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link
              href="/"
              aria-label="ORA — Home"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--lp-font-display)',
                fontWeight: 700,
                fontSize: '1.0625rem',
                letterSpacing: '-0.02em',
                color: 'var(--lp-text-primary)',
                textDecoration: 'none',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  background: 'var(--lp-dark)',
                  borderRadius: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14l-4-6h3V6h2v4h3l-4 6z" />
                </svg>
              </div>
              ORA
            </Link>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--lp-text-secondary)',
                lineHeight: 1.65,
                marginBottom: '1.5rem',
                maxWidth: '16rem',
              }}
            >
              The AI sales brain for every merchant. Automate. Recover. Accelerate.
            </p>
            {/* Social icons */}
            <div style={{ display: 'flex', gap: '1rem' }} aria-label="Social media links">
              {[
                {
                  label: 'Twitter',
                  href: '#',
                  svg: <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />,
                },
                {
                  label: 'GitHub',
                  href: '#',
                  svg: <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />,
                },
                {
                  label: 'LinkedIn',
                  href: '#',
                  svg: <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />,
                },
              ].map(({ label, href, svg }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="lp-social-icon"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {svg}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4
                style={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: 'var(--lp-text-primary)',
                  marginBottom: '1.25rem',
                }}
              >
                {heading}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {links.map((link) => {
                  let href = '#';
                  if (link === 'Docs') href = '/docs';
                  else if (link === 'Guides') href = '/docs#quickstart';
                  else if (link === 'Pricing') href = '/pricing';
                  else if (link === 'Features') href = '/#features';
                  else if (link === 'Solutions') href = '/#solutions';
                  else if (link === 'Help Center') href = '/docs#connectors';
                  else if (link === 'API Reference') href = '/docs#api-reference';
                  else if (link === 'Privacy') href = '/privacy';
                  else if (link === 'Terms') href = '/terms';

                  return (
                    <li key={link}>
                      <Link href={href} className="lp-footer-link">
                        {link}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--lp-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--lp-text-tertiary)',
          }}
        >
          <span>© {new Date().getFullYear()} ORA by Hype Corporation. All rights reserved.</span>
          <span>Made with ♥ for merchants everywhere</span>
        </div>
      </div>
    </footer>
  );
}
