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
        } else if (scriptUrl.hostname.indexOf('ora.ai') !== -1 || scriptUrl.hostname.indexOf('ora-ai') !== -1) {
          apiBase = scriptUrl.origin.replace('//cdn.', '//api.').replace('//app.', '//api.');
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
      apiBase = 'https://api.ora.ai';
    }
  }

  if (apiBase) {
    apiBase = apiBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }

  /**
   * Resolves a path against ORA's own origin, never the merchant's page.
   *
   * The widget runs on the merchant's storefront, so a relative URL would resolve to
   * their domain and 404. The script's own `src` is the reliable anchor. ORA serves
   * /audio-processors/ with `Access-Control-Allow-Origin: *` (see next.config.ts),
   * which is what lets AudioWorklet.addModule load the processor cross-origin.
   */
  function resolveOraAssetUrl(path) {
    try {
      if (scriptEl && scriptEl.src) return new URL(path, scriptEl.src).href;
    } catch (e) {}
    try {
      if (apiBase) return new URL(path, apiBase).href;
    } catch (e) {}
    return path;
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
  const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

  /**
   * Fails a connect attempt that never gets an answer.
   *
   * The orb ignores taps while the state is 'connecting', and nothing else times a
   * connect out. So a socket that opens and then stays silent — a server that abandons
   * session setup without closing the socket — left the widget stuck on "Connecting to
   * ORA…" and unable to start any further session until the page was reloaded. This is
   * the only path back to a usable state.
   *
   * Longer than the server's own 10s Gemini setup timeout, so a server that is going to
   * report a real error still gets the chance to.
   */
  const CONNECT_TIMEOUT_MS = 12000;
  let connectWatchdog = null;

  // Server-driven session notices (idle_warning / session_warning / session_ended).
  // Without these the server's warnings were sent and silently discarded, so a session
  // could simply vanish with nothing shown to the customer.
  let sessionNotice = null;
  let noticeClearTimer = null;
  // Pending teardown after the server ended the session, see teardownAfterPlayback().
  let pendingEndTimer = null;
  // Set while ORA says goodbye after the customer pressed stop, see endSessionWithGoodbye().
  let goodbyeTimer = null;

  // Mic noise gate state (see VAD_HANGOVER_MS / VAD_PREROLL_FRAMES).
  let lastSpeechAt = 0;
  let prerollFrames = [];

  /** Running estimate of ambient room level, adapted only while the gate is shut. */
  let vadNoiseFloor = 0.01;
  /** Qualifying chunks seen so far toward VAD_OPEN_CHUNKS. */
  let vadOpenStreak = 0;
  /** Whether the gate is currently passing audio (drives the hysteresis branch). */
  let vadGateOpen = false;
  /** Timestamp the gate last opened, for the energy-dropoff check below. */
  let vadGateOpenedAt = 0;
  /** Loudest RMS seen since the gate opened (see VAD_PEAK_DROP_RATIO). */
  let vadUtterancePeak = 0;
  /**
   * When the last `user_speaking` keep-alive was sent, so an open gate produces at most
   * one per USER_SPEAKING_PING_MS rather than one per 64ms chunk.
   */
  let lastSpeakingPingAt = 0;
  /**
   * Chunks remaining in the start-of-session room measurement. Armed by
   * resetVadState(), which startMicCapture() calls — the constant it is set from is
   * declared further down this scope, so it cannot be referenced here.
   */
  let vadCalibrationLeft = 0;

  /**
   * Clears the gate's learned state between sessions. Without this, a noise floor
   * measured in a loud room would carry into the next session and hold the gate shut
   * against a soft speaker until it decayed.
   */
  function resetVadState() {
    lastSpeechAt = 0;
    prerollFrames.length = 0;
    vadNoiseFloor = 0.01;
    lastSpeakingPingAt = 0;
    vadOpenStreak = 0;
    vadGateOpen = false;
    vadGateOpenedAt = 0;
    vadUtterancePeak = 0;
    vadCalibrationLeft = VAD_CALIBRATION_CHUNKS;
  }

  // Customer Details Confirmation Card State
  let customerDetails = { name: '', email: '', phone: '', address: '' };
  let isEditingDetails = false;
  let isDetailsConfirmed = false;
  let showConfirmCard = false;
  let toastTimer = null;

  // Audio Contexts & Buffers
  let audioContext = null;
  let playbackContext = null;
  let mediaStream = null;
  let processorNode = null;
  let muteGainNode = null;
  let audioQueueTime = 0;
  let activeSources = [];
  /**
   * True from the first audio chunk of an agent turn until that turn's playback is
   * settled. Gates the playback acknowledgement to one per turn — the server refreshes
   * its idle clock on that message, so sending it twice would hold the session open.
   */
  let playbackTurnOpen = false;
  let playbackWatchdogTimer = null;
  /** Consecutive watchdog firings that found the audio clock not running. */
  let playbackStallChecks = 0;
  /** True while the server is actively generating or streaming audio chunks for the current turn. */
  let serverTurnActive = false;
  let vadDropStreak = 0;

  /**
   * A navigation ORA has asked for, held until it has finished saying where it is going.
   *
   * Navigating immediately assigned window.location.href, which unloaded the page — and
   * with it the widget and its WebSocket — the instant the tool result arrived. ORA was
   * cut off mid-sentence, so the visitor got a silent page change, and whether any words
   * escaped before the unload varied from run to run.
   */
  let pendingNavigation = null;
  let pendingNavTimer = null;
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
      const int16 = new Int16Array(bytes.buffer, 0, Math.floor(len / 2));
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

  // ─── Fast Collision-Resistant 53-bit String Hasher for Deduplication ───────
  function hashString(str) {
    var h1 = 0xdeadbeef;
    var h2 = 0x41c64e6d;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
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

      // 5. Multi-Strategy E-Commerce Product Extractor
      var product = null;

      // ── Strategy A: Schema.org JSON-LD (Mobile Safari & Blink Safe via textContent/innerHTML) ──
      var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < ldScripts.length; i++) {
        try {
          var rawJson = ldScripts[i].textContent || ldScripts[i].innerHTML || ldScripts[i].text || '';
          if (!rawJson || !rawJson.trim()) continue;
          var parsed = JSON.parse(rawJson);
          var items = Array.isArray(parsed) ? parsed : [parsed];
          var flattened = items.flatMap(function(x) { 
            if (!x) return [];
            if (x['@graph'] && Array.isArray(x['@graph'])) return x['@graph'];
            return [x]; 
          });
          var prod = flattened.find(function(node) {
            if (!node || !node['@type']) return false;
            var t = node['@type'];
            return t === 'Product' || t === 'ProductGroup' || (Array.isArray(t) && (t.indexOf('Product') !== -1 || t.indexOf('ProductGroup') !== -1));
          });
          if (prod) {
            var offer = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
            var priceVal = null;
            var currVal = 'USD';
            var availVal = 'unknown';

            if (offer) {
              if (offer.price !== undefined && offer.price !== null && offer.price !== '') {
                priceVal = Number(String(offer.price).replace(/[^0-9.]/g, ''));
              } else if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
                priceVal = Number(String(offer.lowPrice).replace(/[^0-9.]/g, ''));
              }
              if (offer.priceCurrency) currVal = String(offer.priceCurrency).toUpperCase();
              if (offer.availability) {
                availVal = /instock|in_stock/i.test(String(offer.availability)) ? 'in_stock' : (/outofstock|out_of_stock/i.test(String(offer.availability)) ? 'out_of_stock' : 'unknown');
              }
            }

            // Support Shopify ProductGroup with hasVariant array
            if (prod.hasVariant && Array.isArray(prod.hasVariant) && prod.hasVariant.length > 0) {
              var anyInStock = prod.hasVariant.some(function(v) {
                var vOffer = v.offers;
                return vOffer && /instock|in_stock/i.test(String(vOffer.availability));
              });
              availVal = anyInStock ? 'in_stock' : 'out_of_stock';
              if (priceVal === null && prod.hasVariant[0] && prod.hasVariant[0].offers) {
                var firstOffer = prod.hasVariant[0].offers;
                if (firstOffer.price !== undefined && firstOffer.price !== null) {
                  priceVal = Number(String(firstOffer.price).replace(/[^0-9.]/g, ''));
                }
                if (firstOffer.priceCurrency) currVal = String(firstOffer.priceCurrency).toUpperCase();
              }
            }

            var imgVal = null;
            if (prod.image) {
              if (typeof prod.image === 'string') imgVal = prod.image;
              else if (Array.isArray(prod.image) && prod.image[0]) {
                imgVal = typeof prod.image[0] === 'string' ? prod.image[0] : (prod.image[0].url || null);
              } else if (prod.image.url) imgVal = prod.image.url;
            }

            product = {
              name: prod.name || title,
              price: isNaN(priceVal) ? null : priceVal,
              currency: currVal,
              availability: availVal,
              sku: prod.sku || prod.productID || prod.identifier || null,
              image: imgVal,
              description: prod.description ? String(prod.description).slice(0, 500) : null
            };
            break;
          }
        } catch (e) {}
      }

      // ── Strategy B: Next.js Client State (__NEXT_DATA__) ──
      if ((!product || product.price === null) && typeof window !== 'undefined' && window.__NEXT_DATA__ && window.__NEXT_DATA__.props) {
        try {
          var pageProps = window.__NEXT_DATA__.props.pageProps || {};
          var candidate = pageProps.product || pageProps.item || (pageProps.data && pageProps.data.product) || (pageProps.initialState && pageProps.initialState.product) || null;
          if (candidate && (candidate.title || candidate.name)) {
            var nPrice = candidate.price || (candidate.priceRange && candidate.priceRange.minVariantPrice && candidate.priceRange.minVariantPrice.amount) || (candidate.variants && candidate.variants[0] && candidate.variants[0].price) || candidate.formattedPrice || null;
            var numPrice = nPrice !== null ? Number(String(nPrice).replace(/[^0-9.]/g, '')) : null;
            var nCurr = candidate.currency || candidate.currencyCode || (candidate.priceRange && candidate.priceRange.minVariantPrice && candidate.priceRange.minVariantPrice.currencyCode) || 'USD';
            var nImg = (candidate.images && candidate.images[0] && candidate.images[0].url) || (candidate.image && candidate.image.url) || (typeof candidate.image === 'string' ? candidate.image : null);
            var nSku = candidate.sku || candidate.id || candidate.handle || null;
            var nAvail = candidate.availableForSale !== undefined ? (candidate.availableForSale ? 'in_stock' : 'out_of_stock') : 'unknown';

            product = {
              name: (candidate.title || candidate.name).trim(),
              price: isNaN(numPrice) ? null : numPrice,
              currency: String(nCurr).toUpperCase(),
              availability: nAvail,
              sku: nSku ? String(nSku) : null,
              image: nImg,
              description: candidate.description ? String(candidate.description).slice(0, 500) : null
            };
          }
        } catch (e) {}
      }

      // ── Strategy C: OpenGraph & Microdata Meta Tags ──
      if (!product || product.price === null) {
        try {
          var ogTitle = (document.querySelector('meta[property="og:title"]') && document.querySelector('meta[property="og:title"]').getAttribute('content')) ||
                        (document.querySelector('meta[name="twitter:title"]') && document.querySelector('meta[name="twitter:title"]').getAttribute('content')) || '';
          var ogPrice = (document.querySelector('meta[property="product:price:amount"]') && document.querySelector('meta[property="product:price:amount"]').getAttribute('content')) ||
                        (document.querySelector('meta[property="og:price:amount"]') && document.querySelector('meta[property="og:price:amount"]').getAttribute('content')) ||
                        (document.querySelector('meta[name="twitter:data1"]') && document.querySelector('meta[name="twitter:data1"]').getAttribute('content')) || '';
          var ogCurrency = (document.querySelector('meta[property="product:price:currency"]') && document.querySelector('meta[property="product:price:currency"]').getAttribute('content')) ||
                           (document.querySelector('meta[property="og:price:currency"]') && document.querySelector('meta[property="og:price:currency"]').getAttribute('content')) || 'USD';
          var ogImage = (document.querySelector('meta[property="og:image"]') && document.querySelector('meta[property="og:image"]').getAttribute('content')) || '';
          var ogAvail = (document.querySelector('meta[property="product:availability"]') && document.querySelector('meta[property="product:availability"]').getAttribute('content')) || '';

          // Microdata fallback [itemtype*="Product"]
          if (!ogTitle || !ogPrice) {
            var itemScopeProd = document.querySelector('[itemtype*="Product"], [itemscope][itemtype*="schema.org"]');
            if (itemScopeProd) {
              var nameEl = itemScopeProd.querySelector('[itemprop="name"]');
              if (nameEl) ogTitle = (nameEl.innerText || nameEl.textContent || '').trim();
              var priceEl = itemScopeProd.querySelector('[itemprop="price"]');
              if (priceEl) ogPrice = priceEl.getAttribute('content') || (priceEl.innerText || priceEl.textContent || '').trim();
              var currEl = itemScopeProd.querySelector('[itemprop="priceCurrency"]');
              if (currEl) ogCurrency = currEl.getAttribute('content') || (currEl.innerText || currEl.textContent || '').trim() || 'USD';
            }
          }

          if (ogTitle && ogPrice) {
            var parsedOgPrice = Number(String(ogPrice).replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedOgPrice) && parsedOgPrice > 0) {
              product = {
                name: ogTitle.trim(),
                price: parsedOgPrice,
                currency: ogCurrency.toUpperCase(),
                availability: /instock|in_stock|available/i.test(ogAvail) ? 'in_stock' : 'unknown',
                sku: null,
                image: ogImage || null,
                description: metaDesc || null
              };
            }
          }
        } catch (e) {}
      }

      // ── Strategy D: Dynamic Heuristic PDP Scraper (HTML Semantics + Price Patterns) ──
      if (!product || product.price === null) {
        try {
          var addToCartBtn = document.querySelector(
            'button[name="add"], button[id*="add-to-cart"], button[class*="add-to-cart"], button[class*="addToCart"], ' +
            'form[action*="/cart/add"] button, [data-action="add-to-cart"], button[aria-label*="cart" i], ' +
            'button[aria-label*="bag" i], a[href*="/checkout"], button[class*="buy-now"]'
          );

          if (!addToCartBtn) {
            var allBtns = document.querySelectorAll('button, a.btn, a.button, input[type="submit"]');
            for (var b = 0; b < allBtns.length; b++) {
              var btnTxt = (allBtns[b].innerText || allBtns[b].textContent || '').trim().toLowerCase();
              if (/add to (cart|bag)|buy now|order now|কার্ট|কিনুন|order online/i.test(btnTxt)) {
                addToCartBtn = allBtns[b];
                break;
              }
            }
          }

          var isProductUrl = /\/(products?|items?|p|dp|goods|shop)\/[^\/]+/i.test(pathname);
          if (addToCartBtn || isProductUrl) {
            var h1El = document.querySelector('h1:not(#ora-voice-root h1)') || 
                       document.querySelector('[class*="product__title"], [class*="product-title"], [class*="productName"]');
            var candidateTitle = h1El ? (h1El.innerText || h1El.textContent || '').trim() : title;

            var priceEl = document.querySelector('[class*="price"]:not(#ora-voice-root *), [id*="price"], [data-price], [itemprop="price"]');
            var priceText = priceEl ? (priceEl.innerText || priceEl.textContent || '').trim() : '';

            if (!priceText && h1El && h1El.parentElement) {
              priceText = (h1El.parentElement.innerText || h1El.parentElement.textContent || '').slice(0, 300);
            }

            var priceMatch = priceText.match(/(?:(\$|৳|€|£|₹|Rs\.?|CAD|USD|AUD|GBP|BDT|Tk)\s*([\d,]+(?:\.\d{1,2})?))|(?:([\d,]+(?:\.\d{1,2})?)\s*(\$|৳|€|£|₹|BDT|Tk|\/-))/i);
            if (candidateTitle && priceMatch) {
              var rawCurrency = priceMatch[1] || priceMatch[4] || 'USD';
              var rawAmount = priceMatch[2] || priceMatch[3] || '';
              var cleanAmount = Number(rawAmount.replace(/,/g, ''));

              var normalizedCurrency = 'USD';
              if (/৳|BDT|Tk/i.test(rawCurrency)) normalizedCurrency = 'BDT';
              else if (/€|EUR/i.test(rawCurrency)) normalizedCurrency = 'EUR';
              else if (/£|GBP/i.test(rawCurrency)) normalizedCurrency = 'GBP';
              else if (/₹|Rs|INR/i.test(rawCurrency)) normalizedCurrency = 'INR';
              else if (/CAD/i.test(rawCurrency)) normalizedCurrency = 'CAD';
              else if (/AUD/i.test(rawCurrency)) normalizedCurrency = 'AUD';

              if (!isNaN(cleanAmount) && cleanAmount > 0 && candidateTitle.length >= 2) {
                var imgEl = (h1El && h1El.parentElement && h1El.parentElement.querySelector('img')) ||
                            document.querySelector('[class*="product"] img, [class*="gallery"] img, [data-main-image] img, img[alt*="' + candidateTitle.slice(0, 20).replace(/"/g, '') + '" i]');
                var prodImg = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || null) : null;
                if (prodImg && !prodImg.startsWith('http')) {
                  try { prodImg = new URL(prodImg, window.location.origin).href; } catch (e) {}
                }

                var isSoldOut = false;
                if (addToCartBtn) {
                  var btnTxt = (addToCartBtn.innerText || addToCartBtn.textContent || '').trim().toLowerCase();
                  isSoldOut = addToCartBtn.disabled || addToCartBtn.hasAttribute('disabled') || /sold out|out of stock|unavailable|স্টক আউট/i.test(btnTxt);
                }
                if (!isSoldOut) {
                  var badgeEl = document.querySelector('.badge--sold-out, [class*="sold-out"], [class*="soldOut"]');
                  if (badgeEl && /sold out/i.test(badgeEl.innerText || '')) isSoldOut = true;
                }

                product = {
                  name: candidateTitle,
                  price: cleanAmount,
                  currency: normalizedCurrency,
                  availability: isSoldOut ? 'out_of_stock' : 'in_stock',
                  sku: null,
                  image: prodImg,
                  description: metaDesc || null
                };
              }
            }
          }
        } catch (e) {}
      }

      var selectedVariantId = null;
      try {
        var varInput = document.querySelector('form[action*="/cart/add"] [name="id"], [data-selected-variant-id]');
        if (varInput && varInput.value) {
          selectedVariantId = String(varInput.value);
        } else if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.selectedVariantId) {
          selectedVariantId = String(window.ShopifyAnalytics.meta.selectedVariantId);
        } else {
          var urlVar = new URLSearchParams(window.location.search).get('variant');
          if (urlVar) selectedVariantId = urlVar;
        }
      } catch (e) {}

      var contentSignature = title + '|' + metaDesc + '|' + headings.map(function(h){return h.text}).join(',') + '|' + (product ? (product.name + ':' + product.price + ':' + product.currency) : '') + '|' + cleanBodyText.slice(0, 500);
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
        selectedVariantId: selectedVariantId,
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
      product: telemetry.product,
      selectedVariantId: telemetry.selectedVariantId
    };
  }

  // ─── Universal Telemetry Dispatcher with Deduplication & Forced Refresh ─────
  var lastTelemetrySyncTime = 0;

  function triggerUniversalTelemetrySync(force) {
    try {
      if (!publishableKey || !apiBase) return;
      var telemetry = extractUniversalDomTelemetry();
      if (!telemetry || !telemetry.url) return;

      var storageKey = '__ora_dom_' + telemetry.pathname;
      var cachedHash = window.sessionStorage ? window.sessionStorage.getItem(storageKey) : null;
      
      if (!force && cachedHash === telemetry.contentHash) {
        // Content has not changed since last sync in this session — skip redundant network traffic
        return;
      }

      var endpoint = apiBase + '/api/v1/ingestion/telemetry';
      var payload = JSON.stringify(telemetry);

      lastTelemetrySyncTime = Date.now();

      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-key': publishableKey,
        },
        body: payload,
      })
      .then(function(res) {
        var hasMeaningfulContent =
          (telemetry.headings && telemetry.headings.length > 0) ||
          (telemetry.cards && telemetry.cards.length > 0) ||
          !!telemetry.product ||
          (telemetry.bodyTextSnippet && telemetry.bodyTextSnippet.length >= 80);

        if (res.ok && window.sessionStorage && hasMeaningfulContent) {
          window.sessionStorage.setItem(storageKey, telemetry.contentHash);
        }
      })
      .catch(function () {});
    } catch (e) {}
  }

  // Backward compatibility alias
  function triggerPassiveStorefrontSync(force) {
    triggerUniversalTelemetrySync(force);
  }

  // ─── Mobile Hydration & Dynamic DOM Observer ─────────────────────────────────
  function initHydrationAndDomObserver() {
    try {
      function runIdleTelemetry(delayMs) {
        setTimeout(function () {
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(function () {
              triggerUniversalTelemetrySync();
            }, { timeout: 3000 });
          } else {
            setTimeout(function () {
              triggerUniversalTelemetrySync();
            }, 60);
          }
        }, delayMs);
      }

      // Defer background telemetry to idle time so storefront initial rendering is never blocked
      runIdleTelemetry(1500);
      runIdleTelemetry(4500);

      // 2. MutationObserver for dynamic Next.js / React CSR component hydration with 15s throttle
      if (typeof window !== 'undefined' && window.MutationObserver && document.body) {
        var mutationTimer = null;
        var observer = new MutationObserver(function (mutations) {
          var isWidgetInternal = mutations.every(function (m) {
            return m.target && (m.target.closest && (m.target.closest('#ora-voice-root') || m.target.closest('.ora-shadow-host')));
          });
          if (isWidgetInternal) return;

          if (mutationTimer) clearTimeout(mutationTimer);
          mutationTimer = setTimeout(function () {
            var now = Date.now();
            if (now - lastTelemetrySyncTime >= 15000) {
              triggerUniversalTelemetrySync();
            }
          }, 1000);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
      }
    } catch (e) {}
  }

  // ─── SPA Route Transition Listener (Next.js, Nuxt, React CSR) ───────────────
  function initSpaRouteObserver() {
    try {
      var lastPath = window.location.pathname;
      function checkRouteChange() {
        if (window.location.pathname !== lastPath) {
          lastPath = window.location.pathname;
          // Debounce slightly to allow dynamic SPA views (Next.js/React) to render DOM
          setTimeout(function () {
            triggerUniversalTelemetrySync(true);
          }, 1200);
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
  initHydrationAndDomObserver();

  // ─── Customer Identity & Fail-Closed Consent Resolution ─────────────────────
  /**
   * Whether the visitor may be remembered across visits.
   *
   * Fail-closed: anything other than an explicit true — including an unanswered consent
   * banner — is a no. Governs every write to localStorage, which outlives the visit.
   * sessionStorage is deliberately NOT gated on it: it dies with the tab and only holds
   * the id of a conversation already in progress.
   */
  function isTrackingConsented() {
    if (_cfg && _cfg.consent !== undefined) {
      return _cfg.consent === true;
    }
    if (window.Shopify && window.Shopify.customerPrivacy && typeof window.Shopify.customerPrivacy.userCanBeTracked === 'function') {
      return window.Shopify.customerPrivacy.userCanBeTracked() === true;
    }
    // Default to true for first-party functional local storage (e.g. device ID and returning-visitor flag).
    return true;
  }

  function getOrCreateDeviceId() {
    var consentAllowed = isTrackingConsented();

    // Fail-Closed: Any state other than strict true uses an ephemeral ID.
    //
    // Held in sessionStorage rather than only in memory. A page navigation destroys the
    // closure, so a memory-only id was reissued on every page load — and the server
    // binds session adoption to the device id, so a non-consented visitor could never
    // rebind to their own conversation and got a fresh one on every click.
    //
    // sessionStorage does not weaken the consent position: the id still dies with the
    // tab, still never identifies the visitor across visits, and is still never written
    // to localStorage. It survives exactly the navigation it needs to survive.
    if (consentAllowed !== true) {
      if (!window.__oraEphemeralDeviceId) {
        var storedEphemeral = null;
        try {
          storedEphemeral = window.sessionStorage
            ? window.sessionStorage.getItem('ora_ephemeral_device_id')
            : null;
        } catch (e) {}

        window.__oraEphemeralDeviceId =
          storedEphemeral || 'ephem_' + Math.random().toString(36).substring(2, 15);

        if (!storedEphemeral) {
          try {
            if (window.sessionStorage) {
              window.sessionStorage.setItem('ora_ephemeral_device_id', window.__oraEphemeralDeviceId);
            }
          } catch (e) {}
        }
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

  // ─── Session Continuity Across Page Loads ──────────────────────────────────
  /**
   * Where the in-progress conversation is parked while the browser replaces the page.
   *
   * A storefront is a multi-page app: clicking a product link is a full document
   * reload, and everything in this closure — sessionId included — is destroyed. The
   * widget then minted a fresh session id and the server, seeing an id it had never
   * met, opened a new conversation and greeted the customer again. Three clicks
   * through a catalogue meant three introductions and three lost conversations.
   *
   * sessionStorage is the right store for this and not localStorage: the state is only
   * meaningful inside the tab that owns the conversation, and it must not outlive it.
   */
  var NAV_STATE_KEY = 'ora_session_state';

  /** Marks a device that has spoken to ORA before, for the welcome-back greeting. */
  var VISITED_KEY = 'ora_has_visited';

  /**
   * How stale a parked session may be and still be resumed.
   *
   * Must stay BELOW the server's SESSION_PARK_GRACE_MS (30s), which is how long the
   * server holds the Gemini session with no browser attached. Claiming a resume the
   * server can no longer honour is the worst of both outcomes: the reconnect suppresses
   * the greeting because it believes it is mid-conversation, while the server has
   * already torn the old session down and started a fresh one with no memory of it — so
   * ORA comes back silent AND amnesiac. 25s leaves margin for a slow connect.
   */
  var NAV_RESUME_WINDOW_MS = 25000;

  function readNavState() {
    try {
      if (!window.sessionStorage) return null;
      var raw = window.sessionStorage.getItem(NAV_STATE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.sessionId) return null;
      var age = Date.now() - (parsed.savedAt || 0);
      // Clean up if abandoned for more than 30 minutes
      if (age > 30 * 60 * 1000) {
        window.sessionStorage.removeItem(NAV_STATE_KEY);
        return null;
      }
      // If the page transition took longer than NAV_RESUME_WINDOW_MS, do not auto-resume microphone,
      // but retain sessionId and greeted state for when the customer taps the widget.
      if (age > NAV_RESUME_WINDOW_MS) {
        parsed.wasVoiceActive = false;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeNavState(patch) {
    try {
      if (!window.sessionStorage) return;
      var current = readNavState() || {};
      var next = {
        sessionId: sessionId,
        greeted: current.greeted === true,
        wasVoiceActive: current.wasVoiceActive === true,
        savedAt: Date.now(),
      };
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
      }
      window.sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  function clearNavState() {
    try {
      if (window.sessionStorage) window.sessionStorage.removeItem(NAV_STATE_KEY);
    } catch (e) {}
  }

  function hasVisitedBefore() {
    if (!isTrackingConsented()) return false;
    try {
      return window.localStorage.getItem(VISITED_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markVisited() {
    if (!isTrackingConsented()) return;
    try {
      window.localStorage.setItem(VISITED_KEY, '1');
    } catch (e) {}
  }

  /**
   * Adopts a conversation parked by the previous page, if there is a live one.
   *
   * Runs once at load. Reusing the id is the whole mechanism: the server keys its
   * conversation record and its greeting flag on it, so adopting the id restores the
   * turn history and suppresses the greeting without either side having to negotiate.
   */
  var resumedSession = readNavState();
  var resumedFromNavigation = false;
  if (resumedSession) {
    sessionId = resumedSession.sessionId;
    resumedFromNavigation = true;
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
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
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

    /* ── Customer Details Verification & Confirmation Card ── */
    .ora-w-confirm-card {
      pointer-events: auto;
      max-width: 320px;
      width: calc(100vw - 36px);
      background: rgba(17, 17, 17, 0.95);
      border: 1px solid rgba(200, 240, 49, 0.35);
      border-radius: 16px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(200, 240, 49, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      padding: 14px 16px;
      margin-bottom: 10px;
      color: #FAFAFA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      animation: ora-w-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      box-sizing: border-box;
      text-align: left;
    }
    @keyframes ora-w-pop-in {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .ora-w-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .ora-w-card-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: -0.01em;
      color: #FAFAFA;
    }
    .ora-w-card-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ora-w-icon-btn {
      background: transparent;
      border: none;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background-color 0.15s;
    }
    .ora-w-icon-btn:hover {
      color: #FAFAFA;
      background: rgba(255, 255, 255, 0.08);
    }
    .ora-w-field-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ora-w-field-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }
    .ora-w-field-label {
      color: #9CA3AF;
      min-width: 65px;
      font-weight: 500;
    }
    .ora-w-field-value {
      color: #FAFAFA;
      font-weight: 500;
      text-align: right;
      word-break: break-word;
      flex: 1;
    }
    .ora-w-field-value.highlight {
      color: #C8F031;
      animation: ora-w-highlight-pulse 1.4s ease;
    }
    @keyframes ora-w-highlight-pulse {
      0% { color: #C8F031; text-shadow: 0 0 8px rgba(200, 240, 49, 0.6); }
      100% { color: #FAFAFA; text-shadow: none; }
    }
    .ora-w-form-group {
      margin-bottom: 8px;
    }
    .ora-w-form-group label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: #9CA3AF;
      margin-bottom: 4px;
      text-align: left;
    }
    .ora-w-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 6px 10px;
      color: #FAFAFA;
      font-size: 12px;
      font-family: inherit;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }
    .ora-w-input:focus {
      border-color: #C8F031;
    }
    .ora-w-card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    .ora-w-btn {
      flex: 1;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: none;
      transition: background-color 0.15s, transform 0.05s;
    }
    .ora-w-btn:active {
      transform: scale(0.98);
    }
    .ora-w-btn-primary {
      background: #C8F031;
      color: #111111;
    }
    .ora-w-btn-primary:hover {
      background: #B8DD28;
    }
    .ora-w-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #FAFAFA;
    }
    .ora-w-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .ora-w-confirm-toast {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #C8F031;
      font-weight: 600;
      font-size: 12px;
      padding: 6px 0;
      animation: ora-w-pop-in 0.2s ease;
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
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
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
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
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
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      will-change: transform;
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
  let controlsBar = null;
  let muteBtn = null;
  let closeBtn = null;
  let canvasTime = 0;
  let canvasAnimId = null;

  // Confirmation Card DOM refs
  let confirmCard = null;
  let cardView = null;
  let cardEdit = null;
  let fieldList = null;
  let toggleEditBtn = null;
  let closeCardBtn = null;
  let editBtn = null;
  let confirmBtn = null;
  let cancelEditBtn = null;
  let saveEditBtn = null;
  let confirmToast = null;
  let inputName = null;
  let inputEmail = null;
  let inputPhone = null;
  let inputAddress = null;

  // ─── Idle Inactivity Timer (Conversational Standby Protocol) ───────────────

  /**
   * Absolute RMS floor. The gate never opens below this, purely so a silent room with
   * a near-zero noise estimate cannot let electrical hiss through.
   *
   * This replaces a single fixed 0.018 threshold, which could not work for everyone:
   * soft speech measures roughly 0.01-0.03 RMS on a laptop mic, so 0.018 fell in the
   * middle of it and gated quiet talkers out completely — ORA heard nothing at all.
   * Meanwhile a noisy room sits at 0.005-0.015, close enough that no single number
   * separates the two. The gate below keys off signal-to-noise instead of level.
   */
  const VAD_ABS_FLOOR = 0.005;

  /**
   * Hard minimum for the open threshold. The adaptive threshold may rise above this in
   * a noisy room but never falls below it.
   *
   * This is the important guard. Without it, a quiet room drove the floor to ~0.002 and
   * the open threshold to 0.002 * VAD_SNR_OPEN = 0.007. Intermittent noise (a TV in the
   * next room, passing traffic) never raises the floor, because it decays during the
   * gaps, so every burst cleared the low threshold and reached Gemini. The adaptive part
   * still earns its place in loud rooms; it just must not make a quiet room worse.
   *
   * It was 0.03, set when autoGainControl was off. At that setting a built-in laptop or
   * phone mic puts ordinary conversational speech BELOW the floor, so the gate never
   * opened and the customer's voice never left the browser — the loudest of the four
   * reasons a talking shopper was treated as silent. With AGC now normalising the input
   * level, 0.012 admits a quiet voice while still sitting above the residual noise of a
   * gain-corrected quiet room, and the SNR ratio carries the rest of the work.
   */
  const VAD_MIN_OPEN = 0.012;

  /**
   * How far above the measured noise floor a chunk must sit to OPEN the gate
   * (~11 dB). Because this is a ratio, a whisper in a silent room passes just as
   * readily as a shout in a loud one, which is the property a fixed threshold lacked.
   */
  const VAD_SNR_OPEN = 2.4;

  /**
   * Lower ratio required to KEEP the gate open (~6 dB). Classic dual-threshold
   * hysteresis: it stops the gate chattering shut on the quiet part of a word while
   * still demanding a clear onset to open in the first place.
   */
  const VAD_SNR_CLOSE = 1.8;

  /**
   * Consecutive qualifying chunks needed before the gate opens (~128ms onset requirement).
   * Rejects brief transients while quickly opening on human speech onset.
   */
  const VAD_OPEN_CHUNKS = 2;

  /**
   * Noise-floor tracking rates.
   *
   * The floor follows the *minimum* envelope: it drops quickly toward any quieter
   * reading and creeps upward slowly. Speech is transient relative to room noise, so
   * a slow rise means a talking customer barely moves the floor while a sustained
   * noisy room does raise it.
   *
   * Adaptation runs whether the gate is open or shut. An earlier version only learned
   * while shut, which latched the gate permanently open if a session began in a loud
   * room: the initial estimate was too low, noise opened the gate, and the floor then
   * never updated to catch up.
   */
  const VAD_FLOOR_DECAY = 0.20;
  const VAD_FLOOR_ATTACK_CLOSED = 0.05;
  /**
   * Rise rate while the gate is open. It was 0.01, a ~6.4s time constant at 64ms per
   * frame, which is the reason a gate that opened just before the room got louder (mic
   * AGC ramping back up after a loud syllable, a fan starting, ORA's own voice leaking
   * from the speakers) could hold open for seconds: the close threshold is derived from
   * the floor, so until the floor caught up with the new ambient level, ambient alone
   * kept clearing it. 0.04 catches up in ~1.6s instead, still slow enough that the
   * speaker's own voice does not raise the floor against them mid-sentence.
   */
  const VAD_FLOOR_ATTACK_OPEN = 0.04;

  /** Ceiling on the learned floor, so even a very loud room still admits speech. */
  const VAD_FLOOR_MAX = 0.02;

  /**
   * Chunks at the start of a session during which the gate is held shut to measure the
   * room (~1s at 128ms per chunk). Without this the gate has only a guessed floor to
   * work from on its first decision. Nothing is lost: ORA is delivering its greeting
   * at this point, and the mic uplink is echo-gated while it speaks anyway.
   */
  const VAD_CALIBRATION_CHUNKS = 8;

  /** Client-side conversational dormancy before the session is suspended to standby. */
  const CLIENT_STANDBY_MS = 120000; // 120 seconds (2 minutes, aligned with 90s server idle warning)

  /**
   * Minimum gap between `user_speaking` keep-alives sent while the gate is open.
   *
   * The server cannot treat raw audio frames as proof of a live customer — they carry
   * room noise, and would keep an abandoned session open indefinitely. It therefore
   * infers activity from recognised speech only: Gemini's transcription, this widget's
   * SpeechRecognition result, or a barge-in. All three can be absent while somebody is
   * genuinely talking (transcription lags, SpeechRecognition does not exist in Firefox
   * and only reports on a final phrase, and barge-in cannot fire because the uplink is
   * gated shut while ORA speaks), and the session then closed on a talking customer.
   *
   * This is the fourth source, and unlike a raw frame it carries a judgement: it is only
   * sent once the gate has cleared its full onset requirement, which is the same bar the
   * uplink itself has to clear.
   */
  const USER_SPEAKING_PING_MS = 2000;

  /**
   * How long the mic uplink keeps streaming after speech drops below the threshold.
   *
   * MUST stay above the server's SPEECH_SILENCE_DURATION_MS (250ms): Gemini decides the
   * customer's turn has ended by hearing silence, so we have to keep feeding it real
   * (quiet) audio for a moment after they stop. Cut the stream too early and Gemini waits
   * for silence it never receives, hanging the turn instead of speeding it up. Nothing
   * else closes the turn — no audioStreamEnd, no explicit activityEnd is ever sent.
   *
   * The two must move together, server first: lowering this below a server still set to
   * 400ms hangs every turn.
   *
   * 480ms is measured, not derived. Replaying recorded speech into a live session and
   * cutting the uplink after exactly this many milliseconds of quiet audio: 320ms hung
   * the turn outright (no response in 12s, 2 of 2 runs), while 384, 448 and 512ms all
   * answered on every run. Gemini needs roughly 130ms of audio beyond its own
   * silenceDurationMs before it commits to the turn ending, so the margin here has to
   * cover that plus ~64ms of frame quantisation, not just clock skew. 480ms keeps
   * ~230ms over the server's 250ms, one frame clear of the nearest value proven to work.
   */
  const VAD_HANGOVER_MS = 480;

  /**
   * Energy-dropoff guard, the second half of the fix for a gate stuck open on noise.
   *
   * Raising VAD_FLOOR_ATTACK_OPEN shortens that stall but cannot remove it, because the
   * floor still has to travel. This check is level-independent instead: once an
   * utterance has run long enough to have a meaningful peak, a fall to a small fraction
   * of that peak means the speaker stopped, whatever the room is doing. The hangover
   * then starts on time rather than waiting for the adaptive threshold to catch up.
   *
   * The ratio is set to 0.15 with a multi-frame requirement so natural unvoiced
   * consonants and quiet syllables do not chop words mid-sentence.
   */
  const VAD_PEAK_DROP_RATIO = 0.15;

  /**
   * How long the gate must have been open before the dropoff check arms. Short bursts
   * have no reliable peak to measure against, and the onset of a word legitimately sits
   * far below the peak it is about to reach.
   */
  const VAD_PEAK_DROP_MIN_OPEN_MS = 1200;

  /**
   * Frames retained while the gate is shut, replayed when it opens, so the attack of the
   * first word survives. At 1024 samples / 16 kHz each frame is ~64ms.
   *
   * Must stay >= VAD_OPEN_CHUNKS, otherwise the audio spent proving the onset is
   * discarded rather than replayed and Gemini hears the utterance with its first
   * syllable missing.
   */
  const VAD_PREROLL_FRAMES = 4;

  function cancelIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function cancelConnectWatchdog() {
    if (connectWatchdog) {
      clearTimeout(connectWatchdog);
      connectWatchdog = null;
    }
  }

  function armConnectWatchdog() {
    cancelConnectWatchdog();
    connectWatchdog = setTimeout(function () {
      connectWatchdog = null;
      if (voiceState !== 'connecting') return;
      console.warn(
        '[ORA Widget] No response from the server within ' +
        (CONNECT_TIMEOUT_MS / 1000) + 's — abandoning the connect attempt.',
      );
      teardown();
      // Set AFTER teardown, which resets the state to idle. The customer must be told
      // why the attempt failed, and 'error' is a state handleOrbTap will start from —
      // leaving it on 'connecting' is what made the widget unusable.
      errorMsg = 'Connection timed out';
      voiceState = 'error';
      render();
    }, CONNECT_TIMEOUT_MS);
  }

  /** Shows a transient server notice in the status chip. */
  function setSessionNotice(text, autoClearMs) {
    sessionNotice = text || null;
    if (noticeClearTimer) {
      clearTimeout(noticeClearTimer);
      noticeClearTimer = null;
    }
    if (sessionNotice && autoClearMs) {
      noticeClearTimer = setTimeout(function () {
        sessionNotice = null;
        noticeClearTimer = null;
        try { render(); } catch (e) {}
      }, autoClearMs);
    }
    try { render(); } catch (e) {}
  }

  /** Clears any visible notice — called as soon as the customer is detected speaking again. */
  function clearSessionNotice() {
    if (sessionNotice || noticeClearTimer) {
      setSessionNotice(null);
    }
  }

  function armIdleTimer() {
    cancelIdleTimer();
    // Only arm idle timer if turn is completely settled and waiting for customer input,
    // and never while the session is already signing off.
    if (voiceState === 'active' && !isWaitingForAi && !goodbyeTimer && !pendingEndTimer) {
      idleTimer = setTimeout(function () {
        if (voiceState === 'active' && !isWaitingForAi && geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          console.log('[ORA Widget] Conversational idle timeout — suspending session after ' + (CLIENT_STANDBY_MS / 1000) + 's.');
          try {
            geminiWs.send(JSON.stringify({ type: 'client_idle_suspend', sessionId: sessionId }));
          } catch (e) {}
          disconnectVoice('standby');
        }
      }, CLIENT_STANDBY_MS);
    }
  }

  // ─── Render Confirmation Card ──────────────────────────────────────────────
  function renderConfirmCard(highlightField) {
    if (!confirmCard) return;
    if (!showConfirmCard) {
      confirmCard.style.display = 'none';
      return;
    }

    const hasAnyField = Boolean(
      (customerDetails.name && customerDetails.name.trim()) ||
      (customerDetails.email && customerDetails.email.trim()) ||
      (customerDetails.phone && customerDetails.phone.trim()) ||
      (customerDetails.address && customerDetails.address.trim())
    );

    if (!hasAnyField && !isEditingDetails) {
      confirmCard.style.display = 'none';
      return;
    }

    confirmCard.style.display = 'block';

    if (isEditingDetails) {
      if (cardView) cardView.style.display = 'none';
      if (cardEdit) cardEdit.style.display = 'block';
      if (confirmToast) confirmToast.style.display = 'none';
      if (inputName) inputName.value = customerDetails.name || '';
      if (inputEmail) inputEmail.value = customerDetails.email || '';
      if (inputPhone) inputPhone.value = customerDetails.phone || '';
      if (inputAddress) inputAddress.value = customerDetails.address || '';
    } else {
      if (cardView) cardView.style.display = 'block';
      if (cardEdit) cardEdit.style.display = 'none';

      let rowsHtml = '';
      const fields = [
        { key: 'name', label: 'Name', val: customerDetails.name, icon: '👤' },
        { key: 'email', label: 'Email', val: customerDetails.email, icon: '✉️' },
        { key: 'phone', label: 'Phone', val: customerDetails.phone, icon: '📞' },
        { key: 'address', label: 'Address', val: customerDetails.address, icon: '📍' },
      ];

      fields.forEach(function (f) {
        if (f.val && f.val.trim()) {
          const isHl = highlightField === f.key || (highlightField === true);
          rowsHtml += `
            <div class="ora-w-field-row">
              <span class="ora-w-field-label">${f.icon} ${f.label}</span>
              <span class="ora-w-field-value ${isHl ? 'highlight' : ''}">${escapeHtml(f.val)}</span>
            </div>
          `;
        }
      });

      if (!rowsHtml) {
        rowsHtml = `<div class="ora-w-field-row"><span class="ora-w-field-label">Info</span><span class="ora-w-field-value">Awaiting customer details...</span></div>`;
      }

      if (fieldList) fieldList.innerHTML = rowsHtml;
      if (confirmBtn) {
        if (isDetailsConfirmed) {
          confirmBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Verified';
          confirmBtn.style.background = '#65A30D';
          confirmBtn.style.color = '#FFFFFF';
        } else {
          confirmBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Confirm & Save';
          confirmBtn.style.background = '#C8F031';
          confirmBtn.style.color = '#111111';
        }
      }
    }
  }

  let cardAutoDismissTimer = null;
  let isCardHovered = false;

  function cancelCardAutoDismiss() {
    if (cardAutoDismissTimer) {
      clearTimeout(cardAutoDismissTimer);
      cardAutoDismissTimer = null;
    }
  }

  function armCardAutoDismiss(delayMs) {
    cancelCardAutoDismiss();
    if (!showConfirmCard || isEditingDetails) return;
    cardAutoDismissTimer = setTimeout(function () {
      if (!isEditingDetails && !isCardHovered) {
        showConfirmCard = false;
        renderConfirmCard();
      }
    }, delayMs || 7000);
  }

  function handleConfirmSuccess() {
    isDetailsConfirmed = true;
    renderConfirmCard();
    showToastNotification('Details verified & saved!');
    cancelCardAutoDismiss();
    setTimeout(function () {
      showConfirmCard = false;
      renderConfirmCard();
    }, 1800);
  }

  function showToastNotification(msg) {
    if (!confirmToast) return;
    if (toastTimer) clearTimeout(toastTimer);
    const span = confirmToast.querySelector('span');
    if (span) span.innerText = msg;
    confirmToast.style.display = 'flex';
    toastTimer = setTimeout(function () {
      confirmToast.style.display = 'none';
    }, 3500);
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
      <div id="oraWConfirmCard" class="ora-w-confirm-card" style="display:none;">
        <div class="ora-w-card-header">
          <div class="ora-w-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8F031" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Review Your Information</span>
          </div>
          <div class="ora-w-card-header-actions">
            <button id="oraWToggleEditBtn" class="ora-w-icon-btn" title="Edit Information" type="button" aria-label="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button id="oraWCloseCardBtn" class="ora-w-icon-btn" title="Dismiss" type="button" aria-label="Dismiss">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- View Mode -->
        <div id="oraWCardView" class="ora-w-card-view">
          <div class="ora-w-field-list" id="oraWFieldList"></div>
          <div class="ora-w-card-actions">
            <button id="oraWEditBtn" class="ora-w-btn ora-w-btn-secondary" type="button">Edit</button>
            <button id="oraWConfirmBtn" class="ora-w-btn ora-w-btn-primary" type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Confirm & Save
            </button>
          </div>
        </div>

        <!-- Edit Mode -->
        <div id="oraWCardEdit" class="ora-w-card-edit" style="display:none;">
          <div class="ora-w-form-group">
            <label>Name</label>
            <input type="text" id="oraWInputName" class="ora-w-input" placeholder="Your name" />
          </div>
          <div class="ora-w-form-group">
            <label>Email</label>
            <input type="email" id="oraWInputEmail" class="ora-w-input" placeholder="name@domain.com" />
          </div>
          <div class="ora-w-form-group">
            <label>Phone</label>
            <input type="tel" id="oraWInputPhone" class="ora-w-input" placeholder="+1 (555) 000-0000" />
          </div>
          <div class="ora-w-form-group">
            <label>Address / Shipping</label>
            <input type="text" id="oraWInputAddress" class="ora-w-input" placeholder="Street, City, Zip" />
          </div>
          <div class="ora-w-card-actions">
            <button id="oraWCancelEditBtn" class="ora-w-btn ora-w-btn-secondary" type="button">Cancel</button>
            <button id="oraWSaveEditBtn" class="ora-w-btn ora-w-btn-primary" type="button">Save & Confirm</button>
          </div>
        </div>

        <div id="oraWConfirmToast" class="ora-w-confirm-toast" style="display:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8F031" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Details verified & saved!</span>
        </div>
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
    controlsBar = shadowRoot.getElementById('oraWControls');
    muteBtn = shadowRoot.getElementById('oraWMuteBtn');
    closeBtn = shadowRoot.getElementById('oraWCloseBtn');

    // Confirm Card refs
    confirmCard = shadowRoot.getElementById('oraWConfirmCard');
    cardView = shadowRoot.getElementById('oraWCardView');
    cardEdit = shadowRoot.getElementById('oraWCardEdit');
    fieldList = shadowRoot.getElementById('oraWFieldList');
    toggleEditBtn = shadowRoot.getElementById('oraWToggleEditBtn');
    closeCardBtn = shadowRoot.getElementById('oraWCloseCardBtn');
    editBtn = shadowRoot.getElementById('oraWEditBtn');
    confirmBtn = shadowRoot.getElementById('oraWConfirmBtn');
    cancelEditBtn = shadowRoot.getElementById('oraWCancelEditBtn');
    saveEditBtn = shadowRoot.getElementById('oraWSaveEditBtn');
    confirmToast = shadowRoot.getElementById('oraWConfirmToast');
    inputName = shadowRoot.getElementById('oraWInputName');
    inputEmail = shadowRoot.getElementById('oraWInputEmail');
    inputPhone = shadowRoot.getElementById('oraWInputPhone');
    inputAddress = shadowRoot.getElementById('oraWInputAddress');

    // Initialize Procedural Canvas Fluid Wave Mesh Engine
    initOrbCanvas();

    // Event Listeners with Immediate Mobile Touch & Force-Sync
    function handleOrbTap() {
      if (voiceState === 'connecting') return;
      // Force live fresh DOM telemetry extraction to ensure backend & session are up-to-date
      try { triggerUniversalTelemetrySync(true); } catch (e) {}

      if (voiceState === 'idle' || voiceState === 'error') {
        startVoiceSession();
      } else if (voiceState === 'standby') {
        startVoiceSession(activeResumptionToken);
      } else {
        endSessionWithGoodbye();
      }
    }

    orbBtn.addEventListener('click', handleOrbTap);
    statusChip.addEventListener('click', handleOrbTap);

    muteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      // The mic stays shut while ORA says goodbye.
      if (goodbyeTimer) return;
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
      endSessionWithGoodbye();
    });

    function toggleEdit(enable) {
      isEditingDetails = typeof enable === 'boolean' ? enable : !isEditingDetails;
      if (isEditingDetails) {
        cancelCardAutoDismiss();
      } else {
        armCardAutoDismiss(5000);
      }
      renderConfirmCard();
    }

    function saveAndConfirmDetails() {
      if (inputName) customerDetails.name = inputName.value.trim();
      if (inputEmail) customerDetails.email = inputEmail.value.trim();
      if (inputPhone) customerDetails.phone = inputPhone.value.trim();
      if (inputAddress) customerDetails.address = inputAddress.value.trim();
      isEditingDetails = false;

      // Send to server over WebSocket
      if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(JSON.stringify({
          type: 'confirm_customer_details',
          data: customerDetails,
        }));
      }

      handleConfirmSuccess();
    }

    if (confirmCard) {
      confirmCard.addEventListener('mouseenter', function () {
        isCardHovered = true;
        cancelCardAutoDismiss();
      });
      confirmCard.addEventListener('mouseleave', function () {
        isCardHovered = false;
        if (showConfirmCard && !isEditingDetails && !isDetailsConfirmed) {
          armCardAutoDismiss(3500);
        }
      });
    }

    if (toggleEditBtn) {
      toggleEditBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleEdit();
      });
    }

    if (closeCardBtn) {
      closeCardBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        showConfirmCard = false;
        cancelCardAutoDismiss();
        renderConfirmCard();
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleEdit(true);
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleEdit(false);
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({
            type: 'confirm_customer_details',
            data: customerDetails,
          }));
        }
        handleConfirmSuccess();
      });
    }

    if (saveEditBtn) {
      saveEditBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        saveAndConfirmDetails();
      });
    }

    // ── Park the conversation before the browser replaces the page ───────────
    // pagehide fires for a normal link click and for a bfcache freeze; beforeunload
    // does not fire reliably on mobile Safari, so both are registered and the write is
    // idempotent.
    function parkSessionForNavigation() {
      if (voiceState === 'error') return;
      if (sessionId) {
        writeNavState({
          sessionId: sessionId,
          greeted: true,
          wasVoiceActive: voiceState === 'active' || voiceState === 'ora-speaking',
        });
      }
    }
    window.addEventListener('pagehide', parkSessionForNavigation);
    window.addEventListener('beforeunload', parkSessionForNavigation);

    // ── Live Shopify Cart Synchronization ────────────────────────────────────
    if (isShopifyStorefront()) {
      document.addEventListener('cart:updated', function () { syncShopifyCart(); });
      document.addEventListener('cart:refresh', function () { syncShopifyCart(); });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) syncShopifyCart();
      });
      window.addEventListener('focus', function () { syncShopifyCart(); });
    }

    // ── Resume a conversation the previous page was holding ──────────────────
    // Only when it was actually live. A session the customer had let lapse to standby
    // stays parked but silent: they get their history back when they tap, and are not
    // reconnected to a microphone they did not ask for.
    if (resumedFromNavigation && resumedSession && resumedSession.wasVoiceActive === true) {
      startVoiceSession();
    }

    // ── AudioContext Gesture Unlocker for MPA Page Changes ───────────────────
    function unlockAudioOnGesture() {
      if (playbackContext && playbackContext.state === 'suspended') {
        playbackContext.resume().catch(function () {});
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(function () {});
      }
    }
    window.addEventListener('click', unlockAudioOnGesture, { capture: true, once: true });
    window.addEventListener('touchstart', unlockAudioOnGesture, { capture: true, once: true });

    render();
  }

  // ─── Procedural Canvas Fluid Wave Mesh Engine ──────────────────────────────
  let lastCanvasFrameTime = 0;
  let idleGlowGrad = null;
  let idleInnerGrad1 = null;
  let idleInnerGrad2 = null;
  let idleNucleusGrad = null;

  function initOrbCanvas() {
    if (!orbCanvas) return;
    canvasCtx = orbCanvas.getContext('2d');
    orbCanvas.width = 140;
    orbCanvas.height = 140;
    startCanvasLoop();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && !canvasAnimId) {
          startCanvasLoop();
        }
      });
    }
  }

  function startCanvasLoop() {
    if (canvasAnimId) return;
    function drawCanvas(frameTime) {
      if (typeof document !== 'undefined' && document.hidden) {
        canvasAnimId = null;
        return;
      }

      var now = frameTime || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      var isIdle = voiceState === 'idle' || voiceState === 'standby';
      // Throttle idle rendering to ~22 FPS (45ms interval) to save CPU/battery on mobile & 120Hz ProMotion screens.
      // Active states render at smooth 60 FPS (16.6ms interval).
      var targetInterval = isIdle ? 45 : 16.6;
      if (now - lastCanvasFrameTime < targetInterval) {
        canvasAnimId = requestAnimationFrame(drawCanvas);
        return;
      }
      lastCanvasFrameTime = now;

      if (canvasCtx && orbCanvas) {
        canvasTime += isIdle ? 0.025 : 0.035;
        var t = canvasTime;
        var w = orbCanvas.width || 140;
        var h = orbCanvas.height || 140;
        var cx = w / 2;
        var cy = h / 2;
        var ctx = canvasCtx;

        ctx.clearRect(0, 0, w, h);

        var baseRadius = 40;
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
        var outerGlow;
        if (isIdle) {
          if (!idleGlowGrad) {
            idleGlowGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.5);
            idleGlowGrad.addColorStop(0, 'rgba(0, 200, 255, 0.20)');
            idleGlowGrad.addColorStop(0.7, 'rgba(50, 100, 200, 0.08)');
            idleGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }
          outerGlow = idleGlowGrad;
        } else {
          outerGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.5);
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
          }
        }
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Layer 1: Wave Mesh
        ctx.save();
        ctx.beginPath();
        var points = isIdle ? 20 : 32;
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

        var innerGrad1;
        if (isIdle) {
          if (!idleInnerGrad1) {
            idleInnerGrad1 = ctx.createLinearGradient(0, 0, w, h);
            idleInnerGrad1.addColorStop(0, '#00B4D8');
            idleInnerGrad1.addColorStop(0.7, '#0077B6');
            idleInnerGrad1.addColorStop(1, '#03045E');
          }
          innerGrad1 = idleInnerGrad1;
        } else {
          innerGrad1 = ctx.createLinearGradient(0, 0, w, h);
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
          }
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

        var innerGrad2;
        if (isIdle) {
          if (!idleInnerGrad2) {
            idleInnerGrad2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseRadius * 0.9);
            idleInnerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            idleInnerGrad2.addColorStop(0.4, 'rgba(0, 245, 212, 0.7)');
            idleInnerGrad2.addColorStop(1, 'rgba(0, 119, 182, 0.1)');
          }
          innerGrad2 = idleInnerGrad2;
        } else {
          innerGrad2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseRadius * 0.9);
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
        }
        ctx.fillStyle = innerGrad2;
        ctx.fill();
        ctx.restore();

        // Layer 3: Central Nucleus
        ctx.save();
        var nucleusRadius = 8 + (energy / 100) * 10;
        var nucleusGrad;
        if (isIdle) {
          if (!idleNucleusGrad) {
            idleNucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
            idleNucleusGrad.addColorStop(0, '#FFFFFF');
            idleNucleusGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.8)');
            idleNucleusGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          }
          nucleusGrad = idleNucleusGrad;
        } else {
          nucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusRadius);
          nucleusGrad.addColorStop(0, '#FFFFFF');
          nucleusGrad.addColorStop(0.5, isError ? 'rgba(239, 68, 68, 0.8)' : isSpeaking ? 'rgba(200, 240, 49, 0.8)' : 'rgba(0, 255, 255, 0.8)');
          nucleusGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }
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
    } else if (sessionNotice && isActive) {
      // Server-driven notice (idle / time-limit warning) takes priority while active,
      // so the customer sees why the session is about to close.
      statusDot.className = 'ora-w-status-dot standby';
      statusLabel.innerText = sessionNotice.slice(0, 40);
    } else if (goodbyeTimer && isActive) {
      statusDot.className = 'ora-w-status-dot speaking';
      statusLabel.innerText = 'Saying goodbye…';
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
    } else if (sessionNotice) {
      // Session was closed by the server — keep the reason visible in the idle state.
      statusDot.className = 'ora-w-status-dot standby';
      statusLabel.innerText = sessionNotice.slice(0, 40);
    } else {
      statusDot.className = 'ora-w-status-dot idle';
      statusLabel.innerText = 'Talk with ORA';
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
    cancelPlaybackWatchdog();
    playbackStallChecks = 0;
    // A barge-in ends the turn from Gemini's own interrupt signal, so the server is not
    // waiting on an acknowledgement for it — drop the flag rather than sending one.
    playbackTurnOpen = false;
    serverTurnActive = false;
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

  /**
   * Grace period added to the watchdog's estimate of when playback should be finished.
   * Covers jitter-buffer slack and the gap between one chunk ending and the next
   * arriving, so a healthy stream never trips it.
   */
  var PLAYBACK_WATCHDOG_GRACE_MS = 800;

  function cancelPlaybackWatchdog() {
    if (playbackWatchdogTimer) {
      clearTimeout(playbackWatchdogTimer);
      playbackWatchdogTimer = null;
    }
  }

  /**
   * Force-ends playback state, whether or not the audio graph cooperated.
   *
   * `voiceState === 'ora-speaking'` gates the microphone uplink shut, so anything that
   * leaves it set is not a cosmetic glitch — the customer is muted, cannot be heard,
   * and the only way out was to reload the page.
   */
  function settlePlayback() {
    cancelPlaybackWatchdog();
    playbackStallChecks = 0;
    serverTurnActive = false;

    for (var i = 0; i < activeSources.length; i++) {
      try {
        activeSources[i].stop();
        activeSources[i].disconnect();
      } catch (e) {}
    }
    activeSources = [];
    speakingLevel = 0;
    isWaitingForAi = false;
    if (voiceState === 'ora-speaking') voiceState = 'active';
    armIdleTimer();

    if (playbackTurnOpen) {
      playbackTurnOpen = false;
      notifyPlaybackDrained();
    }
    render();
  }

  /**
   * Re-arms the stall check for as long as audio is still expected to be playing.
   *
   * The normal path out of a turn is `source.onended`, but that callback depends on the
   * AudioContext clock advancing. A backgrounded tab or an iOS interruption suspends the
   * context, `currentTime` stops, and no source ever ends — the widget then sat in
   * 'ora-speaking' with the mic gated shut for the rest of the session.
   */
  function armPlaybackWatchdog() {
    cancelPlaybackWatchdog();
    playbackWatchdogTimer = setTimeout(
      checkPlaybackProgress,
      remainingPlaybackMs() + PLAYBACK_WATCHDOG_GRACE_MS,
    );
  }

  function checkPlaybackProgress() {
    playbackWatchdogTimer = null;
    if (!playbackTurnOpen && activeSources.length === 0) return;

    var ctx = playbackContext;
    if (!ctx) {
      settlePlayback();
      return;
    }

    if (ctx.state !== 'running') {
      // Try to get the clock going again. If two checks in a row find it stopped, the
      // audio is not coming back on its own, and an unusable microphone costs the
      // customer more than the unplayed tail of an answer.
      playbackStallChecks++;
      try { ctx.resume().catch(function () {}); } catch (e) {}
      if (playbackStallChecks >= 2) {
        console.warn('[ORA Widget] Audio clock stalled — releasing playback state.');
        settlePlayback();
        return;
      }
      playbackWatchdogTimer = setTimeout(checkPlaybackProgress, PLAYBACK_WATCHDOG_GRACE_MS);
      return;
    }

    playbackStallChecks = 0;
    if (remainingPlaybackMs() > 0) {
      armPlaybackWatchdog();
      return;
    }
    if (!serverTurnActive) {
      settlePlayback();
    } else {
      playbackWatchdogTimer = setTimeout(function () {
        if (!playbackTurnOpen && activeSources.length === 0) return;
        if (remainingPlaybackMs() <= 0) {
          settlePlayback();
        }
      }, PLAYBACK_WATCHDOG_GRACE_MS);
    }
  }

  /** Milliseconds of ORA audio still queued for playback. */
  function remainingPlaybackMs() {
    try {
      if (!playbackContext) return 0;
      return Math.max(0, (audioQueueTime - playbackContext.currentTime) * 1000);
    } catch (e) {
      return 0;
    }
  }

  /**
   * Queues a navigation to run once ORA stops speaking.
   *
   * The safety timeout matters: if the turn never completes (dropped socket, model
   * error) the visitor is still taken where they asked to go.
   */
  function scheduleNavigation(dest) {
    pendingNavigation = dest;
    if (pendingNavTimer) clearTimeout(pendingNavTimer);
    pendingNavTimer = setTimeout(function () { runPendingNavigation(true); }, 8000);
  }

  function runPendingNavigation(force) {
    if (!pendingNavigation) return;

    // Let the queued audio drain first, or the unload clips ORA mid-word.
    var remaining = remainingPlaybackMs();
    if (!force && remaining > 60) {
      if (pendingNavTimer) clearTimeout(pendingNavTimer);
      pendingNavTimer = setTimeout(
        function () { runPendingNavigation(true); },
        Math.min(remaining + 150, 8000),
      );
      return;
    }

    var dest = pendingNavigation;
    pendingNavigation = null;
    if (pendingNavTimer) { clearTimeout(pendingNavTimer); pendingNavTimer = null; }
    window.location.href = dest;
  }

  // ─── Shopify Storefront Cart ────────────────────────────────────────────────
  //
  // The shopper's real cart lives in a first-party Shopify session cookie on the store's
  // own domain. No server token reaches it — not the merchant's Admin token, not a
  // customer token — so the add has to be made by this script, which runs inside the
  // storefront document and therefore sends that cookie automatically.

  // Sections a theme may render for the cart. Only the ones actually present on the page
  // are requested, because asking for a section a theme does not define fails the call.
  var CART_SECTION_IDS = [
    'cart-drawer',
    'cart-icon-bubble',
    'cart-notification',
    'cart-live-region-text',
  ];

  function isShopifyStorefront() {
    return Boolean(
      (window.Shopify && window.Shopify.shop) ||
      document.querySelector('form[action*="/cart/add"]')
    );
  }

  function detectCartSections() {
    var present = [];
    for (var i = 0; i < CART_SECTION_IDS.length; i++) {
      if (document.getElementById('shopify-section-' + CART_SECTION_IDS[i])) {
        present.push(CART_SECTION_IDS[i]);
      }
    }
    return present;
  }

  /**
   * Repaints the theme's own cart markup from the HTML Shopify returned.
   *
   * Dispatching a `cart:updated` event is not enough on its own: Dawn and the other
   * Online Store 2.0 themes publish cart changes through an internal pub/sub that no
   * outside script can reach, and only re-render from the Section Rendering API. The
   * events below stay as a best-effort fallback for older themes that do listen.
   */
  function applyCartSections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      try {
        var target = document.getElementById('shopify-section-' + id);
        if (!target) return;
        var parsed = new DOMParser().parseFromString(sections[id], 'text/html');
        var source = parsed.getElementById('shopify-section-' + id) || parsed.body;
        if (source) target.innerHTML = source.innerHTML;
      } catch (err) {
        console.warn('[ORA Widget] Cart section refresh skipped for ' + id, err);
      }
    });
  }

  /**
   * Re-renders the theme's cart markup in a second request.
   *
   * Asking /cart/add.js for sections makes Shopify render those Liquid sections before
   * it answers, which put a few hundred milliseconds of theme rendering between the
   * shopper's request and the item landing in their cart. The add is what has to be
   * fast; the badge and drawer can catch up a moment later.
   */
  function refreshCartSections() {
    var sections = detectCartSections();
    if (!sections.length) return Promise.resolve();

    return fetch('/cart?sections=' + sections.join(','), {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then(function (res) { return res.json(); })
      .then(applyCartSections)
      .catch(function (err) {
        console.warn('[ORA Widget] Cart section refresh failed:', err);
      });
  }

  function openCartDrawer() {
    try {
      var drawer = document.querySelector('cart-drawer, cart-notification');
      if (drawer && typeof drawer.open === 'function') drawer.open();
    } catch (err) {
      // A theme without a drawer is fine; the cart badge still updated.
    }
  }

  /**
   * Tells the server what the storefront cart actually did.
   *
   * On a Shopify store the storefront cart is the only cart that sells, so a rejected
   * add has to be undone on ORA's side too — otherwise ORA is holding an item the store
   * is not, which is the divergence this whole path exists to prevent.
   */
  function reportCartSync(action, ok, reason) {
    if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;
    try {
      geminiWs.send(JSON.stringify({
        type: 'cart_sync',
        ok: ok,
        variantId: action.variantId,
        productId: action.product && action.product.id,
        reason: reason || undefined,
      }));
    } catch (err) {
      console.warn('[ORA Widget] Could not report cart sync:', err);
    }
  }

  function addToShopifyCart(action) {
    if (!action) return;

    var variantId = action.variantId;
    if (!variantId) {
      // DOM fail-safe: if shopper is on a Shopify PDP, read the active variant id from the form
      try {
        var domInput = document.querySelector('form[action*="/cart/add"] [name="id"], [data-selected-variant-id]');
        if (domInput && domInput.value) {
          variantId = domInput.value;
          action.variantId = variantId;
        } else if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.selectedVariantId) {
          variantId = String(window.ShopifyAnalytics.meta.selectedVariantId);
          action.variantId = variantId;
        }
      } catch (e) {}
    }

    // Both exits below used to return in silence, which is the worst of the two
    // outcomes: ORA has already told the shopper the item is in their cart, and
    // nothing ever contradicts it. Report the failure so the server drops the line
    // and the agent corrects itself out loud.
    if (!variantId) {
      reportCartSync(action, false, 'no-variant-id');
      return;
    }

    if (!isShopifyStorefront()) {
      reportCartSync(action, false, 'not-a-shopify-storefront');
      return;
    }

    var quantity = action.quantity || 1;
    var name = (action.product && action.product.name) || 'Item';

    // 1. Optimistic instant visual feedback
    showToastNotification('Added to cart: ' + name);

    // 2. Add to Shopify cart in background
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ items: [{ id: action.variantId, quantity: quantity }] }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.description || data.message || 'Add to cart failed');
          }
          return data;
        });
      })
      .then(function (data) {
        // Dispatch theme events immediately
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        document.dispatchEvent(
          new CustomEvent('ora:cart:added', {
            detail: { variantId: action.variantId, quantity: quantity, product: action.product },
          })
        );

        // Defer section re-rendering so Liquid DOM parsing never blocks audio playback
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(function () {
            refreshCartSections().then(openCartDrawer);
          });
        } else {
          setTimeout(function () {
            refreshCartSections().then(openCartDrawer);
          }, 60);
        }
        syncShopifyCart();
      })
      .catch(function (err) {
        console.error('[ORA Widget] Failed to add item to Shopify cart:', err);
        showToastNotification('Could not add to cart. Please try the product page.');
        reportCartSync(action, false, err && err.message);
      });
  }

  /**
   * Reads Shopify /cart.js and sends real-time cart state to the server via WebSocket.
   */
  function syncShopifyCart() {
    if (!isShopifyStorefront()) return;
    try {
      fetch('/cart.js', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Cart fetch failed');
          return res.json();
        })
        .then(function (cartData) {
          if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(
              JSON.stringify({
                type: 'cart_telemetry',
                cart: cartData,
              })
            );
          }
        })
        .catch(function () {});
    } catch (e) {}
  }

  /**
   * Updates an item quantity in Shopify cart via /cart/change.js (or removes if quantity is 0).
   */
  function updateShopifyCart(action) {
    if (!action || !action.variantId) return;
    if (!isShopifyStorefront()) return;

    var newQty = action.quantity !== undefined ? Number(action.quantity) : 0;
    var name = action.productName || 'Item';

    if (newQty === 0) {
      showToastNotification('Removed from cart: ' + name);
    } else {
      showToastNotification('Updated ' + name + ' quantity to ' + newQty);
    }

    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: String(action.variantId), quantity: newQty }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.description || data.message || 'Cart update failed');
          return data;
        });
      })
      .then(function (data) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(function () {
            refreshCartSections().then(openCartDrawer);
          });
        } else {
          setTimeout(function () {
            refreshCartSections().then(openCartDrawer);
          }, 60);
        }
        syncShopifyCart();
      })
      .catch(function (err) {
        console.error('[ORA Widget] Failed to update Shopify cart:', err);
        showToastNotification('Could not update cart.');
      });
  }

  /**
   * Clears all items from the Shopify cart via /cart/clear.js.
   */
  function clearShopifyCart() {
    if (!isShopifyStorefront()) return;
    showToastNotification('Shopping cart cleared');
    fetch('/cart/clear.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        refreshCartSections();
        syncShopifyCart();
      })
      .catch(function () {});
  }

  // ─── Audio Playback (24 kHz PCM with 80ms Jitter Buffer) ────────────────────
  function playIncomingPcm(base64Pcm) {
    try {
      cancelIdleTimer();
      isWaitingForAi = false;

      if (!playbackContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        try {
          playbackContext = new AudioCtx({ sampleRate: 24000 });
        } catch (e) {
          playbackContext = new AudioCtx();
        }
      }
      const ctx = playbackContext;
      if (ctx.state === 'suspended') ctx.resume();
      if (!ctx.onstatechange) {
        // A suspend/resume cycle changes how long playback will take, so the stall
        // check has to be recomputed rather than left on its old deadline.
        ctx.onstatechange = function () {
          if (playbackTurnOpen) armPlaybackWatchdog();
        };
      }

      const float32 = base64ToFloat32Array(base64Pcm);
      if (float32.length === 0) return;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      // If starting fresh (no active playback), add a smooth 100ms jitter buffer to absorb network variance.
      // If continuing an active stream with a micro-gap, smoothly append at now + 0.005s (5ms) instead of inserting an artificial silence gap.
      if (audioQueueTime < now) {
        audioQueueTime = activeSources.length === 0 ? now + 0.10 : now + 0.005;
      }
      source.start(audioQueueTime);
      audioQueueTime += buffer.duration;

      activeSources.push(source);
      voiceState = 'ora-speaking';
      playbackTurnOpen = true;
      serverTurnActive = true;
      armPlaybackWatchdog();

      // Energy level for visualizer
      let sum = 0;
      const step = Math.max(1, Math.floor(float32.length / 32));
      for (let i = 0; i < float32.length; i += step) sum += float32[i] * float32[i];
      speakingLevel = Math.min(100, Math.floor(Math.sqrt(sum / (float32.length / step)) * 400));

      source.onended = function () {
        activeSources = activeSources.filter((s) => s !== source);
        // Only settle if the server has finished sending chunks for this turn
        if (!serverTurnActive && activeSources.length === 0) {
          settlePlayback();
        }
      };
    } catch (e) {
      console.error('[ORA Widget] Audio playback error:', e);
    }
  }

  /**
   * Tells the server ORA has finished speaking in the customer's ear.
   *
   * Gemini finishes generating a long answer several times faster than it can be played,
   * and the server used to start its silence countdown at generation time — while this
   * widget was still playing the answer and still holding the mic uplink shut. Most of
   * the customer's allowance was spent before they could say a word, which is what made
   * ORA break into its own answers to ask if they were still there.
   *
   * Sent only on a natural drain. A barge-in also empties the queue, but the server ends
   * that turn from Gemini's own interrupt signal and is not waiting on us.
   */
  function notifyPlaybackDrained() {
    if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;
    try {
      geminiWs.send(JSON.stringify({ type: 'audio_playback_complete' }));
    } catch (e) {}
  }

  /**
   * Ends the conversation deliberately, because the customer asked for it.
   *
   * Closing the socket on its own is ambiguous: the server cannot tell a customer who
   * is finished from a browser that is mid-navigation, so it assumes the recoverable
   * case and parks the session, holding its Gemini socket for the whole grace window.
   * Starting again inside that window opens a second Gemini session while the first is
   * still held, and both count against the model's concurrent-session quota. Saying
   * plainly that the conversation is over lets the server close it immediately.
   */
  function endSessionByUser() {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      try {
        geminiWs.send(JSON.stringify({ type: 'end_session', sessionId: sessionId }));
      } catch (e) {}
    }
    teardown();
  }

  /**
   * Ends the session once ORA's last words have been heard.
   *
   * The server says goodbye before it ends a session (idle timeout, time limit),
   * and sends `session_ended` as soon as that goodbye has been generated —
   * Gemini generates faster than real time, so most of it is still queued for
   * playback. Tearing down then would flush the goodbye unheard. The mic is
   * muted meanwhile so nothing more is sent.
   */
  function teardownAfterPlayback(notice) {
    isMuted = true;
    var remainingMs = playbackContext
      ? Math.max(0, (audioQueueTime - playbackContext.currentTime) * 1000)
      : 0;

    var finish = function () {
      pendingEndTimer = null;
      if (voiceState !== 'idle' && voiceState !== 'standby') teardown();
      // Set the notice AFTER teardown so it survives into the idle state — the
      // customer is never left staring at a silently dead widget.
      if (notice) setSessionNotice(notice);
    };

    if (pendingEndTimer) clearTimeout(pendingEndTimer);
    if (remainingMs < 50) {
      finish();
      return;
    }
    // Capped, so a stalled audio clock can never hold a dead session open.
    pendingEndTimer = setTimeout(finish, Math.min(remainingMs + 300, 10000));
  }

  /**
   * How long a goodbye may take before the widget tears down regardless. Longer
   * than the server's own goodbye fallback plus drain, so the server normally
   * closes first and this only catches a server that went silent.
   */
  var GOODBYE_CLIENT_TIMEOUT_MS = 18000;

  /**
   * Ends the conversation with ORA saying goodbye, because the customer pressed stop.
   *
   * The mic goes quiet at once so nothing the customer says interrupts it, and the
   * server is asked to close with a goodbye. It streams one short sentence, then sends
   * `session_ended`, which teardownAfterPlayback() finishes once the goodbye has been
   * heard. A second press while ORA is signing off, or a session with no open socket,
   * ends at once.
   */
  function endSessionWithGoodbye() {
    var live = voiceState === 'active' || voiceState === 'ora-speaking';
    if (goodbyeTimer || !live || !geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
      endSessionByUser();
      return;
    }

    isMuted = true;
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
    }
    cancelIdleTimer();
    try {
      geminiWs.send(JSON.stringify({ type: 'end_session', goodbye: true, sessionId: sessionId }));
    } catch (e) {
      endSessionByUser();
      return;
    }
    goodbyeTimer = setTimeout(function () {
      goodbyeTimer = null;
      endSessionByUser();
    }, GOODBYE_CLIENT_TIMEOUT_MS);
    render();
  }

  // ─── Teardown / End Session ─────────────────────────────────────────────────
  function teardown() {
    if (pendingEndTimer) { clearTimeout(pendingEndTimer); pendingEndTimer = null; }
    if (goodbyeTimer) { clearTimeout(goodbyeTimer); goodbyeTimer = null; }
    cancelIdleTimer();
    cancelConnectWatchdog();
    // The conversation is over, not paused. Leaving it parked would have the next page
    // load silently rejoin a dead session and wait for a greeting that never comes.
    clearNavState();
    // Drop any pending notice + its auto-clear timer. Callers that need to show a
    // reason (e.g. session_ended) set the notice AFTER calling teardown().
    if (noticeClearTimer) { clearTimeout(noticeClearTimer); noticeClearTimer = null; }
    sessionNotice = null;
    resetVadState();
    isWaitingForAi = false;
    flushPlaybackQueue();
    voiceState = 'idle';
    isMuted = false;
    liveUtterance = '';
    liveSpeaker = null;
    showTranscript = false;
    showConfirmCard = false;
    cancelCardAutoDismiss();
    lastSpeaker = null;
    userMicLevel = 0;
    speakingLevel = 0;
    audioQueueTime = 0;
    activeResumptionToken = null;
    stopVisualizer();
    renderConfirmCard();

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

  /**
   * Releases the microphone and audio graph while keeping the session resumable.
   *
   * This was called by the 90-second standby timer but never defined, so that path
   * threw a ReferenceError inside its setTimeout callback. The state transition still
   * appeared to work because the server's `session_suspended` reply set it, but the
   * local audio graph was never torn down: the AudioWorkletNode stayed connected to a
   * still-open AudioContext, and because startMicCapture() reuses an existing context,
   * every standby/resume cycle added another live worklet node.
   *
   * Unlike teardown(), this preserves activeResumptionToken so the session can resume.
   */
  function disconnectVoice(nextState) {
    cancelIdleTimer();
    cancelConnectWatchdog();
    // Standby keeps the conversation, so the parked state stays — but a page load must
    // not resume audio on its own for a session the customer had already let go quiet.
    // Guarded on an existing entry: this must never re-create one teardown() cleared.
    if (readNavState()) writeNavState({ wasVoiceActive: false });
    isWaitingForAi = false;
    flushPlaybackQueue();
    userMicLevel = 0;
    speakingLevel = 0;
    audioQueueTime = 0;
    resetVadState();
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

    voiceState = nextState || 'idle';
    render();
  }

  // ─── SpeechRecognition (Instant Local User Transcript Pill) ────────────────
  function startSpeechRecognition() {
    // Mobile / iOS Safari contention fix:
    // On iOS Safari, webkitSpeechRecognition competes with getUserMedia Web Audio for hardware
    // CoreAudio access, causing audio dropped samples, high latency, and battery drain.
    // In addition, Apple's dictation waits 2-3 seconds after silence before emitting isFinal.
    // Gemini Multimodal Live API already transcribes user microphone audio on the server in real-time,
    // so mobile browsers skip client-side speech recognition entirely.
    if (isMobileDevice) return;

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
            if (finalTranscript.trim() && geminiWs && geminiWs.readyState === WebSocket.OPEN) {
              try {
                geminiWs.send(JSON.stringify({ type: 'user_transcript', text: finalTranscript.trim() }));
              } catch (e) {}
            }
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
    if (!audioContext) {
      try {
        audioContext = new AudioCtx({ sampleRate: 16000 });
      } catch (e) {
        audioContext = new AudioCtx();
      }
    }
    if (audioContext.state === 'suspended') await audioContext.resume().catch(() => {});

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        // AGC on. It does raise quiet room noise toward speech level, which is why it
        // was off — but the gate below keys off signal-to-NOISE, and AGC raises the
        // measured noise floor by the same factor it raises the voice, so the ratio the
        // gate actually tests is unchanged. What AGC does fix is the absolute level:
        // without it a built-in laptop or phone mic delivers conversational speech at
        // an amplitude low enough to sit under any fixed floor, so the hard minimum
        // below rejected normal talking outright on exactly the devices most shoppers
        // use. Normalising the level first is what lets that minimum be set low enough
        // to admit a quiet voice without admitting a quiet room.
        autoGainControl: true,
        // Browser-level voice isolation: suppresses everything that is not the
        // near-field speaker, which is the only mechanism here that can reject
        // *speech-like* distance noise — a television, or people talking nearby.
        // An RMS threshold cannot, because that noise sits at speech level by
        // definition. Unsupported browsers ignore an unknown constraint, so this is
        // safe to request unconditionally; Chrome and Edge honour it on platforms
        // where the OS provides it.
        voiceIsolation: true,
      },
    });
    mediaStream = stream;

    // New capture session: forget the previous room and re-measure it.
    resetVadState();

    const source = audioContext.createMediaStreamSource(stream);

    const muteNode = audioContext.createGain();
    muteNode.gain.value = 0;
    muteGainNode = muteNode;

    /**
     * Shared uplink path for one captured chunk of 16 kHz PCM16.
     *
     * Identical for the AudioWorklet and the ScriptProcessor fallback, so the noise
     * gate, echo protection and level meter cannot drift between the two.
     */
    function handleMicChunk(pcm16Buffer, rms) {
      if (voiceState === 'idle' || !geminiWs || geminiWs.readyState !== WebSocket.OPEN || isMuted) return;

      // ── Acoustic Echo Protection:
      // While ORA is actively speaking, gate the microphone uplink completely shut.
      // This prevents laptop speaker sound from leaking into the microphone, which
      // otherwise causes Gemini to hear itself, triggering false self-interruptions
      // and audio dropouts mid-sentence.
      if (voiceState === 'ora-speaking') {
        userMicLevel = 0;
        return;
      }

      userMicLevel = Math.min(100, Math.floor(rms * 400));

      // ── Voice Activity Detection: adaptive, signal-to-noise based ──────────────
      // Thresholds are derived from the measured room level rather than fixed, so the
      // same code serves a whisper in a quiet room and a normal voice in a noisy one.
      const nowMs = Date.now();
      const openAt = Math.max(VAD_MIN_OPEN, vadNoiseFloor * VAD_SNR_OPEN);
      const closeAt = Math.max(VAD_MIN_OPEN * 0.55, vadNoiseFloor * VAD_SNR_CLOSE);

      let isSpeech;
      if (vadCalibrationLeft > 0) {
        // Measuring the room: stay shut regardless of level.
        vadCalibrationLeft--;
        isSpeech = false;
      } else if (vadGateOpen) {
        // Already passing audio: hold open on the lower threshold so quiet syllables
        // mid-sentence do not chop the stream.
        isSpeech = rms > closeAt;
        // Require 3 consecutive low-energy frames before ending to prevent syllable/consonant clipping
        if (
          isSpeech &&
          nowMs - vadGateOpenedAt >= VAD_PEAK_DROP_MIN_OPEN_MS &&
          rms < vadUtterancePeak * VAD_PEAK_DROP_RATIO
        ) {
          vadDropStreak = (vadDropStreak || 0) + 1;
          if (vadDropStreak >= 3) {
            isSpeech = false;
            vadDropStreak = 0;
          }
        } else {
          vadDropStreak = 0;
        }
      } else {
        // Shut: require a sustained onset, not a single loud chunk.
        vadOpenStreak = rms > openAt ? vadOpenStreak + 1 : 0;
        isSpeech = vadOpenStreak >= VAD_OPEN_CHUNKS;
      }
      if (isSpeech && !vadGateOpen) {
        // Gate opening: start a fresh peak for this utterance.
        vadGateOpenedAt = nowMs;
        vadUtterancePeak = rms;
      } else if (isSpeech) {
        vadUtterancePeak = Math.max(vadUtterancePeak, rms);
      } else {
        vadUtterancePeak = 0;
      }
      vadGateOpen = isSpeech;
      if (isSpeech) vadOpenStreak = 0;

      // Always adapt — see VAD_FLOOR_* above for why this must also run while open.
      // The rise is slower when open so the speaker's own voice cannot raise the floor
      // against them, but it is never zero, so the gate cannot latch open on noise.
      const rate =
        rms > vadNoiseFloor
          ? (isSpeech ? VAD_FLOOR_ATTACK_OPEN : VAD_FLOOR_ATTACK_CLOSED)
          : VAD_FLOOR_DECAY;
      vadNoiseFloor = Math.min(
        VAD_FLOOR_MAX,
        Math.max(0, vadNoiseFloor + rate * (rms - vadNoiseFloor)),
      );

      if (isSpeech) {
        lastSpeechAt = nowMs;
        lastSpeaker = 'user';
        liveSpeaker = 'user';
        isWaitingForAi = false;
        cancelIdleTimer();
        clearSessionNotice(); // the customer is speaking — drop any "are you still there?"
        // Tell the server a human is talking, whether or not anything transcribes it.
        if (nowMs - lastSpeakingPingAt >= USER_SPEAKING_PING_MS) {
          lastSpeakingPingAt = nowMs;
          try {
            geminiWs.send(JSON.stringify({ type: 'user_speaking' }));
          } catch (e) {}
        }
        if (userSpeechSilenceTimeout) {
          clearTimeout(userSpeechSilenceTimeout);
          userSpeechSilenceTimeout = null;
        }
      }

      const b64 = arrayBufferToBase64(pcm16Buffer);

      // ── Noise gate ────────────────────────────────────────────────────────────
      // Previously EVERY frame went upstream regardless of level, so room noise
      // reached Gemini, whose own VAD read it as the customer speaking and barged in
      // on ORA mid-answer. Only speech (plus a hangover tail) is streamed now.
      if (!isSpeech && nowMs - lastSpeechAt >= VAD_HANGOVER_MS) {
        prerollFrames.push(b64);
        if (prerollFrames.length > VAD_PREROLL_FRAMES) prerollFrames.shift();
        if (lastSpeaker === 'user' && !isWaitingForAi && voiceState === 'active') {
          isWaitingForAi = true;
          render();
        }
        return;
      }

      // Gate just opened — replay the buffered pre-roll so the first word is intact.
      if (prerollFrames.length > 0) {
        for (let pi = 0; pi < prerollFrames.length; pi++) {
          geminiWs.send(JSON.stringify({ type: 'audio', data: prerollFrames[pi] }));
        }
        prerollFrames.length = 0;
      }

      geminiWs.send(JSON.stringify({ type: 'audio', data: b64 }));
    }

    // ── Capture path ──────────────────────────────────────────────────────────
    // Prefer the AudioWorklet: it runs on the dedicated audio rendering thread, so
    // capture no longer competes with the orb animation and DOM work on the main
    // thread (the old createScriptProcessor path did, causing stutter under load).
    // It also emits ~128ms chunks instead of ~64ms, halving WebSocket message
    // overhead for the same audio.
    // Inline AudioWorkletProcessor script string to create a Blob URL and bypass CORS across all origins
    const INLINE_PCM_WORKLET_CODE = [
      'class PCMRecorderProcessor extends AudioWorkletProcessor {',
      '  constructor() {',
      '    super();',
      '    this.targetRate = 16000;',
      '    this.bufferSize = 1024;',
      '    this.buffer = new Float32Array(this.bufferSize);',
      '    this.bytesWritten = 0;',
      '    this.phase = 0;',
      '    this.acc = 0;',
      '    this.accCount = 0;',
      '  }',
      '  process(inputs) {',
      '    const input = inputs[0];',
      '    if (!input || !input[0]) return true;',
      '    const channel = input[0];',
      '    const ratio = sampleRate / this.targetRate;',
      '    if (ratio <= 1.0001) {',
      '      for (let i = 0; i < channel.length; i++) this.push(channel[i]);',
      '    } else {',
      '      const step = 1 / ratio;',
      '      for (let i = 0; i < channel.length; i++) {',
      '        this.acc += channel[i];',
      '        this.accCount++;',
      '        this.phase += step;',
      '        while (this.phase >= 1) {',
      '          this.phase -= 1;',
      '          this.push(this.accCount > 0 ? this.acc / this.accCount : 0);',
      '          this.acc = 0;',
      '          this.accCount = 0;',
      '        }',
      '      }',
      '    }',
      '    return true;',
      '  }',
      '  push(sample) {',
      '    this.buffer[this.bytesWritten++] = sample;',
      '    if (this.bytesWritten >= this.bufferSize) this.flush();',
      '  }',
      '  flush() {',
      '    if (this.bytesWritten === 0) return;',
      '    const count = this.bytesWritten;',
      '    const int16Array = new Int16Array(count);',
      '    let sumSquares = 0;',
      '    for (let i = 0; i < count; i++) {',
      '      const s = Math.max(-1, Math.min(1, this.buffer[i]));',
      '      sumSquares += s * s;',
      '      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;',
      '    }',
      '    this.port.postMessage(',
      '      { pcm16Data: int16Array.buffer, rms: Math.sqrt(sumSquares / count) },',
      '      [int16Array.buffer]',
      '    );',
      '    this.bytesWritten = 0;',
      '  }',
      '}',
      'registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);'
    ].join('\n');

    let worklet = null;
    if (audioContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      let blobUrl = null;
      try {
        try {
          const blob = new Blob([INLINE_PCM_WORKLET_CODE], { type: 'application/javascript' });
          blobUrl = URL.createObjectURL(blob);
          await audioContext.audioWorklet.addModule(blobUrl);
        } catch (blobErr) {
          await audioContext.audioWorklet.addModule(resolveOraAssetUrl('/audio-processors/pcm-recorder-worklet.js'));
        } finally {
          if (blobUrl) {
            setTimeout(function () {
              try { URL.revokeObjectURL(blobUrl); } catch (e) {}
            }, 10000);
          }
        }
        worklet = new AudioWorkletNode(audioContext, 'pcm-recorder-processor');
        worklet.port.onmessage = function (event) {
          const d = event.data;
          if (d && d.pcm16Data) handleMicChunk(d.pcm16Data, d.rms || 0);
        };
      } catch (e) {
        console.warn('[ORA Widget] AudioWorklet unavailable, falling back to ScriptProcessor:', e && e.message);
        worklet = null;
      }
    }

    if (worklet) {
      processorNode = worklet;
      source.connect(worklet);
      worklet.connect(muteNode);
    } else {
      // ── Fallback ScriptProcessor with 64ms (1024-sample) Frame Accumulator ──
      // On mobile Safari (where AudioWorklet may fail or blob URLs are restricted),
      // ScriptProcessor emits raw chunks at native hardware rate (48kHz, 1024 samples = 21ms).
      // Emitting 21ms unbuffered chunks floods the mobile WebSocket with 48 msgs/sec, saturating
      // mobile TCP queues and distorting the VAD noise floor 3.8x faster.
      // We accumulate downsampled 16kHz audio into exactly 1024 samples (64ms) before sending.
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorNode = processor;
      source.connect(processor);
      processor.connect(muteNode);

      const FRAME_SAMPLES = 1024;
      const spAccumulator = new Float32Array(FRAME_SAMPLES);
      let spAccumulatorCount = 0;

      processor.onaudioprocess = function (e) {
        if (voiceState === 'idle' || !geminiWs || geminiWs.readyState !== WebSocket.OPEN) return;
        const rawInput = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(rawInput, audioContext.sampleRate);

        for (let i = 0; i < downsampled.length; i++) {
          spAccumulator[spAccumulatorCount++] = downsampled[i];
          if (spAccumulatorCount >= FRAME_SAMPLES) {
            let sum = 0;
            for (let j = 0; j < FRAME_SAMPLES; j++) {
              sum += spAccumulator[j] * spAccumulator[j];
            }
            const rms = Math.sqrt(sum / FRAME_SAMPLES);
            const pcm16 = floatTo16BitPCM(spAccumulator);
            handleMicChunk(pcm16.buffer, rms);
            spAccumulatorCount = 0;
          }
        }
      };
    }

    muteNode.connect(audioContext.destination);

    startSpeechRecognition();
  }


  // ─── Start Voice Session (with Resumption Support) ───────────────────────────
  async function startVoiceSession(resumeToken) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext) {
        try {
          audioContext = new AudioCtx({ sampleRate: 16000 });
        } catch (e) {
          audioContext = new AudioCtx();
        }
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});

      if (!playbackContext) {
        try {
          playbackContext = new AudioCtx({ sampleRate: 24000 });
        } catch (e) {
          playbackContext = new AudioCtx();
        }
      }
      if (playbackContext.state === 'suspended') playbackContext.resume().catch(() => {});

      // Play 1 silent sample inside user gesture to reliably unlock iOS Safari Web Audio hardware pipeline
      try {
        const silentBuf = playbackContext.createBuffer(1, 1, 22050);
        const silentSrc = playbackContext.createBufferSource();
        silentSrc.buffer = silentBuf;
        silentSrc.connect(playbackContext.destination);
        silentSrc.start(0);
      } catch (e) {}
    } catch (e) {}

    voiceState = 'connecting';
    armConnectWatchdog();
    errorMsg = '';
    setSessionNotice(null); // clear any prior session-ended reason
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
      // Written AFTER teardown, which resets the state to idle. Set before it, the
      // error state and its message were immediately overwritten and the customer was
      // returned to a silent idle orb with no idea the microphone had been refused.
      teardown();
      errorMsg = 'Mic permission required';
      voiceState = 'error';
      render();
      throw err;
    });

    try {
      // A parked conversation keeps its id — that is what makes the server treat this
      // as the same conversation rather than a new one that needs greeting.
      if (!resumeToken && !resumedFromNavigation) {
        sessionId = 'ses_w_' + Math.random().toString(36).substring(2, 9);
      }
      const navState = readNavState();
      const skipGreeting = resumedFromNavigation || (navState && navState.greeted === true);
      const returningVisitor = !skipGreeting && hasVisitedBefore();
      const wsBase = apiBase.replace(/^http/, 'ws');
      const custPayload = resolveCustomerPayload();
      const curPath = (typeof window !== 'undefined' && window.location.pathname) ? window.location.pathname : '/';
      const curTitle = (typeof document !== 'undefined' && document.title) ? document.title : '';
      // Declares that the noise gate above runs before anything is transmitted, so
      // the server can use its fast turn-detection profile. Only a client with a
      // gate may send this: without one the server's HIGH start sensitivity reads
      // room noise as speech. Remove the gate and this flag goes with it.
      let wsUri = wsBase + '/ws/voice' +
        '?publishableKey=' + encodeURIComponent(publishableKey) +
        '&gatedAudio=true' +
        '&sessionId=' + encodeURIComponent(sessionId) +
        '&deviceId=' + encodeURIComponent(custPayload.deviceId) +
        '&currentPath=' + encodeURIComponent(curPath) +
        '&pageTitle=' + encodeURIComponent(curTitle);

      if (skipGreeting) {
        wsUri += '&skipGreeting=true';
      } else if (returningVisitor) {
        wsUri += '&returningVisitor=true';
      }

      if (custPayload.customerToken && custPayload.customerToken.customerId) {
        wsUri += '&customerId=' + encodeURIComponent(custPayload.customerToken.customerId) +
          '&customerTimestamp=' + encodeURIComponent(custPayload.customerToken.timestamp) +
          '&customerSignature=' + encodeURIComponent(custPayload.customerToken.signature);
      }

      if (resumeToken) {
        wsUri += '&resumptionToken=' + encodeURIComponent(resumeToken);
      }

      // Recorded before the socket opens, not after the greeting plays: a page change
      // mid-greeting must still find the conversation parked and already greeted.
      writeNavState({ sessionId: sessionId, greeted: true, wasVoiceActive: true });
      if (!skipGreeting) markVisited();
      resumedFromNavigation = false;

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
          ws.send(JSON.stringify({
            type: 'client_context_update',
            currentPath: pageCtx.pathname || window.location.pathname || '/',
            title: pageCtx.title || document.title || '',
            history: [pageCtx.pathname || window.location.pathname || '/'],
            product: pageCtx.product || null,
            selectedVariantId: pageCtx.selectedVariantId || null
          }));
          if (custPayload.identified) {
            ws.send(JSON.stringify({
              type: 'client_identify',
              customerToken: custPayload.customerToken,
              userData: custPayload.identified
            }));
          }
          syncShopifyCart();
        } catch (e) {}
      };


      ws.onmessage = async function (event) {
        try {
          const msgData = typeof event.data === 'string' ? event.data : await (event.data).text();
          const msg = JSON.parse(msgData);

          if (msg.type === 'setup_complete' || msg.type === 'session_resumed') {
            cancelConnectWatchdog();
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

          if (msg.type === 'user_transcript' && msg.text) {
            cancelIdleTimer();
            lastSpeaker = 'user';
            liveSpeaker = 'user';
            const cleanText = msg.text.trim();
            if (cleanText) {
              liveUtterance = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
              showTranscript = true;
            }
            if (msg.isFinal) {
              isWaitingForAi = true;
            }
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
            if (
              cleanText &&
              !cleanText.startsWith('**') &&
              !cleanText.startsWith('##') &&
              !cleanText.startsWith('#') &&
              !cleanText.toLowerCase().startsWith('thought') &&
              !cleanText.toLowerCase().startsWith('thinking') &&
              !cleanText.toLowerCase().startsWith('internal:') &&
              !cleanText.toLowerCase().startsWith('[thought')
            ) {
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
            clearSessionNotice(); // user barged in — they are clearly still here
            if (recognition) { try { recognition.abort(); } catch (e) {} }
            return;
          }

          // ── Server session notices ──────────────────────────────────────────
          // idle_warning  : server thinks the customer went silent; ORA also asks aloud.
          // session_warning: approaching the hard max-duration ceiling.
          // session_ended : server has closed (or is closing) the session — always explain why.
          if (msg.type === 'idle_warning') {
            const secs = msg.secondsUntilClose || 20;
            console.log('[ORA Widget] Idle warning from server — closing in ' + secs + 's.');
            setSessionNotice(msg.message || 'Are you still there?', secs * 1000);
            return;
          }

          if (msg.type === 'session_warning') {
            const remaining = msg.remainingSeconds || 60;
            console.log('[ORA Widget] Session time-limit warning — ' + remaining + 's remaining.');
            setSessionNotice(
              msg.message || ('Session ends in ' + remaining + 's'),
              remaining * 1000,
            );
            return;
          }

          if (msg.type === 'session_ended') {
            console.log('[ORA Widget] Session ended by server — reason: ' + (msg.reason || 'unknown'));
            teardownAfterPlayback(msg.message || 'Session ended. Tap to start a new one.');
            return;
          }

          if (msg.type === 'turn_complete') {
            serverTurnActive = false;
            if (activeSources.length === 0) {
              settlePlayback();
            }
            if (pendingNavigation) runPendingNavigation(false);
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
            if (msg.action && msg.action.type === 'confirm_details' && msg.action.data) {
              var actData = msg.action.data;
              var changedField = null;
              if (actData.name && actData.name !== customerDetails.name) { customerDetails.name = actData.name; changedField = 'name'; }
              if (actData.email && actData.email !== customerDetails.email) { customerDetails.email = actData.email; changedField = 'email'; }
              if (actData.phone && actData.phone !== customerDetails.phone) { customerDetails.phone = actData.phone; changedField = 'phone'; }
              if (actData.address && actData.address !== customerDetails.address) { customerDetails.address = actData.address; changedField = 'address'; }

              showConfirmCard = true;
              isDetailsConfirmed = false;
              renderConfirmCard(changedField || true);
              armCardAutoDismiss(8000);
            }

            if (msg.action && msg.action.type === 'shopify_add_to_cart') {
              addToShopifyCart(msg.action);
            }

            if (msg.action && msg.action.type === 'shopify_update_cart') {
              updateShopifyCart(msg.action);
            }

            if (msg.action && msg.action.type === 'shopify_clear_cart') {
              clearShopifyCart();
            }

            if (msg.action && msg.action.type === 'navigate' && msg.action.destination) {
              var dest = msg.action.destination;
              if (dest.startsWith('#')) {
                // An anchor keeps the page, and the session, alive — scroll right away.
                var targetEl = document.querySelector(dest);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else if (dest.startsWith('/') || dest.startsWith('http')) {
                // A real page load ends this session, so let ORA announce it first.
                scheduleNavigation(dest);
              }
            }
            return;
          }

          if (msg.type === 'customer_details_confirmed') {
            handleConfirmSuccess();
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
        // The server closes shortly after `session_ended`; a goodbye still
        // playing then is finished by teardownAfterPlayback, not cut here.
        if (pendingEndTimer) return;
        if (voiceState !== 'idle' && voiceState !== 'standby') teardown();
      };

      await micPromise;
    } catch (err) {
      console.error('[ORA Widget] Start failed:', err);
      // Everything below the throw is skipped, so without this the state stays on
      // 'connecting' — which handleOrbTap refuses to act on, leaving the widget dead
      // until the page is reloaded. Anything that has already landed on a final state
      // (the mic handler above, or a teardown from the socket) is left alone.
      if (voiceState === 'connecting') {
        teardown();
        errorMsg = errorMsg || 'Could not start the session';
        voiceState = 'error';
        render();
      }
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
