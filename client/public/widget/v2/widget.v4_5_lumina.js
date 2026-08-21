/**
 * ORA Voice AI — Storefront Embed Bundle v4.5 (Lumina Glass Orb Edition)
 * Encapsulated inside Shadow DOM root for complete merchant CSS/layout isolation.
 */
(function () {
  'use strict';

  if (window.__ORA_BUNDLE_V4_5__) return;
  window.__ORA_BUNDLE_V4_5__ = true;

  // ─── Config resolution ─────────────────────────────────────────────────────
  var _cfg = window.ORA_CONFIG || {};

  var scriptEl =
    document.currentScript ||
    document.querySelector('script[data-ora-key]') ||
    document.querySelector('script[src*="ora-widget.js"]') ||
    document.querySelector('script[src*="loader.js"]');

  var publishableKey =
    _cfg.key ||
    _cfg.apiKey ||
    (scriptEl && scriptEl.getAttribute('data-ora-key')) ||
    '';

  var apiBase = _cfg.api || (scriptEl && scriptEl.getAttribute('data-ora-api')) || null;
  if (!apiBase) {
    if (scriptEl && scriptEl.src) {
      try {
        var scriptUrl = new URL(scriptEl.src);
        if (scriptUrl.hostname === 'localhost' || scriptUrl.hostname === '127.0.0.1') {
          apiBase = scriptUrl.protocol + '//' + scriptUrl.hostname + ':5000';
        } else {
          apiBase = scriptUrl.origin;
        }
      } catch (e) {}
    }
  }
  if (!apiBase) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiBase = window.location.protocol + '//' + window.location.hostname + ':5000';
    } else {
      apiBase = window.location.origin;
    }
  }

  if (apiBase) {
    apiBase = apiBase.replace(/\/api\/v1\/?$/, '');
  }

  // Positioning: 'bottom-center' (default)
  var position = _cfg.position || (scriptEl && scriptEl.getAttribute('data-ora-position')) || 'bottom-center';

  // ─── State ─────────────────────────────────────────────────────────────────
  let voiceState = 'idle'; // 'idle' | 'connecting' | 'active' | 'ora-speaking' | 'standby' | 'error'
  let isMuted = false;
  let liveUtterance = '';
  let liveSpeaker = null;
  let showTranscript = false;
  let errorMsg = '';
  let lastSpeaker = null;
  let userMicLevel = 0;
  let speakingLevel = 0;
  let animFrameId = null;

  // Resumption & Idle Timers
  let idleTimer = null;
  let activeResumptionToken = null;
  let isWaitingForAi = false;

  // Audio Contexts & Buffers
  let audioContext = null;
  let playbackContext = null;
  let mediaStream = null;
  let processorNode = null;
  let muteGainNode = null;
  let audioQueueTime = 0;
  let activeSources = [];
  let geminiWs = null;
  let recognition = null;
  let sessionId = 'ses_w_' + Math.random().toString(36).substring(2, 9);

  // ─── Utilities ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function floatTo16BitPCM(input) {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buffer);
  }

  function downsampleTo16k(input, sampleRate) {
    if (sampleRate === 16000) return input;
    const ratio = sampleRate / 16000;
    const newLength = Math.max(1, Math.floor(input.length / ratio));
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originIdx = Math.min(input.length - 1, Math.round(i * ratio));
      result[i] = input[originIdx];
    }
    return result;
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToFloat32Array(base64) {
    try {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] < 0 ? int16[i] / 32768 : int16[i] / 32767;
      }
      return float32;
    } catch (e) {
      return new Float32Array(0);
    }
  }

  function mergeStreamingText(prevText, chunk) {
    if (!chunk) return prevText;
    if (!prevText) return chunk.trimStart();
    if (chunk.startsWith(prevText)) return chunk;
    if (prevText.endsWith(chunk.trim()) && chunk.trim().length > 3) return prevText;
    const isPunctuation = /^[,.!?:;'")\]}]/.test(chunk);
    const isContraction = /^'(s|t|re|ve|m|ll|d)\b/i.test(chunk) || /^n't\b/i.test(chunk);
    const prevEndsSpace = prevText.endsWith(' ') || prevText.endsWith('\n');
    const chunkStartsSpace = chunk.startsWith(' ') || chunk.startsWith('\n');
    let merged;
    if (isPunctuation || isContraction) {
      merged = prevText.trimEnd() + chunk.trimStart();
    } else if (prevEndsSpace || chunkStartsSpace) {
      merged = prevText.trimEnd() + ' ' + chunk.trimStart();
    } else {
      const prevEndsPunct = /[.!?]$/.test(prevText);
      const chunkStartsCap = /^[A-Z0-9]/.test(chunk);
      merged = (prevEndsPunct || chunkStartsCap) ? prevText + ' ' + chunk : prevText + chunk;
    }
    return merged.replace(/[ \t]+/g, ' ').replace(/ ([.,!?:;])/g, '$1').replace(/ '/g, "'");
  }

  // ─── Fast String Hasher for Client Deduplication ────────────────────────────
  function hashString(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  // ─── Universal Storefront, Portfolio & Viewport DOM Extractor ───────────────
  function extractUniversalDomTelemetry() {
    try {
      var url = window.location.href;
      var pathname = window.location.pathname;
      var title = document.title || '';

      var metaDesc = (document.querySelector('meta[name="description"]') && document.querySelector('meta[name="description"]').getAttribute('content')) ||
                     (document.querySelector('meta[property="og:description"]') && document.querySelector('meta[property="og:description"]').getAttribute('content')) || '';

      // 1. Headings Hierarchy
      var headings = [];
      var headingEls = document.querySelectorAll('h1, h2, h3, h4');
      for (var h = 0; h < headingEls.length; h++) {
        var el = headingEls[h];
        if (el.closest('#ora-voice-root') || el.closest('.ora-shadow-host')) continue;
        var hText = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
        if (hText.length >= 2 && hText.length <= 150) {
          headings.push({ level: el.tagName.toLowerCase(), text: hText });
        }
      }

      // 2. Discover Contact & Social Channels
      var contacts = { emails: [], links: [] };
      var linkEls = document.querySelectorAll('a[href]');
      for (var l = 0; l < linkEls.length; l++) {
        var href = linkEls[l].getAttribute('href') || '';
        if (href.startsWith('mailto:')) {
          var em = href.replace(/^mailto:/i, '').split('?')[0].trim();
          if (em && contacts.emails.indexOf(em) === -1) contacts.emails.push(em);
        } else if (/github\.com|linkedin\.com|twitter\.com|x\.com|calendly\.com|cal\.com/i.test(href)) {
          if (contacts.links.indexOf(href) === -1 && contacts.links.length < 10) {
            contacts.links.push(href);
          }
        }
      }

      // 3. Extract Card / Project / Section Entities
      var cards = [];
      var cardSelectors = [
        '[class*="project"]',
        '[class*="card"]',
        '[class*="service"]',
        '[class*="item"]',
        'article',
        '.grid > div',
        'section'
      ];
      var candidateCards = document.querySelectorAll(cardSelectors.join(', '));
      for (var c = 0; c < candidateCards.length && cards.length < 20; c++) {
        var cardEl = candidateCards[c];
        if (cardEl.closest('#ora-voice-root') || cardEl.closest('.ora-shadow-host')) continue;
        
        var cardHeading = cardEl.querySelector('h2, h3, h4, h5, [class*="title"], strong');
        var cardTitle = cardHeading ? (cardHeading.innerText || cardHeading.textContent || '').trim() : '';
        if (!cardTitle || cardTitle.length < 2 || cardTitle.length > 100) continue;

        var cardText = (cardEl.innerText || cardEl.textContent || '')
          .replace(/\s+/g, ' ')
          .replace(cardTitle, '')
          .trim();

        // Extract any tags or tech stack labels
        var tags = [];
        var tagEls = cardEl.querySelectorAll('span, [class*="tag"], [class*="badge"], [class*="pill"], li');
        for (var t = 0; t < tagEls.length && tags.length < 8; t++) {
          var tagText = (tagEls[t].innerText || tagEls[t].textContent || '').trim();
          if (tagText.length >= 2 && tagText.length <= 25 && tagText !== cardTitle) {
            if (tags.indexOf(tagText) === -1) tags.push(tagText);
          }
        }

        var cardLink = (cardEl.querySelector('a[href]') && cardEl.querySelector('a[href]').getAttribute('href')) || '';
        if (cardLink && !cardLink.startsWith('http')) {
          try { cardLink = new URL(cardLink, window.location.origin).href; } catch (e) {}
        }

        if (cardText.length >= 10 || tags.length > 0) {
          cards.push({
            title: cardTitle,
            description: cardText.slice(0, 300),
            tags: tags,
            link: cardLink
          });
        }
      }

      // 4. Clean Visible Text Preview (Stripping Scripts & Noise)
      var bodyClone = document.body.cloneNode(true);
      var noiseEls = bodyClone.querySelectorAll('script, style, svg, noscript, #ora-voice-root, .ora-shadow-host, nav, footer');
      for (var n = 0; n < noiseEls.length; n++) {
        if (noiseEls[n].parentNode) noiseEls[n].parentNode.removeChild(noiseEls[n]);
      }
      var cleanBodyText = (bodyClone.innerText || bodyClone.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);

      // 5. Schema.org Product Check (if e-commerce)
      var product = null;
      var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < ldScripts.length; i++) {
        try {
          var parsed = JSON.parse(ldScripts[i].innerText || '{}');
          var items = Array.isArray(parsed) ? parsed : [parsed];
          var flattened = items.flatMap(function(x) { return x && x['@graph'] ? x['@graph'] : [x]; });
          var prod = flattened.find(function(node) {
            return node && node['@type'] && (node['@type'] === 'Product' || (Array.isArray(node['@type']) && node['@type'].includes('Product')));
          });
          if (prod) {
            var offer = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
            product = {
              name: prod.name || title,
              price: offer && offer.price ? Number(offer.price) : null,
              currency: offer && offer.priceCurrency ? offer.priceCurrency : 'USD',
              availability: offer && /instock/i.test(offer.availability || '') ? 'in_stock' : 'unknown',
              sku: prod.sku || null
            };
            break;
          }
        } catch (e) {}
      }

      var contentSignature = title + '|' + metaDesc + '|' + headings.map(function(h){return h.text}).join(',') + '|' + cleanBodyText.slice(0, 500);
      var contentHash = hashString(contentSignature);

      return {
        url: url,
        pathname: pathname,
        title: title,
        metaDescription: metaDesc,
        headings: headings.slice(0, 15),
        cards: cards.slice(0, 15),
        contacts: contacts,
        bodyTextSnippet: cleanBodyText,
        product: product,
        contentHash: contentHash
      };
    } catch (err) {
      return { url: window.location.href, title: document.title, pathname: window.location.pathname };
    }
  }

  // Keep legacy extractPageContext for backward compatibility with active voice context
  function extractPageContext() {
    var telemetry = extractUniversalDomTelemetry();
    return {
      url: telemetry.url,
      title: telemetry.title,
      pathname: telemetry.pathname,
      isProductPage: !!telemetry.product,
      product: telemetry.product
    };
  }

  // ─── Universal Telemetry Dispatcher with Deduplication ───────────────────────
  function triggerUniversalTelemetrySync() {
    try {
      if (!publishableKey || !apiBase) return;
      var telemetry = extractUniversalDomTelemetry();
      if (!telemetry || !telemetry.url) return;

      var storageKey = '__ora_dom_' + telemetry.pathname;
      if (window.sessionStorage && window.sessionStorage.getItem(storageKey) === telemetry.contentHash) {
        // Content hasn't changed since last sync in this session — skip redundant network traffic
        return;
      }

      var endpoint = apiBase + '/api/v1/ingestion/telemetry';
      var payload = JSON.stringify(telemetry);

      // Attempt sendBeacon or non-blocking fetch
      var sent = false;
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        // Note: sendBeacon doesn't allow custom headers on all browsers, so fallback to fetch with x-publishable-key
      }

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-key': publishableKey,
        },
        body: payload,
      })
      .then(function(res) {
        if (res.ok && window.sessionStorage) {
          window.sessionStorage.setItem(storageKey, telemetry.contentHash);
        }
      })
      .catch(function () {});
    } catch (e) {}
  }

  // Backward compatibility alias
  function triggerPassiveStorefrontSync() {
    triggerUniversalTelemetrySync();
  }

  // ─── SPA Route Transition Listener (Next.js, Nuxt, React CSR) ───────────────
  function initSpaRouteObserver() {
    try {
      var lastPath = window.location.pathname;
      function checkRouteChange() {
        if (window.location.pathname !== lastPath) {
          lastPath = window.location.pathname;
          // Debounce slightly to allow dynamic SPA views (Next.js/React) to render DOM
          setTimeout(triggerUniversalTelemetrySync, 1200);
        }
      }

      if (window.history) {
        var origPush = window.history.pushState;
        if (origPush) {
          window.history.pushState = function () {
            origPush.apply(this, arguments);
            checkRouteChange();
          };
        }
        var origReplace = window.history.replaceState;
        if (origReplace) {
          window.history.replaceState = function () {
            origReplace.apply(this, arguments);
            checkRouteChange();
          };
        }
        window.addEventListener('popstate', checkRouteChange);
      }
    } catch (e) {}
  }
  initSpaRouteObserver();

  // ─── Customer Identity & Fail-Closed Consent Resolution ─────────────────────
  function getOrCreateDeviceId() {
    var consentAllowed = false;
    if (_cfg && _cfg.consent !== undefined) {
      consentAllowed = _cfg.consent === true;
    } else if (window.Shopify && window.Shopify.customerPrivacy && typeof window.Shopify.customerPrivacy.userCanBeTracked === 'function') {
      consentAllowed = window.Shopify.customerPrivacy.userCanBeTracked() === true;
    }

    // Fail-Closed: Any state other than strict true uses memory-only ephemeral ID
    if (consentAllowed !== true) {
      if (!window.__oraEphemeralDeviceId) {
        window.__oraEphemeralDeviceId = 'ephem_' + Math.random().toString(36).substring(2, 15);
      }
      return window.__oraEphemeralDeviceId;
    }

    try {
      var deviceId = localStorage.getItem('ora_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
        localStorage.setItem('ora_device_id', deviceId);
      }
      return deviceId;
    } catch (e) {
      return 'ephem_' + Math.random().toString(36).substring(2, 15);
    }
  }

  function normalizeCustomerData(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) {
        if (raw.includes('@')) return { email: raw };
        return { id: raw };
      }
    }
    if (typeof raw !== 'object') return null;

    var id = raw.id || raw._id || raw.userId || raw.user_id || raw.customerId || raw.customer_id || (raw.user && (raw.user.id || raw.user._id)) || null;
    var email = raw.email || raw.userEmail || raw.user_email || (raw.user && raw.user.email) || null;
    var name = raw.name || raw.fullName || raw.full_name || (raw.firstName ? (raw.firstName + ' ' + (raw.lastName || '')).trim() : null) || (raw.user && raw.user.name) || null;

    if (!id && !email && !name) return null;
    return { id: id ? String(id) : null, email: email, name: name };
  }

  function resolveCustomerPayload() {
    var deviceId = getOrCreateDeviceId();
    var customerToken = _cfg.customerToken || null;
    var identified = window._oraActiveCustomer || normalizeCustomerData(_cfg.customer || _cfg.user);

    return {
      deviceId: deviceId,
      customerToken: customerToken,
      identified: identified,
    };
  }

  // Expose global ORA SDK methods
  window.ORA = window.ORA || {};
  window.ORA.identify = function (userData) {
    var normalized = normalizeCustomerData(userData);
    if (normalized) {
      window._oraActiveCustomer = normalized;
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(JSON.stringify({
          type: 'client_identify',
          customerToken: _cfg.customerToken,
          userData: normalized,
        }));
      }
    }
  };

  window.ORA.setCustomerToken = function (token) {
    if (token && token.customerId && token.signature) {
      _cfg.customerToken = token;
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(JSON.stringify({
          type: 'client_identify',
          customerToken: token,
        }));
      }
    }
  };

  // ─── Shadow DOM CSS ────────────────────────────────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `

    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    }

    /* ── Keyframe Animations ── */
    @keyframes ora-w-fly-in {
      0%   { opacity: 0; transform: translateY(80px) scale(0.85); }
      60%  { opacity: 1; transform: translateY(-4px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ora-w-glow-pulse {
      0%, 100% {
        box-shadow:
          inset 0 0 24px rgba(0, 0, 0, 0.95),
          inset 0 0 12px rgba(56, 189, 248, 0.2),
          0 8px 32px rgba(0, 0, 0, 0.6),
          0 0 25px rgba(56, 189, 248, 0.18);
      }
      50% {
        box-shadow:
          inset 0 0 24px rgba(0, 0, 0, 0.95),
          inset 0 0 16px rgba(56, 189, 248, 0.35),
          0 8px 36px rgba(0, 0, 0, 0.7),
          0 0 35px rgba(56, 189, 248, 0.32);
      }
    }
    @keyframes ora-w-speaking-glow {
      0%, 100% {
        box-shadow:
          inset 0 0 24px rgba(0, 0, 0, 0.95),
          inset 0 0 16px rgba(168, 85, 247, 0.4),
          0 8px 36px rgba(0, 0, 0, 0.7),
          0 0 40px rgba(200, 240, 49, 0.45),
          0 0 20px rgba(168, 85, 247, 0.35);
      }
      50% {
        box-shadow:
          inset 0 0 24px rgba(0, 0, 0, 0.95),
          inset 0 0 22px rgba(168, 85, 247, 0.6),
          0 8px 42px rgba(0, 0, 0, 0.8),
          0 0 60px rgba(200, 240, 49, 0.7),
          0 0 32px rgba(168, 85, 247, 0.55);
      }
    }
    @keyframes ora-w-ring-pulse {
      0% {
        transform: scale(0.85);
        opacity: 0.9;
      }
      50% {
        opacity: 0.6;
      }
      100% {
        transform: scale(1.45);
        opacity: 0;
      }
    }
    @keyframes ora-w-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes ora-w-dot-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%      { transform: scale(1.35); opacity: 0.6; }
    }
    @keyframes ora-w-fly-in-center {
      0%   { opacity: 0; transform: translateX(-50%) translateY(80px) scale(0.85); }
      60%  { opacity: 1; transform: translateX(-50%) translateY(-4px) scale(1.02); }
      100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }

    /* ── Root Container ── */
    .ora-w-root {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      position: fixed;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      user-select: none;
    }
    .ora-w-root * {
      box-sizing: border-box;
    }
    .ora-w-root.pos-bottom-center {
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);
      animation: ora-w-fly-in-center 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .ora-w-root.pos-bottom-right {
      bottom: 20px;
      right: 28px;
      animation: ora-w-fly-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .ora-w-root.pos-bottom-left {
      bottom: 20px;
      left: 28px;
      animation: ora-w-fly-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }

    /* ── Siri/Gemini Transcript Pill ── */
    .ora-w-transcript-pill {
      pointer-events: auto;
      max-width: 320px;
      min-width: 180px;
      padding: 10px 16px;
      border-radius: 20px;
      font-size: 13px;
      line-height: 1.4;
      color: #FFFFFF;
      background: rgba(17, 17, 17, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      margin-bottom: 8px;
      transition: all 0.2s ease;
      text-align: center;
    }
    .ora-w-transcript-pill.user-turn {
      border-color: rgba(56, 189, 248, 0.5);
    }
    .ora-w-transcript-pill.agent-turn {
      border-color: rgba(200, 240, 49, 0.5);
    }

    /* ── Control Action Buttons (Mute / Stop) ── */
    .ora-w-controls-row {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .ora-w-ctrl-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(17, 17, 17, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #E2E8F0;
      backdrop-filter: blur(12px);
      transition: all 0.15s ease;
      outline: none;
      padding: 0;
      margin: 0;
    }
    .ora-w-ctrl-btn:hover {
      background: rgba(30, 41, 59, 1);
      border-color: rgba(200, 240, 49, 0.6);
      transform: scale(1.06);
    }
    .ora-w-ctrl-btn.muted {
      color: #EF4444;
      border-color: #EF4444;
      background: rgba(239, 68, 68, 0.18);
    }

    /* ── Status Cue Pill Chip ── */
    .ora-w-status-chip {
      pointer-events: auto;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      background: rgba(17, 17, 17, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-size: 0.75rem;
      font-weight: 500;
      color: #E2E8F0;
      margin-bottom: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      transition: all 0.25s ease;
      white-space: nowrap;
    }
    .ora-w-status-chip:hover {
      background: rgba(24, 24, 28, 0.95);
      border-color: rgba(200, 240, 49, 0.4);
    }
    .ora-w-status-chip.active {
      border-color: rgba(200, 240, 49, 0.5);
      color: #FFFFFF;
    }
    .ora-w-status-chip.speaking {
      border-color: rgba(168, 85, 247, 0.6);
    }
    .ora-w-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .ora-w-status-dot.idle { background: #94A3B8; }
    .ora-w-status-dot.connecting { background: #38BDF8; animation: ora-w-dot-pulse 0.8s ease-in-out infinite; }
    .ora-w-status-dot.listening { background: #C8F031; box-shadow: 0 0 8px #C8F031; }
    .ora-w-status-dot.speaking { background: #D4F536; box-shadow: 0 0 10px #C8F031; }
    .ora-w-status-dot.standby { background: #F59E0B; box-shadow: 0 0 8px #F59E0B; }
    .ora-w-status-dot.muted { background: #EF4444; }
    .ora-w-status-dot.error { background: #EF4444; }

    /* ── Main Orb Container ── */
    .ora-w-orb-container {
      position: relative;
      width: 68px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      flex-shrink: 0;
    }

    /* ── Outer 3D Crystal Glass Sphere Button ── */
    .ora-w-glass-sphere {
      cursor: pointer;
      pointer-events: auto;
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #050508;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow:
        inset 0 0 20px rgba(0, 0, 0, 0.95),
        inset 0 0 10px rgba(56, 189, 248, 0.2),
        0 6px 28px rgba(0, 0, 0, 0.6),
        0 0 20px rgba(56, 189, 248, 0.16);
      overflow: hidden;
      z-index: 10;
      outline: none;
      padding: 0;
      margin: 0;
      display: block;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.3s ease;
      animation: ora-w-glow-pulse 3.5s ease-in-out infinite;
      -webkit-tap-highlight-color: transparent;
    }
    .ora-w-glass-sphere:hover {
      transform: scale(1.05);
      border-color: rgba(200, 240, 49, 0.5);
    }
    .ora-w-glass-sphere:active {
      transform: scale(0.96);
    }
    .ora-w-glass-sphere:focus-visible {
      outline: 2px solid rgba(200, 240, 49, 0.8);
      outline-offset: 4px;
    }
    .ora-w-glass-sphere.active {
      border-color: rgba(200, 240, 49, 0.5);
    }
    .ora-w-glass-sphere.speaking-active {
      border-color: rgba(200, 240, 49, 0.7);
      animation: ora-w-speaking-glow 0.9s ease-in-out infinite !important;
    }
    .ora-w-glass-sphere.connecting-active {
      border-color: rgba(56, 189, 248, 0.7);
    }

    /* ── Procedural Fluid Wave Mesh Canvas ── */
    .ora-w-orb-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2;
      display: block;
    }

    /* ── Top Glass Specular Highlight ── */
    .ora-w-top-highlight {
      position: absolute;
      top: 4%;
      left: 15%;
      width: 70%;
      height: 32%;
      border-radius: 50% 50% 20% 20% / 100% 100% 30% 30%;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
      transform: rotate(-12deg);
      pointer-events: none;
      z-index: 6;
    }

    /* ── Inner Rim Refraction Lighting ── */
    .ora-w-inner-rim-light {
      position: absolute;
      inset: 1px;
      border-radius: 50%;
      border: 1.5px solid transparent;
      border-bottom-color: rgba(56, 189, 248, 0.45);
      border-right-color: rgba(168, 85, 247, 0.35);
      border-top-color: rgba(255, 255, 255, 0.2);
      transform: rotate(35deg);
      pointer-events: none;
      z-index: 5;
    }

    /* ── Quantum Orbital Connecting Rings ── */
    .ora-w-connecting-rings {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 12;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ora-w-quantum-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1.5px solid rgba(56, 189, 248, 0.65);
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .ora-w-quantum-ring.ring-1 {
      animation: ora-w-ring-pulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
    }
    .ora-w-quantum-ring.ring-2 {
      animation: ora-w-ring-pulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.9s infinite;
    }

    /* ── Ambient Floor Shadow Reflection ── */
    .ora-w-floor-reflection {
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 8px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(56, 189, 248, 0.35) 0%, rgba(168, 85, 247, 0.15) 45%, transparent 75%);
      filter: blur(5px);
      z-index: 0;
      pointer-events: none;
    }

    /* ── Reactive Fluid Outer Aura ── */
    .ora-w-reactive-aura {
      position: absolute;
      top: 50%;
      left: 50%;
      margin-top: -46px;
      margin-left: -46px;
      width: 92px;
      height: 92px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1;
      filter: blur(14px);
      transform-origin: center center;
      transition: transform 0.12s ease-out, opacity 0.15s ease-out;
    }
    .ora-w-reactive-aura.listening {
      background: radial-gradient(
        circle,
        rgba(200, 240, 49, 0.55) 0%,
        rgba(56, 189, 248, 0.35) 45%,
        transparent 75%
      );
    }
    .ora-w-reactive-aura.speaking {
      background: radial-gradient(
        circle,
        rgba(168, 85, 247, 0.65) 0%,
        rgba(200, 240, 49, 0.45) 45%,
        rgba(56, 189, 248, 0.3) 70%,
        transparent 85%
      );
    }
  `;

  // ─── DOM References ────────────────────────────────────────────────────────
  let host = null;
  let shadowRoot = null;
  let root = null;
  let orbBtn = null;
  let orbCanvas = null;
  let canvasCtx = null;
  let connectingRings = null;
  let statusChip = null;
  let statusDot = null;
  let statusLabel = null;
  let reactiveAura = null;
  let transcriptBox = null;
  let transcriptText = null;
  let controlsBar = null;
  let muteBtn = null;
  let closeBtn = null;
  let canvasTime = 0;
  let canvasAnimId = null;

  // ─── Idle Inactivity Timer (Conversational Standby Protocol) ───────────────
  function cancelIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function armIdleTimer() {
    cancelIdleTimer();
    // Only arm idle timer if turn is completely settled and waiting for customer input
    if (voiceState === 'active' && !isWaitingForAi) {
      idleTimer = setTimeout(function () {
        if (voiceState === 'active' && !isWaitingForAi && geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          console.log('[ORA Widget] Conversational idle timeout — suspending session after 10s.');
          try {
            geminiWs.send(JSON.stringify({ type: 'client_idle_suspend', sessionId: sessionId }));
          } catch (e) {}
          disconnectVoice('standby');
        }
      }, 10000); // 10 seconds of conversational dormancy
    }
  }

  // ─── Mount DOM inside Shadow Root ──────────────────────────────────────────
  function mountWidget() {
    if (host) return;

    host = document.createElement('div');
    host.id = 'ora-voice-widget-root';
    document.body.appendChild(host);

    shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(styleEl);

    root = document.createElement('div');
    root.className = 'ora-w-root pos-' + position;

    root.innerHTML = `
      <div id="oraWTranscript" class="ora-w-transcript-pill" style="display:none;">
        <span id="oraWTranscriptText"></span>
      </div>

      <div id="oraWControls" class="ora-w-controls-row" style="display:none;">
        <button id="oraWMuteBtn" class="ora-w-ctrl-btn" title="Mute Microphone" type="button" aria-label="Mute">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <button id="oraWCloseBtn" class="ora-w-ctrl-btn" title="End Voice Conversation" type="button" aria-label="End call">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </button>
      </div>

      <div id="oraWStatusChip" class="ora-w-status-chip">
        <span id="oraWDot" class="ora-w-status-dot idle"></span>
        <span id="oraWStatusLabel">Talk with ORA</span>
      </div>

      <div class="ora-w-orb-container">
        <div id="oraWReactiveAura" class="ora-w-reactive-aura" style="display:none;"></div>
        <div class="ora-w-floor-reflection"></div>
        <button id="oraWOrbBtn" class="ora-w-glass-sphere" type="button" aria-label="Talk with ORA Voice AI">
          <canvas id="oraWOrbCanvas" class="ora-w-orb-canvas" width="140" height="140" aria-hidden="true"></canvas>
          <div class="ora-w-inner-rim-light"></div>
          <div class="ora-w-top-highlight"></div>
          <div id="oraWConnectingRings" class="ora-w-connecting-rings" style="display:none;" aria-hidden="true">
            <div class="ora-w-quantum-ring ring-1"></div>
            <div class="ora-w-quantum-ring ring-2"></div>
          </div>
        </button>
      </div>
    `;
    shadowRoot.appendChild(root);

    // Element refs from Shadow Root
    orbBtn = shadowRoot.getElementById('oraWOrbBtn');
    orbCanvas = shadowRoot.getElementById('oraWOrbCanvas');
    connectingRings = shadowRoot.getElementById('oraWConnectingRings');
    statusChip = shadowRoot.getElementById('oraWStatusChip');
    statusDot = shadowRoot.getElementById('oraWDot');
    statusLabel = shadowRoot.getElementById('oraWStatusLabel');
    reactiveAura = shadowRoot.getElementById('oraWReactiveAura');
    transcriptBox = shadowRoot.getElementById('oraWTranscript');
    transcriptText = shadowRoot.getElementById('oraWTranscriptText');
    controlsBar = shadowRoot.getElementById('oraWControls');
    muteBtn = shadowRoot.getElementById('oraWMuteBtn');
    closeBtn = shadowRoot.getElementById('oraWCloseBtn');

    // Initialize Procedural Canvas Fluid Wave Mesh Engine
    initOrbCanvas();

    // Event Listeners
    orbBtn.addEventListener('click', function () {
      if (voiceState === 'connecting') return;
      if (voiceState === 'idle' || voiceState === 'error') {
        startVoiceSession();
      } else if (voiceState === 'standby') {
        startVoiceSession(activeResumptionToken);
      } else {
        teardown();
      }
    });

    statusChip.addEventListener('click', function () {
      if (voiceState === 'connecting') return;
      if (voiceState === 'idle' || voiceState === 'error') {
        startVoiceSession();
      } else if (voiceState === 'standby') {
        startVoiceSession(activeResumptionToken);
      } else {
        teardown();
      }
    });

    muteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      isMuted = !isMuted;
      if (isMuted && recognition) {
        try { recognition.abort(); } catch (e) {}
      } else if (!isMuted && recognition) {
        try { recognition.start(); } catch (e) {}
      }
      render();
    });

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      teardown();
    });

    render();

    // Trigger passive storefront context sync once verified
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(function () { triggerPassiveStorefrontSync(); });
      } else {
        setTimeout(triggerPassiveStorefrontSync, 1500);
      }
    }
  }

  // ─── Procedural Canvas Fluid Wave Mesh Engine ──────────────────────────────
  function initOrbCanvas() {
    if (!orbCanvas) return;
    canvasCtx = orbCanvas.getContext('2d');
    orbCanvas.width = 140;
    orbCanvas.height = 140;
    startCanvasLoop();
  }

  function startCanvasLoop() {
    if (canvasAnimId) return;
    function drawCanvas() {
      if (canvasCtx && orbCanvas) {
        canvasTime += 0.035;
        var t = canvasTime;
        var w = orbCanvas.width || 140;
        var h = orbCanvas.height || 140;
        var cx = w / 2;
        var cy = h / 2;
        var ctx = canvasCtx;

        ctx.clearRect(0, 0, w, h);

        var baseRadius = 40;
        var isIdle = voiceState === 'idle' || voiceState === 'standby';
        var isConnecting = voiceState === 'connecting';
        var isThinking = isWaitingForAi;
        var isSpeaking = voiceState === 'ora-speaking';
        var isError = voiceState === 'error';
        var isActive = voiceState === 'active' || isSpeaking || isThinking;
        var energy = isSpeaking ? speakingLevel : userMicLevel;

        var amp = isSpeaking
          ? 6 + (energy / 100) * 14
          : isThinking
          ? 5
          : isActive
          ? 3 + (energy / 100) * 8
          : isConnecting
          ? 4
          : isError
          ? 2
          : 1.5;

        var speedMult = isSpeaking ? 1.8 : isThinking ? 1.6 : isConnecting ? 1.5 : 1.0;

        // Outer glow
        var outerGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.5);
        if (isError) {
          outerGlow.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
          outerGlow.addColorStop(0.6, 'rgba(185, 28, 28, 0.20)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isSpeaking) {
          outerGlow.addColorStop(0, 'rgba(200, 240, 49, 0.45)');
          outerGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.25)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isThinking) {
          outerGlow.addColorStop(0, 'rgba(180, 120, 255, 0.45)');
          outerGlow.addColorStop(0.6, 'rgba(0, 210, 255, 0.30)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isActive) {
          outerGlow.addColorStop(0, 'rgba(0, 210, 255, 0.40)');
          outerGlow.addColorStop(0.6, 'rgba(100, 150, 255, 0.15)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isConnecting) {
          outerGlow.addColorStop(0, 'rgba(150, 100, 255, 0.35)');
          outerGlow.addColorStop(0.7, 'rgba(0, 220, 255, 0.15)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          outerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.20)');
          outerGlow.addColorStop(0.7, 'rgba(50, 100, 200, 0.08)');
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Layer 1: Wave Mesh
        ctx.save();
        ctx.beginPath();
        var points = 36;
        for (var i = 0; i <= points; i++) {
          var theta = (i / points) * Math.PI * 2;
          var n1 = Math.sin(theta * 3 + t * speedMult * 1.2);
          var n2 = Math.cos(theta * 2 - t * speedMult * 0.9);
          var r = baseRadius + (n1 + n2) * (amp * 0.7);
          var px = cx + Math.cos(theta) * r;
          var py = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        var innerGrad1 = ctx.createLinearGradient(0, 0, w, h);
        if (isError) {
          innerGrad1.addColorStop(0, '#EF4444');
          innerGrad1.addColorStop(0.6, '#B91C1C');
          innerGrad1.addColorStop(1, '#450A0A');
        } else if (isSpeaking) {
          innerGrad1.addColorStop(0, '#C8F031');
          innerGrad1.addColorStop(0.5, '#00E5FF');
          innerGrad1.addColorStop(1, '#0055FF');
        } else if (isActive) {
          innerGrad1.addColorStop(0, '#00F5D4');
          innerGrad1.addColorStop(0.6, '#00BBF9');
          innerGrad1.addColorStop(1, '#3A0CA3');
        } else {
          innerGrad1.addColorStop(0, '#00B4D8');
          innerGrad1.addColorStop(0.7, '#0077B6');
          innerGrad1.addColorStop(1, '#03045E');
        }
        ctx.fillStyle = innerGrad1;
        ctx.fill();
        ctx.restore();

        // Layer 2: Fast Surface Ripple
        ctx.save();
        ctx.beginPath();
        for (var j = 0; j <= points; j++) {
          var theta2 = (j / points) * Math.PI * 2;
          var n3 = Math.sin(theta2 * 4 - t * speedMult * 1.5);
          var n4 = Math.cos(theta2 * 3 + t * speedMult * 1.1);
          var r2 = baseRadius * 0.82 + (n3 + n4) * (amp * 0.5);
          var px2 = cx + Math.cos(theta2) * r2;
          var py2 = cy + Math.sin(theta2) * r2;
          if (j === 0) ctx.moveTo(px2, py2);
          else ctx.lineTo(px2, py2);
        }
        ctx.closePath();

        var innerGrad2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseRadius * 0.9);
        if (isError) {
          innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          innerGrad2.addColorStop(0.4, 'rgba(239, 68, 68, 0.85)');
          innerGrad2.addColorStop(1, 'rgba(185, 28, 28, 0.1)');
        } else if (isSpeaking) {
          innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          innerGrad2.addColorStop(0.4, 'rgba(200, 240, 49, 0.85)');
          innerGrad2.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
        } else {
          innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
          innerGrad2.addColorStop(0.4, 'rgba(0, 245, 212, 0.7)');
          innerGrad2.addColorStop(1, 'rgba(0, 119, 182, 0.1)');
        }
        ctx.fillStyle = innerGrad2;
        ctx.fill();
        ctx.restore();

        // Layer 3: Central Nucleus
        ctx.save();
        var nucleusRadius = 8 + (energy / 100) * 10;
        var nucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusRadius);
        nucleusGrad.addColorStop(0, '#FFFFFF');
        nucleusGrad.addColorStop(0.5, isError ? 'rgba(239, 68, 68, 0.8)' : isSpeaking ? 'rgba(200, 240, 49, 0.8)' : 'rgba(0, 255, 255, 0.8)');
        nucleusGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = nucleusGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      canvasAnimId = requestAnimationFrame(drawCanvas);
    }
    canvasAnimId = requestAnimationFrame(drawCanvas);
  }

  // ─── Render UI State ───────────────────────────────────────────────────────
  function render() {
    if (!root || !orbBtn) return;
    const isActive = voiceState === 'active' || voiceState === 'ora-speaking';
    const isConnecting = voiceState === 'connecting';
    const isSpeaking = voiceState === 'ora-speaking';
    const isStandby = voiceState === 'standby';
    const energyLevel = isSpeaking ? speakingLevel : userMicLevel;

    // Glass Sphere styling
    orbBtn.className = 'ora-w-glass-sphere' +
      (isActive ? ' active' : '') +
      (isSpeaking ? ' speaking-active' : '') +
      (isConnecting ? ' connecting-active' : '');

    if (connectingRings) {
      connectingRings.style.display = isConnecting ? 'flex' : 'none';
    }
    controlsBar.style.display = isActive ? 'flex' : 'none';

    // Reactive outer aura
    if (isActive) {
      reactiveAura.style.display = 'block';
      reactiveAura.className = 'ora-w-reactive-aura ' + (isSpeaking ? 'speaking' : 'listening');
      reactiveAura.style.transform = 'scale(' + (1 + (energyLevel / 100) * 0.35) + ')';
      reactiveAura.style.opacity = (0.45 + (energyLevel / 100) * 0.55).toString();
    } else {
      reactiveAura.style.display = 'none';
    }

    // Status chip
    statusChip.className = 'ora-w-status-chip' + (isActive ? ' active' : '') + (isSpeaking ? ' speaking' : '');
    if (voiceState === 'connecting') {
      statusDot.className = 'ora-w-status-dot connecting';
      statusLabel.innerText = 'Connecting to ORA…';
    } else if (isSpeaking) {
      statusDot.className = 'ora-w-status-dot speaking';
      statusLabel.innerText = 'ORA is speaking…';
    } else if (isActive && isMuted) {
      statusDot.className = 'ora-w-status-dot muted';
      statusLabel.innerText = 'Microphone muted';
    } else if (isWaitingForAi) {
      statusDot.className = 'ora-w-status-dot connecting';
      statusLabel.innerText = 'ORA is thinking…';
    } else if (isActive) {
      statusDot.className = 'ora-w-status-dot listening';
      statusLabel.innerText = 'Listening… Speak now';
    } else if (isStandby) {
      statusDot.className = 'ora-w-status-dot standby';
      statusLabel.innerText = 'Paused • Tap to resume';

    } else if (voiceState === 'error') {
      statusDot.className = 'ora-w-status-dot error';
      statusLabel.innerText = errorMsg ? errorMsg.slice(0, 26) : 'Retry conversation';
    } else {
      statusDot.className = 'ora-w-status-dot idle';
      statusLabel.innerText = 'Talk with ORA';
    }

    // Transcript Box
    if (showTranscript && liveUtterance) {
      transcriptBox.style.display = 'block';
      transcriptBox.className = 'ora-w-transcript-pill ' + (liveSpeaker === 'user' ? 'user-turn' : 'agent-turn');
      transcriptText.innerHTML = (liveSpeaker === 'user' ? '<strong>You:</strong> ' : '<strong>ORA:</strong> ') + escapeHtml(liveUtterance);
    } else {
      transcriptBox.style.display = 'none';
    }

    // Mute button icon
    muteBtn.className = 'ora-w-ctrl-btn' + (isMuted ? ' muted' : '');
    muteBtn.innerHTML = isMuted
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  }

  // ─── Visualizer Loop ────────────────────────────────────────────────────────
  function startVisualizer() {
    if (animFrameId) return;
    function loop() {
      render();
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopVisualizer() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ─── Instant Barge-in / Audio Playback Cutoff ───────────────────────────────
  function flushPlaybackQueue() {
    for (let i = 0; i < activeSources.length; i++) {
      try {
        activeSources[i].stop();
        activeSources[i].disconnect();
      } catch (e) {}
    }
    activeSources = [];
    if (playbackContext) {
      audioQueueTime = playbackContext.currentTime;
    }
    speakingLevel = 0;
    if (voiceState === 'ora-speaking') {
      voiceState = 'active';
    }
    cancelIdleTimer();
  }

  // ─── Audio Playback (24 kHz PCM with 80ms Jitter Buffer) ────────────────────
  function playIncomingPcm(base64Pcm) {
    try {
      cancelIdleTimer();
      isWaitingForAi = false;

      if (!playbackContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        playbackContext = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = playbackContext;
      if (ctx.state === 'suspended') ctx.resume();

      const float32 = base64ToFloat32Array(base64Pcm);
      if (float32.length === 0) return;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      // If the queue has fallen behind or starting fresh, add 80ms jitter buffer
      if (audioQueueTime < now) {
        audioQueueTime = now + 0.08;
      }
      source.start(audioQueueTime);
      audioQueueTime += buffer.duration;

      activeSources.push(source);
      voiceState = 'ora-speaking';

      // Energy level for visualizer
      let sum = 0;
      const step = Math.max(1, Math.floor(float32.length / 32));
      for (let i = 0; i < float32.length; i += step) sum += float32[i] * float32[i];
      speakingLevel = Math.min(100, Math.floor(Math.sqrt(sum / (float32.length / step)) * 400));

      source.onended = function () {
        activeSources = activeSources.filter((s) => s !== source);
        if (activeSources.length === 0 && ctx.currentTime >= audioQueueTime - 0.05) {
          voiceState = 'active';
          speakingLevel = 0;
          isWaitingForAi = false;
          armIdleTimer();
        }
      };
    } catch (e) {
      console.error('[ORA Widget] Audio playback error:', e);
    }
  }

  // ─── Teardown / End Session ─────────────────────────────────────────────────
  function teardown() {
    cancelIdleTimer();
    isWaitingForAi = false;
    flushPlaybackQueue();
    voiceState = 'idle';
    isMuted = false;
    liveUtterance = '';
    liveSpeaker = null;
    showTranscript = false;
    lastSpeaker = null;
    userMicLevel = 0;
    speakingLevel = 0;
    audioQueueTime = 0;
    activeResumptionToken = null;
    stopVisualizer();

    if (processorNode) { try { processorNode.disconnect(); } catch (e) {} processorNode = null; }
    if (muteGainNode) { try { muteGainNode.disconnect(); } catch (e) {} muteGainNode = null; }
    if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
    if (audioContext) { try { audioContext.close(); } catch (e) {} audioContext = null; }
    if (playbackContext) { try { playbackContext.close(); } catch (e) {} playbackContext = null; }
    if (recognition) {
      try { recognition.onend = null; recognition.abort(); } catch (e) {}
      recognition = null;
    }
    if (geminiWs) {
      try { geminiWs.close(); } catch (e) {}
      geminiWs = null;
    }
    render();
  }

  // ─── SpeechRecognition (Instant Local User Transcript Pill) ────────────────
  function startSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    try {
      if (recognition) { try { recognition.onend = null; recognition.abort(); } catch (e) {} }
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = navigator.language || 'en-US';

      rec.onresult = function (event) {
        // Suppress transcription while AI is speaking (echo prevention)
        if (voiceState === 'idle' || voiceState === 'ora-speaking' || isMuted) return;

        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            if (res.isFinal) finalTranscript += res[0].transcript;
            else interimTranscript += res[0].transcript;
          }
        }
        const cleanText = (finalTranscript + ' ' + interimTranscript).trim();
        if (cleanText) {
          cancelIdleTimer();
          lastSpeaker = 'user';
          liveSpeaker = 'user';
          liveUtterance = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
          showTranscript = true;

          // Only set thinking state when a final phrase has been uttered
          if (event.results[event.results.length - 1] && event.results[event.results.length - 1].isFinal) {
            isWaitingForAi = true;
          }
          render();
        }
      };

      rec.onend = function () {
        if ((voiceState === 'active' || voiceState === 'ora-speaking') && !isMuted && recognition) {
          try { recognition.start(); } catch (e) {}
        }
      };

      rec.start();
      recognition = rec;
    } catch (e) {
      console.debug('[ORA Widget] SpeechRecognition:', e);
    }
  }

  // ─── Microphone Capture (16 kHz PCM) ────────────────────────────────────────
  let userSpeechSilenceTimeout = null;

  async function startMicCapture() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) audioContext = new AudioCtx({ sampleRate: 16000 });
    if (audioContext.state === 'suspended') await audioContext.resume();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStream = stream;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(1024, 1, 1);
    processorNode = processor;

    const muteNode = audioContext.createGain();
    muteNode.gain.value = 0;
    muteGainNode = muteNode;

    source.connect(processor);
    processor.connect(muteNode);
    muteNode.connect(audioContext.destination);

    processor.onaudioprocess = function (e) {
      if (voiceState === 'idle' || !geminiWs || geminiWs.readyState !== WebSocket.OPEN || isMuted) return;

      // ── Acoustic Echo Protection:
      // While ORA is actively speaking, gate the mic uplink to prevent speaker audio
      // from bleeding into the mic and triggering Gemini's self-barge-in interruption.
      if (voiceState === 'ora-speaking') {
        userMicLevel = 0;
        return;
      }

      const rawInput = e.inputBuffer.getChannelData(0);
      const inputData = downsampleTo16k(rawInput, audioContext.sampleRate);

      let sum = 0;
      for (let i = 0; i < rawInput.length; i++) sum += rawInput[i] * rawInput[i];
      const rms = Math.sqrt(sum / rawInput.length);
      userMicLevel = Math.min(100, Math.floor(rms * 400));

      // Voice Activity Detection (VAD)
      if (rms > 0.06) {
        cancelIdleTimer();
        if (userSpeechSilenceTimeout) {
          clearTimeout(userSpeechSilenceTimeout);
          userSpeechSilenceTimeout = null;
        }
      }

      const pcm16 = floatTo16BitPCM(inputData);
      const b64 = arrayBufferToBase64(pcm16.buffer);
      geminiWs.send(JSON.stringify({ type: 'audio', data: b64 }));
    };

    startSpeechRecognition();
  }


  // ─── Start Voice Session (with Resumption Support) ───────────────────────────
  async function startVoiceSession(resumeToken) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) audioContext = new AudioCtx({ sampleRate: 16000 });
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      if (!playbackContext) playbackContext = new AudioCtx({ sampleRate: 24000 });
      if (playbackContext.state === 'suspended') playbackContext.resume().catch(() => {});
    } catch (e) {}

    voiceState = 'connecting';
    errorMsg = '';
    liveUtterance = '';
    liveSpeaker = null;
    lastSpeaker = null;
    showTranscript = false;
    isMuted = false;
    isWaitingForAi = false;
    cancelIdleTimer();
    startVisualizer();

    const micPromise = startMicCapture().catch((err) => {
      console.warn('[ORA Widget] Mic permission error:', err);
      errorMsg = 'Mic permission required';
      voiceState = 'error';
      teardown();
      throw err;
    });

    try {
      if (!resumeToken) {
        sessionId = 'ses_w_' + Math.random().toString(36).substring(2, 9);
      }
      const wsBase = apiBase.replace(/^http/, 'ws');
      const custPayload = resolveCustomerPayload();
      const curPath = (typeof window !== 'undefined' && window.location.pathname) ? window.location.pathname : '/';
      const curTitle = (typeof document !== 'undefined' && document.title) ? document.title : '';
      let wsUri = wsBase + '/ws/voice' +
        '?publishableKey=' + encodeURIComponent(publishableKey) +
        '&sessionId=' + encodeURIComponent(sessionId) +
        '&deviceId=' + encodeURIComponent(custPayload.deviceId) +
        '&currentPath=' + encodeURIComponent(curPath) +
        '&pageTitle=' + encodeURIComponent(curTitle);

      if (custPayload.customerToken && custPayload.customerToken.customerId) {
        wsUri += '&customerId=' + encodeURIComponent(custPayload.customerToken.customerId) +
          '&customerTimestamp=' + encodeURIComponent(custPayload.customerToken.timestamp) +
          '&customerSignature=' + encodeURIComponent(custPayload.customerToken.signature);
      }

      if (resumeToken) {
        wsUri += '&resumptionToken=' + encodeURIComponent(resumeToken);
      }

      const ws = new WebSocket(wsUri);
      geminiWs = ws;

      ws.onopen = function () {
        console.log('[ORA Widget] ⚡ Connected to ORA Voice Proxy.');
        try {
          var pageCtx = extractPageContext();
          ws.send(JSON.stringify({
            type: 'page_context',
            data: pageCtx
          }));
          if (custPayload.identified) {
            ws.send(JSON.stringify({
              type: 'client_identify',
              customerToken: custPayload.customerToken,
              userData: custPayload.identified
            }));
          }
        } catch (e) {}
      };


      ws.onmessage = async function (event) {
        try {
          const msgData = typeof event.data === 'string' ? event.data : await (event.data).text();
          const msg = JSON.parse(msgData);

          if (msg.type === 'setup_complete' || msg.type === 'session_resumed') {
            voiceState = 'active';
            isWaitingForAi = false;
            audioQueueTime = 0;
            armIdleTimer();
            render();
            return;
          }


          if (msg.type === 'session_suspended') {
            activeResumptionToken = msg.resumptionToken || sessionId;
            voiceState = 'standby';
            cancelIdleTimer();
            isWaitingForAi = false;
            if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
            render();
            return;
          }

          if (msg.type === 'audio' && msg.data) {
            cancelIdleTimer();
            isWaitingForAi = false;
            if (lastSpeaker === 'user' && recognition) {
              try { recognition.abort(); } catch (e) {}
            }
            lastSpeaker = 'agent';
            liveSpeaker = 'agent';
            showTranscript = true;
            playIncomingPcm(msg.data);
            return;
          }

          if (msg.type === 'text' && msg.text) {
            cancelIdleTimer();
            isWaitingForAi = false;
            const cleanText = msg.text.trim();
            if (cleanText && !cleanText.startsWith('**') && !cleanText.startsWith('#')) {
              if (lastSpeaker !== 'agent') {
                lastSpeaker = 'agent';
                liveSpeaker = 'agent';
                liveUtterance = cleanText;
              } else {
                liveUtterance = mergeStreamingText(liveUtterance, cleanText);
              }
              showTranscript = true;
            }
            return;
          }

          if (msg.type === 'interrupted') {
            flushPlaybackQueue();
            lastSpeaker = 'user';
            liveSpeaker = 'user';
            liveUtterance = '';
            isWaitingForAi = true;
            cancelIdleTimer();
            if (recognition) { try { recognition.abort(); } catch (e) {} }
            return;
          }

          if (msg.type === 'turn_complete') {
            if (activeSources.length === 0) {
              voiceState = 'active';
              isWaitingForAi = false;
              armIdleTimer();
            }
            return;
          }

          if (msg.type === 'error') {
            errorMsg = msg.message || 'Voice error. Please retry.';
            voiceState = 'error';
            teardown();
            if (msg.message && msg.message.toLowerCase().includes('invalid')) {
              console.warn('[ORA Widget] ' + msg.message);
              if (host && host.parentNode) {
                host.parentNode.removeChild(host);
                host = null;
              }
            }
            return;
          }

          if (msg.type === 'tool_result') {
            if (msg.action && msg.action.type === 'navigate' && msg.action.destination) {
              var dest = msg.action.destination;
              if (dest.startsWith('#')) {
                var targetEl = document.querySelector(dest);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else if (dest.startsWith('/') || dest.startsWith('http')) {
                window.location.href = dest;
              }
            }
            return;
          }

          if (msg.type === 'session_closed') {
            if (voiceState !== 'idle' && voiceState !== 'standby') teardown();
            return;
          }
        } catch (err) {
          console.error('[ORA Widget] Message error:', err);
        }
      };

      ws.onerror = function (err) {
        console.error('[ORA Widget] WebSocket error:', err);
        errorMsg = 'Connection error';
        voiceState = 'error';
        teardown();
      };

      ws.onclose = function (ev) {
        if (ev && ev.code === 1008) {
          console.warn('[ORA Widget] Access denied by server (invalid publishable key).');
          if (host && host.parentNode) {
            host.parentNode.removeChild(host);
            host = null;
          }
        }
        if (voiceState !== 'idle' && voiceState !== 'standby') teardown();
      };

      await micPromise;
    } catch (err) {
      console.error('[ORA Widget] Start failed:', err);
    }
  }

  // ─── Verification & Initialization ──────────────────────────────────────────
  function initWidget() {
    if (!publishableKey) {
      console.warn('[ORA Widget] Disabled: "data-ora-key" attribute or window.ORA_CONFIG.key is required.');
      return;
    }

    // Two-stage bootstrap: verify key and active store status with server before mounting
    fetch(apiBase + '/api/v1/voice/session/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishableKey: publishableKey }),
    })
      .then(function (res) {
        if (!res.ok) {
          console.warn('[ORA Widget] Invalid or inactive publishable key ("' + publishableKey + '"). Storefront widget is disabled.');
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        mountWidget();
      })
      .catch(function (err) {
        console.warn('[ORA Widget] Key verification check failed:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
