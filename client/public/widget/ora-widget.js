/**
 * ORA Voice AI — Two-Stage Lightweight Loader (Backward-Compatible Entrypoint)
 * Repurposed as the lightweight loader resolving latest.json to load the content-hashed bundle.
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
      } else {
        apiBase = parsed.origin;
      }
    } catch (e) {}
  }

  if (!apiBase) {
    apiBase = (w.location.hostname === 'localhost' || w.location.hostname === '127.0.0.1')
      ? w.location.protocol + '//' + w.location.hostname + ':5000'
      : w.location.origin;
  }

  if (apiBase) {
    apiBase = apiBase.replace(/\/api\/v1\/?$/, '');
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

  // Discover latest version pointer
  var manifestUrl = '/widget/latest.json';
  if (scriptEl && scriptEl.src) {
    try {
      manifestUrl = new URL('/widget/latest.json', scriptEl.src).href;
    } catch (e) {}
  }

  fetch(manifestUrl, { cache: 'default' })
    .then(function (res) {
      if (!res.ok) throw new Error('Manifest fetch failed');
      return res.json();
    })
    .then(function (manifest) {
      if (manifest && manifest.bundleUrl) {
        injectBundle(manifest.bundleUrl);
      } else {
        injectBundle('/widget/v2/widget.v4_5_lumina.js');
      }
    })
    .catch(function () {
      // Fallback to default versioned bundle
      injectBundle('/widget/v2/widget.v4_5_lumina.js');
    });
})(window, document);
