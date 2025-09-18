# rayole-games

Dynamic games loading and scraping
----------------------------------

- Client-side: Use the input in the Games section and paste a Google Play publisher URL (e.g. https://play.google.com/store/apps/developer?id=Rayole+Games). Due to CORS, direct fetches to Google are blocked by browsers. You have two options:

  1) Prebuilt JSON (no server):
     - Prefer per‑publisher JSON files; they are auto-detected by the site.
     - Generate per publisher and the combined file:
       - `node scripts/scrape-play-multi.js "https://play.google.com/store/apps/developer?id=Rayole+Games" "https://play.google.com/store/apps/developer?id=Rayole+Software"`
       - Outputs to `static/data/publishers/<slug>.json` and `static/data/publishers/_all.json`
     - Older single-publisher script is also available:
       - `node scripts/scrape-play.js "https://play.google.com/store/apps/developer?id=Rayole+Games" > static/data/games.json`

  2) Proxy mode (server/edge function):
     - Deploy with a small proxy endpoint that returns raw HTML for a target URL (e.g. `/api/proxy?url=`).
     - In `static/js/fetcher.js`, set `RAYOLE.CONFIG.PROXY` to the proxy endpoint prefix.
     - Then the Games input will fetch and parse live from the Play publisher page.

Notes
- Scraping is best-effort (Google markup may change). For production reliability, use a maintained API or server-side headless browser.
- Styling and interactions live in `static/css/main.css` and `static/js/*.js` for modularity.
