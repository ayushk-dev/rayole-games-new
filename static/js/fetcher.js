// // Fetch games dynamically from Google Play developer pages.
// // Exposes:
// // - RAYOLE.fetchFromPublisher(url) -> Promise<games[]>
// // - RAYOLE.fetchFromPublishers(urls: string[]) -> Promise<games[]>

// window.RAYOLE = window.RAYOLE || {};

// RAYOLE.CONFIG = Object.assign({
//   // Proxy endpoint to bypass CORS. Two modes supported:
//   // 1) Query param proxy (append encodeURIComponent(url)): '/api/proxy?url='
//   // 2) Prefix proxy (append URL without scheme): 'https://r.jina.ai/http//'
//   // Defaults to a read-only public proxy good for HTML fetching.
//   PROXY: 'https://r.jina.ai/http://'
// }, window.RAYOLE?.CONFIG || {});

// function viaProxy(targetUrl) {
//   const p = RAYOLE.CONFIG?.PROXY || '';
//   if (!p) return null;
//   // Query-param style proxy
//   if (p.includes('?')) return p + encodeURIComponent(targetUrl);
//   // Prefix proxy expecting scheme-less URL
//   const noScheme = String(targetUrl).replace(/^https?:\/\//, '');
//   const needsSlash = p.endsWith('/') ? '' : '/';
//   // If proxy already ends with 'http://' style, don't double the slash
//   return p.endsWith('http://') || p.endsWith('https://') ? p + noScheme : p + needsSlash + noScheme;
// }

// RAYOLE.fetchFromPublisher = async function fetchFromPublisher(devUrl) {
//   if (!devUrl || typeof devUrl !== 'string') throw new Error('Developer URL required');

//   // If a proxy is configured, try fetching via proxy (CORS-safe)
//   const proxied = viaProxy(devUrl);
//   if (proxied) {
//     const res = await fetch(proxied);
    
//     if (!res.ok) throw new Error('Proxy request failed');
//     const html = await res.text();
//     console.log();
//     console.log("Hey here is the one requested --> ", parsePlayDeveloperHtml(html, devUrl));
    
//     return parsePlayDeveloperHtml(html, devUrl);
//   }

//   // Without a proxy, client-side fetch to Google Play will be blocked by CORS.
//   // Fall back to attempting same-origin JSON (prebuilt) if present.
//   const slug = publisherSlug(devUrl);
//   // Try human-friendly slug and URL-encoded id, both supported
//   const perPub = await (tryFetchJson(`/static/data/publishers/${slug}.json`) || tryFetchJson(`/static/data/publishers/${encodeURIComponent(rawPublisherId(devUrl))}.json`));
//   if (perPub?.length) return perPub;
//   // No proxy and no per-publisher JSON — return empty and let caller decide fallback.
//   return [];
// }

// // RAYOLE.fetchFromPublishers = async function fetchFromPublishers(urls) {
// //   const list = Array.isArray(urls) ? urls : (urls ? [urls] : []);
// //   if (!list.length) return [];

// //   // If proxy is available, fetch all in parallel via proxy and parse
// //   if (viaProxy('https://example.com')) {
// //     const htmls = await Promise.all(list.map(u => fetch(viaProxy(u))
// //       .then(r => { if (!r.ok) throw new Error('Proxy request failed'); return r.text(); }))); 
// //     const combined = [];
// //     htmls.forEach((html, i) => combined.push(...parsePlayDeveloperHtml(html, list[i])));
// //     return dedupeByUrl(combined);
// //   }

// //   // Without proxy, aggregate from per-publisher JSON files if present
// //   const results = [];
// //   for (const u of list) {
// //     const slug = publisherSlug(u);
// //     // Try human-friendly slug, then raw encoded id
// //     const perPub = await (tryFetchJson(`/static/data/publishers/${slug}.json`) || tryFetchJson(`/static/data/publishers/${encodeURIComponent(rawPublisherId(u))}.json`));
    
// //     if (perPub?.length) results.push(...perPub);
// //   }
// //   if (results.length) return dedupeByUrl(results);

