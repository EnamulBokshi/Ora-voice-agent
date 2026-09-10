import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ORA Voice AI",
  description: "ORA voice sales agent for your Shopify store.",
}

/**
 * Runs during HTML parsing, before React and independently of it.
 *
 * The app previously had one failure mode with no visible symptom: if the
 * client bundle throws — a hydration mismatch, a chunk that fails to evaluate —
 * React never mounts, `useEffect` never runs, and the server-rendered "loading"
 * markup stays on screen forever. Nothing reaches the UI because the UI is
 * frozen HTML, and the actual error only exists in the browser console, which
 * is awkward to reach inside a Shopify Admin iframe.
 *
 * This is plain DOM code, so it survives that. It captures the first script
 * error, and after a grace period reports whether React ever mounted.
 */
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

  function report() {
    if (STATE.mounted) return;
    var el = document.getElementById('ora-watchdog');
    if (!el) return;

    var p = new URLSearchParams(location.search);
    var lines = [
      'React did not mount within 10s, so the app is showing frozen server HTML.',
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
    el.textContent = lines.join('\\n');
  }

  setTimeout(report, 10000);
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/*
          App Bridge refuses to initialize without this tag, and a wrong value
          fails identically to a missing one: `idToken()` returns a promise that
          never settles. It must equal the app's Client ID (the server's
          SHOPIFY_API_KEY) exactly.

          The page is statically prerendered, so the value is inlined at BUILD
          time from the Docker build arg, not read at runtime. Changing the key
          means rebuilding the image. The Client ID is public — it ships in this
          tag to every browser — so the literal fallback is not a leaked secret.
        */}
        <meta
          name="shopify-api-key"
          content={
            process.env.NEXT_PUBLIC_SHOPIFY_API_KEY ||
            "737871ce3c359802b6363609149bc67b"
          }
        />
        {/* Must load before app code, and must not be async or deferred. */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
        <script dangerouslySetInnerHTML={{ __html: WATCHDOG }} />
      </head>
      <body>
        {children}
        <pre
          id="ora-watchdog"
          style={{
            display: "none",
            margin: "1.5rem 2rem",
            padding: "0.75rem",
            background: "#FEF2F2",
            border: "1px solid #DC2626",
            borderRadius: "0.375rem",
            color: "#111111",
            fontSize: "0.75rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        />
      </body>
    </html>
  )
}
