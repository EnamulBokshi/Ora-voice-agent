import Link from 'next/link';

/**
 * /start2 footer. Full-bleed, and every entry goes somewhere real: a section
 * on this page, a marketing route, or sign-in. The newsletter form, status
 * badge, social links and legal links were removed because none of them were
 * wired to anything.
 */

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Integrations', href: '#integrations' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Quickstart', href: '/docs#quickstart' },
      { label: 'Shopify setup', href: '/docs#shopify-setup' },
      { label: 'Solutions', href: '/solutions' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/auth' },
      { label: 'Start free', href: '/auth' },
    ],
  },
];

export function Start2Footer() {
  return (
    <footer className="s2-ft">
      <div className="s2-ft-inner">
        <div className="s2-ft-top">
          <div className="s2-ft-brand">
            <Link href="/start2" className="s2-nav-logo">
              <span className="s2-logo-mark">O</span>
              <span className="s2-logo-text">ORA</span>
            </Link>
            <p className="s2-ft-desc">
              A voice sales agent for your business. Answers shoppers and closes sales, day and night.
            </p>
          </div>

          <nav className="s2-ft-cols" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title} className="s2-ft-col">
                <h2 className="s2-ft-title">{col.title}</h2>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="s2-ft-link">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="s2-ft-bottom">
          <span>&copy; {new Date().getFullYear()} ORA Technologies Inc.</span>
          <a href="#main-content" className="s2-ft-link">
            Back to top &uarr;
          </a>
        </div>
      </div>
    </footer>
  );
}
