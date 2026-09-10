#!/usr/bin/env node
/**
 * Builds the storefront widget bundle into public/ under a content-hashed filename
 * and rewrites the version manifest the loader reads.
 *
 * WHY THIS EXISTS
 * ---------------
 * The bundle used to ship as public/widget/v2/widget.v4_5_lumina.js — a filename that
 * *looks* like a content hash but never changed. Every edit shipped under the same URL
 * with no Cache-Control headers, so browsers and CDNs kept serving old bytes and fixed
 * bugs appeared to come back for returning visitors.
 *
 * Now: the source lives in widget-src/, the served file is named by the hash of its
 * contents, and latest.json points at it. A changed bundle means a changed URL, so
 * the immutable cache headers in next.config.ts are safe and updates land immediately.
 *
 * Run automatically via the predev/prebuild hooks in package.json.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLIENT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE = join(CLIENT_ROOT, 'widget-src', 'widget.js');
const OUT_DIR = join(CLIENT_ROOT, 'public', 'widget', 'v2');
const MANIFEST = join(CLIENT_ROOT, 'public', 'widget', 'latest.json');

/**
 * Stable no-cache alias, used only as the loader's fallback when the manifest fetch
 * itself fails. Lives outside v2/ so the immutable header never applies to it.
 */
const ALIAS = join(CLIENT_ROOT, 'public', 'widget', 'widget.latest.js');

/** Hash length — 12 hex chars is ample to avoid collisions here. */
const HASH_LENGTH = 12;

/**
 * How many previous hashed bundles to keep. A page that read the manifest moments
 * before a deploy still needs its bundle URL to resolve, so we do not prune to one.
 */
const KEEP_PREVIOUS = 3;

function main() {
  let source;
  try {
    source = readFileSync(SOURCE);
  } catch (err) {
    console.error(`[build-widget] Cannot read widget source at ${SOURCE}`);
    console.error(`[build-widget] ${err.message}`);
    process.exit(1);
  }

  const hash = createHash('sha256').update(source).digest('hex').slice(0, HASH_LENGTH);
  const filename = `widget.${hash}.js`;
  const bundleUrl = `/widget/v2/${filename}`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, filename), source);
  writeFileSync(ALIAS, source);

  // Two spaces + trailing newline keeps the diff readable when the hash changes.
  writeFileSync(
    MANIFEST,
    JSON.stringify({ version: 'v2', hash, bundleUrl }, null, 2) + '\n',
  );

  pruneOldBundles(filename);

  const kb = (source.length / 1024).toFixed(1);
  console.log(`[build-widget] ${bundleUrl} (${kb} KB, sha256:${hash})`);
}

/** Removes all but the newest KEEP_PREVIOUS stale hashed bundles. */
function pruneOldBundles(currentFilename) {
  let entries;
  try {
    entries = readdirSync(OUT_DIR).filter(
      (f) => /^widget\.[0-9a-f]+\.js$/.test(f) && f !== currentFilename,
    );
  } catch {
    return;
  }

  if (entries.length <= KEEP_PREVIOUS) return;

  const byNewest = entries
    .map((f) => {
      const path = join(OUT_DIR, f);
      return { f, path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const stale of byNewest.slice(KEEP_PREVIOUS)) {
    try {
      unlinkSync(stale.path);
      console.log(`[build-widget] pruned ${stale.f}`);
    } catch {
      // Non-fatal: a leftover bundle is harmless.
    }
  }
}

main();