// //   // Final fallback: combined file or site-wide games.json if you choose to create them
// //   const combined = await (tryFetchJson('/static/data/publishers/_all.json') || tryFetchJson('/static/data/games.json'));
// //   return dedupeByUrl(combined || []);
// // }

// async function tryFetchJson(path) {
//   try {
//     const res = await fetch(path, { cache: 'no-store' });
//     if (!res.ok) return null;
//     return await res.json();
//   } catch { return null; }
// }

// function parsePlayDeveloperHtml(html, devUrl) {
//   // Very light-weight parsing; Google may change markup anytime.
//   // Extract anchors to /store/apps/details and accompanying image/title/rating where available.
//   const base = 'https://play.google.com';
//   const itemRegex = /<a[^>]+href=\"(\/store\/apps\/details\?id=[^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
//   const imgRegex = /<img[^>]+src(?:set)?=\"([^\"]+)\"/i;
//   const titleRegex = /<div[^>]*?class=\"[^\"]*?WsMG1c[^\"]*\"[^>]*?>([^<]+)<\/div>|<span[^>]*?class=\"[^\"]*?DdYX5[^\"]*\"[^>]*?>([^<]+)<\/span>/i;
//   const ratingRegex = /aria-label=\"Rated ([0-9.]+) stars out of five/;

//   console.log("ITEMS == ", itemRegex);

//   const seen = new Set();
//   const games = [];
//   let m;
//   while ((m = itemRegex.exec(html))) {
//     const href = m[1];
//     const block = m[2] || '';
//     const url = href.startsWith('http') ? href : base + href;
//     if (seen.has(url)) continue;
//     seen.add(url);

//     const titleMatch = block.match(titleRegex);
//     const title = (titleMatch && (titleMatch[1] || titleMatch[2])) ? (titleMatch[1] || titleMatch[2]).trim() : 'Untitled';
//     const imgMatch = block.match(imgRegex);
//     const img = imgMatch ? imgMatch[1].split(' ')[0] : '';
//     const ratingMatch = block.match(ratingRegex);
//     const rating = ratingMatch ? `${ratingMatch[1]} ★` : '';

//     games.push({ title, publisher: getPublisherFromUrl(devUrl), rating, img, url });
//   }
//   // Fallback 1: Jina Reader style markdown (no <a> anchors)
//   if (!games.length) {
//     const md = String(html);
//     const mdRe = /\[([^\]]+?)\]\((https?:\/\/play\.google\.com\/store\/apps\/details\?id=[^)]+)\)/g;
//     let mm;
//     while ((mm = mdRe.exec(md))) {
//       const labelRaw = mm[1];
//       const url = mm[2];
//       // Extract first image inside the label
//       let img = '';
//       const imgInLabel = [...labelRaw.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].map(x => x[1]);
//       if (imgInLabel.length) {
//         // Prefer banner-like size if present
//         img = imgInLabel.find(s => /w\d+-h\d+-rw/.test(s)) || imgInLabel[0];
//       }
//       // Remove image markdown to leave textual title + publisher + rating
//       let label = labelRaw.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
//       // Extract rating like: `3.9 _star_` or `4.2 ★`
//       let rating = '';
//       const r1 = label.match(/([0-5](?:\.[0-9])?)\s*(?:★|_star_)/i);
//       if (r1) {
//         rating = `${r1[1]} ★`;
//         label = label.replace(r1[0], '').trim();
//       }
//       // Remove publisher name from label if present
//       const pub = decodeURIComponent((getPublisherFromUrl(devUrl) || '').replace(/\+/g, ' '));
//       const rePub = new RegExp(`\\b${pub.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
//       label = label.replace(rePub, ' ').replace(/\s+/g, ' ').trim();
//       const title = label || url.split('=')[1];
//       games.push({ title, publisher: pub || getPublisherFromUrl(devUrl), rating, img, url });
//     }
//   }

