import type { Metadata } from 'next';
import { ShopifySessionProvider } from '@/components/shopify/shopify-session-provider';

export const metadata: Metadata = {
  title: 'ORA Voice AI | Shopify',
  description: 'Manage your ORA voice agent and catalog for your Shopify store.',
};

const WATCHDOG = `
(function () {
  var STATE = { mounted: false, firstError: null };
  window.__ORA__ = STATE;

  window.addEventListener('error', function (e) {
    if (!STATE.firstError) {
      STATE.firstError = (e.message || 'script error') +
        (e.filename ? ' @ ' + e.filename + ':' + e.lineno : '');
    }
  });
  window.addEventListener('unhandledrejection', function (e) {
    if (!STATE.firstError) {
      var r = e.reason;
      STATE.firstError = 'unhandled rejection: ' +
        ((r && (r.message || r.code)) || String(r));
    }
  });

  function report(seconds, verdict) {
    if (STATE.mounted) return;
    var el = document.getElementById('ora-watchdog');
    if (!el) return;

    var p = new URLSearchParams(location.search);
    var lines = [
      verdict,
      '',
      'first script error : ' + (STATE.firstError || '(none captured)'),
      'App Bridge loaded  : ' + (window.shopify ? 'yes' : 'NO'),
      'idToken available  : ' + (window.shopify && window.shopify.idToken ? 'yes' : 'NO'),
      'api-key meta       : ' + ((document.querySelector('meta[name="shopify-api-key"]') || {}).content || '(missing)'),
      'embedded in iframe : ' + (window.top !== window.self ? 'yes' : 'NO'),
      'shop param         : ' + (p.get('shop') || '(none)'),
      'host param         : ' + (p.get('host') || '(none)'),
      'id_token param     : ' + (p.get('id_token') ? 'present' : 'absent'),
      'location           : ' + location.href,
    ];

    el.style.display = 'block';
    el.style.borderColor = seconds >= 20 ? '#DC2626' : '#D97706';
    el.style.background = seconds >= 20 ? '#FEF2F2' : '#FFFBEB';
    el.textContent = lines.join('\\n');
  }

  // Two stages, because the first one used to lie. React not having mounted
  // after 10s is worth showing, but it is not yet proof of a crash: the
  // watchdog fires on a wall clock and cannot see a slow hydration. Only the
  // 20s verdict claims the bundle is dead.
  setTimeout(function () {
    report(10, 'React has not mounted after 10s. This may still resolve — the diagnostics below say what the page can see so far.');
  }, 10000);

  setTimeout(function () {
    report(20, 'React did not mount within 20s, so the app is showing frozen server HTML.');
  }, 20000);
})();
`;

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  const shopifyApiKey =
    process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '737871ce3c359802b6363609149bc67b';

  return (
    <>
      {/*
        App Bridge refuses to initialize without this tag, and a wrong value
        fails identically to a missing one: `idToken()` returns a promise that
        never settles. It must equal the app's Client ID (the server's
        SHOPIFY_API_KEY) exactly. React hoists a bare `<meta>` into `<head>`.
      */}
      <meta name="shopify-api-key" content={shopifyApiKey} />

      {/*
        Deliberately a plain `<script>`, not `next/script`.
        `strategy="beforeInteractive"` is only honoured in the ROOT layout; in a
        nested layout Next silently downgrades it, and the delivered HTML then
        carries only a `<link rel="preload">` with no executing script — App
        Bridge loads after hydration or not at all.
        No `async`/`defer`: Shopify requires this script to run before app code.
        Acceptance check, which must print a real script tag:
          curl -s http://127.0.0.1:<port>/shopify | grep -o '<script[^>]*app-bridge[^>]*>'
      */}
      {/*
        React hoists a bare `<link>` into `<head>`, so the fetch starts while
        the head is still being parsed even though the script tag itself lands
        at the top of `<body>`. A nested layout cannot put a synchronous script
        in `<head>` — that needs a root layout, and this app has one shared root
        layout for every other surface. This is the closest equivalent.
      */}
      <link
        rel="preload"
        as="script"
        href="https://cdn.shopify.com/shopifycloud/app-bridge.js"
      />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      <script dangerouslySetInnerHTML={{ __html: WATCHDOG }} />

      {/* Shopify App Bridge 4 Native Admin Sidebar Navigation */}
      {/* @ts-ignore custom element */}
      <ui-nav-menu>
        <a href="/shopify" rel="home">Overview</a>
        <a href="/shopify/agent">Voice Agent</a>
        <a href="/shopify/live-desk">Live Desk</a>
        <a href="/shopify/conversations">Conversations</a>
        <a href="/shopify/orders">Orders</a>
        <a href="/shopify/customers">Customers</a>
        <a href="/shopify/billing">Billing</a>
      {/* @ts-ignore custom element */}
      </ui-nav-menu>

      <pre
        id="ora-watchdog"
        style={{
          display: 'none',
          margin: '1.5rem 2rem',
          padding: '0.75rem',
          background: '#FEF2F2',
          border: '1px solid #DC2626',
          borderRadius: '0.375rem',
          color: '#111111',
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      />

      <ShopifySessionProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <main className="flex-1 flex flex-col overflow-x-hidden">{children}</main>
        </div>
      </ShopifySessionProvider>
    </>
  );
}
