/**
 * ORA Voice AI — Two-Stage Lightweight Loader (~1KB)
 * Fetches latest.json version manifest and injects the content-hashed bundle.
 */
(function (w, d) {
  'use strict';

  if (w.__ORA_LOADER__) return;
  w.__ORA_LOADER__ = true;

  // Initialize global ORA command queue if not already defined
  w.ORA = w.ORA || function () {
    (w.ORA.q = w.ORA.q || []).push(arguments);
  };

  var scriptEl =
    d.currentScript ||
    d.querySelector('script[data-ora-key]') ||
    d.querySelector('script[src*="ora-widget.js"]') ||
    d.querySelector('script[src*="loader.js"]');

  var key =
    (w.ORA_CONFIG && (w.ORA_CONFIG.key || w.ORA_CONFIG.apiKey)) ||
    (scriptEl && scriptEl.getAttribute('data-ora-key')) ||
    '';

  var apiBase =
    (w.ORA_CONFIG && w.ORA_CONFIG.api) ||
    (scriptEl && scriptEl.getAttribute('data-ora-api')) ||
    '';

  if (!apiBase && scriptEl && scriptEl.src) {
    try {
      var parsed = new URL(scriptEl.src);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        apiBase = parsed.protocol + '//' + parsed.hostname + ':5000';
      } else if (parsed.hostname.indexOf('ora.ai') !== -1 || parsed.hostname.indexOf('ora-ai') !== -1) {
        apiBase = parsed.origin.replace('//cdn.', '//api.').replace('//app.', '//api.');
      } else {
        apiBase = parsed.origin;
      }
    } catch (e) {}
  }

  if (!apiBase) {
    if (w.location.hostname === 'localhost' || w.location.hostname === '127.0.0.1') {
      apiBase = w.location.protocol + '//' + w.location.hostname + ':5000';
    } else {
      apiBase = 'https://api.ora.ai';
    }
  }

  if (apiBase) {
    apiBase = apiBase.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }

  // Ensure window.ORA_CONFIG is populated for downstream bundle
  w.ORA_CONFIG = w.ORA_CONFIG || {};
  if (key && !w.ORA_CONFIG.key) w.ORA_CONFIG.key = key;
  if (apiBase && !w.ORA_CONFIG.api) w.ORA_CONFIG.api = apiBase;

  function injectBundle(bundleUrl) {
    if (!bundleUrl) return;
    var resolvedUrl = bundleUrl;
    if (bundleUrl.startsWith('/')) {
      try {
        var baseOrigin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : w.location.origin;
        resolvedUrl = baseOrigin + bundleUrl;
      } catch (e) {
        resolvedUrl = bundleUrl;
      }
    }

    var bundleScript = d.createElement('script');
    bundleScript.type = 'text/javascript';
    bundleScript.async = true;
    bundleScript.defer = true;
    bundleScript.src = resolvedUrl;
    if (key) bundleScript.setAttribute('data-ora-key', key);
    if (apiBase) bundleScript.setAttribute('data-ora-api', apiBase);
    d.head.appendChild(bundleScript);
  }

  /**
   * Fallback used ONLY when the manifest itself cannot be fetched (offline, blocked).
   * Deliberately unhashed and served with max-age=0, so it can never pin a visitor to
   * a stale bundle the way the old hardcoded widget.v4_5_lumina.js URL did.
   */
  var FALLBACK_BUNDLE_URL = '/widget/widget.latest.js';

  // Discover latest version pointer
  var manifestUrl = '/widget/latest.json';
  if (scriptEl && scriptEl.src) {
    try {
      manifestUrl = new URL('/widget/latest.json', scriptEl.src).href;
    } catch (e) {}
  }

  // Always revalidate: the manifest is the only thing that says which content-hashed
  // bundle is current, and 'default' let the browser serve it from cache for hours —
  // which is how shipped fixes failed to reach returning visitors. It is served with
  // max-age=0 (see next.config.ts), so this is a cheap 304 in the common case.
  fetch(manifestUrl, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('Manifest fetch failed');
      return res.json();
    })
    .then(function (manifest) {
      if (manifest && manifest.bundleUrl) {
        injectBundle(manifest.bundleUrl);
      } else {
        injectBundle(FALLBACK_BUNDLE_URL);
      }
    })
    .catch(function () {
      // Manifest unreachable — fall back to the unhashed, always-revalidated copy.
      injectBundle(FALLBACK_BUNDLE_URL);
    });
})(window, document);