//   // Fallback 2: attempt to parse from init data blocks if still not enough
//   if (games.length < 2) {
//     const jsonBlocks = Array.from(html.matchAll(/AF_initDataCallback\(.*?data:(\[.*?\])\s*,\s*sideChannel/gms)).map(m => m[1]);
//     for (const jb of jsonBlocks) {
//       try {
//         const data = JSON.parse(jb);
//         const found = extractFromTree(data, devUrl);
//         if (found.length) found.forEach(g => { if (!games.find(x => x.url === g.url)) games.push(g); });
//       } catch {}
//     }
//   }
//   return games;
// }

// function getPublisherFromUrl(url) {
//   try {
//     const u = new URL(url);
//     const id = u.searchParams.get('id') || u.searchParams.get('pub');
//     return id || 'Publisher';
//   } catch { return 'Publisher'; }
// }

// function extractFromTree(data, devUrl) {
//   const out = [];
//   const walk = (node) => {
//     if (Array.isArray(node)) {
//       if (node.length && typeof node[0] === 'string' && /details\?id=/.test(node[0])) {
//         const url = node[0].startsWith('http') ? node[0] : `https://play.google.com/store/apps/${node[0]}`;
//         const title = String(node[2] || node[1] || '').toString();
//         const img = findFirstImage(node);
//         if (url && title) out.push({ title, publisher: getPublisherFromUrl(devUrl), rating: '', img, url });
//       }
//       node.forEach(walk);
//     } else if (node && typeof node === 'object') {
//       Object.values(node).forEach(walk);
//     }
//   };
//   walk(data);
//   return out;
// }

// function findFirstImage(arr) {
//   let res = '';
//   const walk = (n) => {
//     if (res) return;
//     if (typeof n === 'string' && (n.startsWith('http') && n.includes('googleusercontent.com'))) {
//       res = n;
//       return;
//     }
//     if (Array.isArray(n)) n.forEach(walk);
//     else if (n && typeof n === 'object') Object.values(n).forEach(walk);
//   };
//   walk(arr);
//   return res;
// }

// function rawPublisherId(url){
//   try {
//     const u = new URL(url);
//     return u.searchParams.get('id') || u.searchParams.get('pub') || 'publisher';
//   } catch { return 'publisher'; }
// }

// function publisherSlug(url) {
//   const raw = rawPublisherId(url);
//   try {
//     const decoded = decodeURIComponent(raw.replace(/\+/g, ' '));
//     return decoded.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'publisher';
//   } catch {
//     return 'publisher';
//   }
// }

// function dedupeByUrl(items) {
//   if (!Array.isArray(items)) return [];
//   const seen = new Set();
//   return items.filter(x => (x && x.url && !seen.has(x.url)) ? (seen.add(x.url), true) : false);
// }



/**
 * Minimal Google Play publisher scraper (client-side).
 * Exposes:
 *   - RAYOLE.fetchFromPublisher(url) -> Promise<games[]>
 *   - RAYOLE.fetchFromPublishers(urls: string[]) -> Promise<games[]>
 *   - RAYOLE.renderTo(container, games) -> void   (optional helper)
 *
 * NOTE: By default uses Jina Reader proxy to bypass CORS.
 */

window.RAYOLE = window.RAYOLE || {};

RAYOLE.CONFIG = Object.assign(
  {
    // Two proxy styles supported:
    // 1) Prefix proxy (append URL without scheme): 'https://r.jina.ai/http://'
    // 2) Query-param proxy (append encodeURIComponent(url)): '/api/proxy?url='
    PROXY: 'https://r.jina.ai/http://',
  },
  window.RAYOLE?.CONFIG || {}
);

// ———————————————————————————————————————————————————————————
// Helpers
// ———————————————————————————————————————————————————————————

function viaProxy(targetUrl) {
  const p = RAYOLE.CONFIG?.PROXY || '';
  if (!p) return null;
  if (p.includes('?')) return p + encodeURIComponent(targetUrl); // query-param proxy
  const noScheme = String(targetUrl).replace(/^https?:\/\//, '');
  return p.endsWith('/') ? p + noScheme : p + '/' + noScheme;    // prefix proxy
}

function dedupeByUrl(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((x) => {
    if (!x?.url) return false;
    if (seen.has(x.url)) return false;
    seen.add(x.url);
    return true;
  });
}

function rawPublisherId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('id') || u.searchParams.get('pub') || '';
  } catch {
    return '';
  }
}

