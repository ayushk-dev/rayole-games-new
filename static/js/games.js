// Games data and renderer kept isolated for modularity
// Exposes: RAYOLE.GAMES, RAYOLE.populateGames(list), RAYOLE.clearGames()

window.RAYOLE = window.RAYOLE || {};

RAYOLE.GAMES = [
  {
    title: "Match Play 3D",
    publisher: "Rayole Games",
    rating: "4.4 ★",
    img: "https://play-lh.googleusercontent.com/SJPHPVV6mG0qlfktprMfkIDiuNoJcFWiFO-HcfIhlHsND5r96C2A0S526dZSi3H1Vrs=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.match.play3D"
  },
  {
    title: "Knife Ninja",
    publisher: "Rayole Games",
    rating: "4.6 ★",
    img: "https://play-lh.googleusercontent.com/Q-Qlovsp69qoA2NZeB_0pSq2iWo-eV4RRM7Bs6C7PsedO2gj7hHcEzJy1Mz5WCGRJw=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.knife.ninja"
  },
  {
    title: "Aqua Blast",
    publisher: "Rayole Games",
    rating: "4.7 ★",
    img: "https://play-lh.googleusercontent.com/8ZdYWnewThrhWdWYo4vo7fXX21E56F-lZvdjrCIHisc2NqQBfK8B2JB7CJTcEABxEJXJeEF782qLo9PZPNY=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.aqua.blast"
  },
  {
    title: "Gold Miner",
    publisher: "Rayole Games",
    rating: "4.5 ★",
    img: "https://play-lh.googleusercontent.com/efLH1x3c9UtoReUAg8NhmhLwraQwfDJXkd4voPUd5htTRJhqolK5sckatVlnrch_Km4wLV3g8L2_-G4bKoVS=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.gold.miner"
  },
  {
    title: "Tower Challenge",
    publisher: "Rayole Games",
    rating: "4.7 ★",
    img: "https://play-lh.googleusercontent.com/agtZYrxWhOoqaZKb5Ts_JkxGO_0CX-spH5uE3lBHSLguirzGbSeqesonoHI__e84ayacY2dk4xQJNHc8pAvZvQ=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.tower.challenge"
  },
  {
    title: "Sort Master",
    publisher: "Rayole Games",
    rating: "4.8 ★",
    img: "https://play-lh.googleusercontent.com/yx6xqW9hE3GzvqKN1U1dqi3_kZF0bCz8LT5IwvPd7CkbD6bPe7Ic8DAM68f7z1SUooA8WgvZsji7-82Ap4c-=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.sort.master"
  },
  {
    title: "Bouncy Ball",
    publisher: "Rayole Games",
    rating: "4.7 ★",
    img: "https://play-lh.googleusercontent.com/EoMchecbVWg_9dlA-dsDrFgTidRZmpHcpRVPxZvqZ7YOoLaRhbnHzeVOhiGQSmeQnpCOUGXTuvy4OZEgtykN-nc=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.bouncy.ball"
  },
  {
    title: "Dungeon Escape",
    publisher: "Rayole Games",
    rating: "4.8 ★",
    img: "https://play-lh.googleusercontent.com/sYcZtYMvI085Lr9bjkefstVVid7NlZofnU5dwzxsV_4aIuy6EFooXrOQ2d8b3ul_QMb4xm26hhNIHvcOfi_Uqxk=w832-h470-rw",
    url: "https://play.google.com/store/apps/details?id=com.rayole.games.dungeon.escape"
  }
];

RAYOLE.clearGames = function clearGames(selector = '#gamesList') {
  const list = document.querySelector(selector);
  if (list) list.innerHTML = '';
}

RAYOLE.populateGames = function populateGames(games, selector = '#gamesList') {
  const list = document.querySelector(selector);
  if (!list || !Array.isArray(games)) return;
  const frag = document.createDocumentFragment();
  games.forEach(game => {
    const a = document.createElement('a');
    a.className = 'card reveal';
    a.href = game.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const rating = (game.rating || '').trim();
    a.innerHTML = `
      <img class=\"card__media\" src=\"${game.img}\" alt=\"${game.title}\">\n      <div class=\"card__body\">\n        <div class=\"card__text\">\n          <div class=\"card__title-row\">\n            <div class=\"card__title\">${game.title}</div>\n            ${rating ? `<div class=\\"card__rating-badge\\">${rating}</div>` : ''}\n          </div>\n          <div class=\"card__meta\">${game.publisher ?? ''}</div>\n        </div>\n        <span class=\"btn btn--primary card__btn\">Play</span>\n      </div>\n    `;
    a.addEventListener('mousemove', (e) => {
      const r = a.getBoundingClientRect();
      a.style.setProperty('--mx', `${e.clientX - r.left}px`);
      a.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
    frag.appendChild(a);
  });
  list.appendChild(frag);
}
