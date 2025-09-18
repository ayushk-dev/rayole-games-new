#!/usr/bin/env node
/**
 * Scrape multiple Google Play developer pages and write per-publisher JSON files.
 * Usage:
 *   node scripts/scrape-play-multi.js \
 *     "https://play.google.com/store/apps/developer?id=Rayole+Games" \
 *     "https://play.google.com/store/apps/developer?id=Rayole+Software"
 *
 * Outputs:
 *   - static/data/publishers/<slug>.json (one per input)
 *   - static/data/publishers/_all.json   (combined)
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const urls = process.argv.slice(2).filter(Boolean);
  if (!urls.length) {
    console.error('Provide one or more developer URLs as arguments.');
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), 'static', 'data', 'publishers');
  fs.mkdirSync(outDir, { recursive: true });

  const all = [];
  for (const u of urls) {
    const html = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RayoleScraper/1.0' } }).then(r => r.text());
    const items = parsePlayDeveloperHtml(html, u);
    const slug = publisherSlug(u);
    fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(items, null, 2));
    all.push(...items);
    console.error(`Wrote ${items.length} apps for ${u} -> publishers/${slug}.json`);
  }
  const deduped = dedupeByUrl(all);
  fs.writeFileSync(path.join(outDir, `_all.json`), JSON.stringify(deduped, null, 2));
  console.error(`Wrote combined ${deduped.length} apps -> publishers/_all.json`);
}

function parsePlayDeveloperHtml(html, devUrl) {
  const base = 'https://play.google.com';
  // Try to parse anchors first
  const itemRegex = /<a[^>]+href=\"(\/store\/apps\/details\?id=[^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
  const imgRegex = /<img[^>]+src(?:set)?=\"([^\"]+)\"/i;
  const titleRegex = /<div[^>]*?class=\"[^\"]*?WsMG1c[^\"]*\"[^>]*?>([^<]+)<\/div>|<span[^>]*?class=\"[^\"]*?DdYX5[^\"]*\"[^>]*?>([^<]+)<\/span>/i;
  const ratingRegex = /aria-label=\"Rated ([0-9.]+) stars out of five/;

  const seen = new Set();
  const games = [];
  let m;
  while ((m = itemRegex.exec(html))) {
    const href = m[1];
    const block = m[2] || '';
    const url = href.startsWith('http') ? href : base + href;
    if (seen.has(url)) continue;
    seen.add(url);

    const titleMatch = block.match(titleRegex);
    const title = (titleMatch && (titleMatch[1] || titleMatch[2])) ? (titleMatch[1] || titleMatch[2]).trim() : 'Untitled';
    const imgMatch = block.match(imgRegex);
    const img = imgMatch ? imgMatch[1].split(' ')[0] : '';
    const ratingMatch = block.match(ratingRegex);
    const rating = ratingMatch ? `${ratingMatch[1]} ★` : '';

    games.push({ title, publisher: getPublisherFromUrl(devUrl), rating, img, url });
  }

  // If anchor-based parsing produced nothing, attempt to parse init data blocks (best-effort)
  if (!games.length) {
    const jsonBlocks = Array.from(html.matchAll(/AF_initDataCallback\(.*?data:(\[.*?\])\s*,\s*sideChannel/gms)).map(m => m[1]);
    for (const jb of jsonBlocks) {
      try {
        const data = JSON.parse(jb);
        const found = extractFromTree(data, devUrl);
        if (found.length) games.push(...found);
      } catch {}
    }
  }

  return dedupeByUrl(games);
}

function extractFromTree(data, devUrl) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      // Heuristic: app detail entries often contain id, title, and image URL in nested arrays
      if (node.length && typeof node[0] === 'string' && node[0].includes('details?id=')) {
        const url = 'https://play.google.com/store/apps/' + node[0];
        const title = String(node[2] || node[1] || '').toString();
        const img = findFirstImage(node);
        if (url && title) out.push({ title, publisher: getPublisherFromUrl(devUrl), rating: '', img, url });
      }
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(data);
  return out;
}

function findFirstImage(arr) {
  let res = '';
  const walk = (n) => {
    if (res) return;
    if (typeof n === 'string' && (n.startsWith('http') && (n.includes('googleusercontent.com')))) {
      res = n;
      return;
    }
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') Object.values(n).forEach(walk);
  };
  walk(arr);
  return res;
}

function getPublisherFromUrl(url) {
  try {
    const u = new URL(url);
    const id = u.searchParams.get('id') || u.searchParams.get('pub');
    return id || 'Publisher';
  } catch { return 'Publisher'; }
}

function rawPublisherId(url){
  try {
    const u = new URL(url);
    return u.searchParams.get('id') || u.searchParams.get('pub') || 'publisher';
  } catch { return 'publisher'; }
}

function publisherSlug(url) {
  const raw = rawPublisherId(url);
  try {
    const decoded = decodeURIComponent(raw.replace(/\+/g, ' '));
    return decoded.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'publisher';
  } catch {
    return 'publisher';
  }
}

function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter(x => (x && x.url && !seen.has(x.url)) ? (seen.add(x.url), true) : false);
}

main().catch((e) => { console.error(e); process.exit(3); });