function publisherFromUrl(url) {
  const id = rawPublisherId(url);
  try {
    return decodeURIComponent(id.replace(/\+/g, ' ')) || 'Publisher';
  } catch {
    return id || 'Publisher';
  }
}

function pickBestSrc(imgEl) {
  if (!imgEl) return '';
  // Prefer srcset's last candidate (often the largest), else src
  const ss = imgEl.getAttribute('srcset');
  if (ss) {
    const parts = ss.split(',').map((s) => s.trim());
    const last = parts[parts.length - 1];
    const url = (last || '').split(' ')[0];
    if (url) return url;
  }
  return imgEl.getAttribute('src') || '';
}

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// Extract title from an anchor using several heuristics.
function titleFromAnchor(a) {
  // 1) aria-label often contains the app name at the start
  const aria = a.getAttribute('aria-label');
  if (aria) {
    const t = cleanText(aria.split(' – ')[0] || aria.split(' by ')[0] || aria);
    if (t) return t;
  }
  // 2) A child element with a title attribute
  const titled = a.querySelector('[title]');
  if (titled?.getAttribute('title')) {
    const t = cleanText(titled.getAttribute('title'));
    if (t) return t;
  }
  // 3) Largest meaningful text fragment inside
  const text = cleanText(a.textContent || '');
  if (text) {
    // Drop common UI words
    const candidates = text
      .split(/[\n\r]/g)
      .map(cleanText)
      .filter(Boolean)
      .filter((t) => !/^(install|game|app|more|learn more)$/i.test(t))
      .sort((b, a) => a.length - b.length);
    if (candidates[0]) return candidates[0];
  }
  return '';
}

function ratingFromNode(node) {
  // Look for aria-label style: "Rated 4.4 stars out of five"
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
  let current;
  while ((current = walker.nextNode())) {
    const aria = current.getAttribute?.('aria-label');
    const m = aria && aria.match(/Rated\s+([0-5](?:\.[0-9])?)\s+stars/i);
    if (m) return `${m[1]} ★`;
  }
  // Fallback: scan text content for patterns like "4.4 ★"
  const t = node.textContent || '';
  const m2 = t.match(/([0-5](?:\.[0-9])?)\s*★/);
  if (m2) return `${m2[1]} ★`;
  return '';
}

// ———————————————————————————————————————————————————————————
// Core parser (DOM-first, then markdown, then initData JSON)
// ———————————————————————————————————————————————————————————

function parsePlayDeveloperHtml(html, devUrl) {
  const publisher = publisherFromUrl(devUrl);
  const out = [];

  // Try DOM first (most reliable & simple)
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(
      doc.querySelectorAll('a[href*="/store/apps/details?id="]')
    );
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const url = new URL(href, 'https://play.google.com').href;
      const img = pickBestSrc(a.querySelector('img'));
      const title = titleFromAnchor(a) || url.split('=')[1] || 'Untitled';
      const rating = ratingFromNode(a);
      out.push({ title, publisher, rating, img, url });
    }
    if (out.length) return dedupeByUrl(out);
  } catch {
    /* fall through */
  }

  // Markdown-style fallback (what r.jina.ai sometimes returns)
  {
    const md = String(html);
    const mdLinkRe = /\[([^\]]+?)\]\((https?:\/\/play\.google\.com\/store\/apps\/details\?id=[^)]+)\)/g;
    let m;
    while ((m = mdLinkRe.exec(md))) {
      const label = m[1] || '';
      const url = m[2];
      // Extract any image URLs that look like Play assets
      const imgMatch = label.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
      const img = imgMatch ? imgMatch[1] : '';
      // Title: label without image markdown and rating tokens
      let title = cleanText(label.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '));
      // Try to strip trailing rating like "4.4 ★" or "4.4 _star_"
      title = cleanText(title.replace(/([0-5](?:\.[0-9])?)\s*(?:★|_star_)/i, ' '));
      const rating = (label.match(/([0-5](?:\.[0-9])?)\s*(?:★|_star_)/i)?.[1] || '')
        ? `${label.match(/([0-5](?:\.[0-9])?)\s*(?:★|_star_)/i)[1]} ★`
        : '';
      out.push({ title: title || url.split('=')[1], publisher, rating, img, url });
    }
    if (out.length) return dedupeByUrl(out);
  }

  // Init data JSON fallback (very loose, title/rating may be missing)
  {
    const blocks = Array.from(
      html.matchAll(/AF_initDataCallback\(.*?data:(\[.*?\])\s*,\s*sideChannel/gms)
    ).map((m) => m[1]);

    for (const jb of blocks) {
      try {
        const data = JSON.parse(jb);
        // Walk for strings like "details?id=com.example.app"
        const walk = (n) => {
          if (Array.isArray(n)) {
            for (const v of n) walk(v);
          } else if (n && typeof n === 'object') {
            for (const v of Object.values(n)) walk(v);
          } else if (typeof n === 'string' && /details\?id=/.test(n)) {
            const path = n.startsWith('http')
              ? n
              : `https://play.google.com/store/apps/${n.replace(/^\/?store\/apps\//, '')}`;
            const url = path.replace('store/apps/store/apps/', 'store/apps/'); // guard
            out.push({
              title: url.split('=')[1],
              publisher,
              rating: '',
              img: '',
              url,
            });
          }
        };
        walk(data);
      } catch {
        /* ignore */
      }
    }
    if (out.length) return dedupeByUrl(out);
  }

  return [];
}

