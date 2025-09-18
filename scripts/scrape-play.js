#!/usr/bin/env node
/**
 * Scrape Google Play developer page and output games JSON.
 * Usage: node scripts/scrape-play.js "https://play.google.com/store/apps/developer?id=Rayole+Games" > static/data/games.json
 *
 * Note: This is a best-effort scraper using simple regex against HTML.
 * For reliability, consider using a server-side headless browser or an API.
 */

const fs = require('fs');

async function main() {
  const devUrl = process.argv[2];
  if (!devUrl) {
    console.error('Developer URL required.');
    process.exit(1);
  }

  const res = await fetch(devUrl, { headers: { 'user-agent': 'Mozilla/5.0 RayoleBot/1.0' } });
  if (!res.ok) {
    console.error('Failed to fetch developer page', res.status, res.statusText);
    process.exit(2);
  }
  const html = await res.text();
  const games = parsePlayDeveloperHtml(html, devUrl);
  process.stdout.write(JSON.stringify(games, null, 2));
}

function parsePlayDeveloperHtml(html, devUrl) {
  const base = 'https://play.google.com';
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
  return games;
}

function getPublisherFromUrl(url) {
  try {
    const u = new URL(url);
    const id = u.searchParams.get('id') || u.searchParams.get('pub');
    return id || 'Publisher';
  } catch { return 'Publisher'; }
}

main().catch((e) => { console.error(e); process.exit(3); });

