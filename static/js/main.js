// Rayole Games — main JS (modular, progressive, no bundler)

// Utilities
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

// Appbar behavior: sticky shadow + active link highlight
function initAppbar() {
  const appbar = qs('.appbar');
  const links = qsa('.nav a');
  const sections = qsa('section[id]');

  function onScroll() {
    const y = window.scrollY;
    appbar.classList.toggle('appbar--scrolled', y > 6);

    // progress bar
    const h = document.body.scrollHeight - window.innerHeight;
    const pct = Math.max(0, Math.min(1, y / (h || 1)));
    const bar = qs('.progress');
    if (bar) bar.style.width = (pct * 100).toFixed(2) + '%';

    // reveal back-to-top
    const toTop = qs('.to-top');
    if (toTop) toTop.classList.toggle('show', y > 480);

    // scrollspy (simple)
    let activeId = null;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= 100 && r.bottom >= 140) { activeId = s.id; break; }
    }
    links.forEach(a => a.classList.toggle('is-active', activeId && a.getAttribute('href') === `#${activeId}`));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Mobile nav
function initMobileNav() {
  const toggle = qs('#menu-toggle');
  const menu = qs('#mobile-nav');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-open');
    menu.classList.toggle('show');
  });
  qsa('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
    toggle.classList.remove('is-open');
    menu.classList.remove('show');
  }));
}

// Reveal on scroll
function initReveal() {
  const items = qsa('.reveal');
  if (!items.length) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(el => io.observe(el));
}

// Hero parallax glow
function initHeroGlow() {
  const hero = qs('.hero');
  if (!hero) return;
  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    hero.style.setProperty('--gx', `${Math.max(10, Math.min(90, x * 100))}%`);
  };
  hero.addEventListener('mousemove', onMove, { passive: true });
}

// Back to top
function initToTop() {
  const btn = qs('.to-top');
  if (!btn) return;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Smooth anchor scroll (for desktop nav)
function initSmoothAnchors() {
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = id ? qs(`#${id}`) : null;
      if (el) {
        e.preventDefault();
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// Auto-load games by hardcoded publishers
async function loadFromPublishers() {
  const urls = (window.RAYOLE?.PUBLISHERS || []).filter(Boolean);
  if (!urls.length) {
    if (window.RAYOLE?.populateGames) window.RAYOLE.populateGames(window.RAYOLE.GAMES, '#gamesList');
    return;
  }
  try {
    const games = await (window.RAYOLE.fetchFromPublishers
      ? window.RAYOLE.fetchFromPublishers(urls)
      : Promise.all(urls.map(u => window.RAYOLE.fetchFromPublisher(u))).then(all => all.flat()));
    console.log("NOW GAMES ARE HERE ---> ", games);
    
    window.RAYOLE.clearGames('#gamesList');
    if (games.length) {
      window.RAYOLE.populateGames(games, '#gamesList');
    } else {
      window.RAYOLE.populateGames(window.RAYOLE.GAMES, '#gamesList');
    }
    initReveal();
  } catch (e) {
    window.RAYOLE.clearGames('#gamesList');
    window.RAYOLE.populateGames(window.RAYOLE.GAMES, '#gamesList');
    initReveal();
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initAppbar();
  initMobileNav();
  initReveal();
  initHeroGlow();
  initToTop();
  initSmoothAnchors();
  // Load from publishers (falls back to static list if needed)
  loadFromPublishers();
});