// ———————————————————————————————————————————————————————————
// Public API
// ———————————————————————————————————————————————————————————

RAYOLE.fetchFromPublisher = async function fetchFromPublisher(devUrl) {
  if (!devUrl || typeof devUrl !== 'string') throw new Error('Developer URL required');

  const proxied = viaProxy(devUrl);
  const fetchUrl = proxied || devUrl; // without proxy, CORS will likely block

  const res = await fetch(fetchUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  return parsePlayDeveloperHtml(html, devUrl);
};

RAYOLE.fetchFromPublishers = async function fetchFromPublishers(urls) {
  const list = Array.isArray(urls) ? urls : urls ? [urls] : [];
  if (!list.length) return [];
  const htmls = await Promise.all(
    list.map(async (u) => {
      const proxied = viaProxy(u);
      const res = await fetch(proxied || u, { cache: 'no-store' });
      if (!res.ok) return '';
      return await res.text();
    })
  );

  const combined = [];
  htmls.forEach((html, i) => {
    combined.push(...parsePlayDeveloperHtml(html, list[i]));
  });
  return dedupeByUrl(combined);
};

// ———————————————————————————————————————————————————————————
// Optional: Simple renderer (grid cards)
// ———————————————————————————————————————————————————————————

RAYOLE.renderTo = function renderTo(container, games) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;
  el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
  wrap.style.gap = '14px';

  (games || []).forEach((g) => {
    const card = document.createElement('a');
    card.href = g.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.style.textDecoration = 'none';
    card.style.border = '1px solid #e5e7eb';
    card.style.borderRadius = '14px';
    card.style.padding = '10px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';

    const img = document.createElement('img');
    img.src = g.img || '';
    img.alt = g.title || 'App';
    img.style.width = '100%';
    img.style.aspectRatio = '16/9';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '10px';

    const title = document.createElement('div');
    title.textContent = g.title || '';
    title.style.fontWeight = '600';
    title.style.fontSize = '14px';
    title.style.lineHeight = '1.2';

    const meta = document.createElement('div');
    meta.textContent = [g.publisher, g.rating].filter(Boolean).join(' · ');
    meta.style.fontSize = '12px';
    meta.style.color = '#6b7280';

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(meta);
    wrap.appendChild(card);
  });

  el.appendChild(wrap);
};

// ———————————————————————————————————————————————————————————
// Example usage (uncomment to try):
//
// const devUrl = 'https://play.google.com/store/apps/developer?id=Rayole+Games';
// RAYOLE.fetchFromPublisher(devUrl).then((games) => {
//   console.log(games);
//   RAYOLE.renderTo('#apps', games); // if you have <div id="apps"></div>
// });
//
// ———————————————————————————————————————————————————————————