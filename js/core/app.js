// App-Hülle: Kopfzeile, Navigation per URL-Hash (#/ = Auswahl, #/<spiel-id> = Spiel)
// und das Starten/Beenden der Spiele.

import { DICE_ICON, openDice } from '../dice/dice.js';
import { renderHub } from '../hub/hub.js';
import * as audio from './audio.js';
import { createContext } from './context.js';
import { $, esc } from './dom.js';
import { keepAwake } from './wakelock.js';

const ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const ICON_SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4Z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

export function startApp({ name, games, sections = [], topbar, view }) {
  const playable = validate(games);
  const gamesById = new Map(playable.map((game) => [game.id, game]));
  const tools = playable.filter((game) => game.tool);   // Knöpfe in der Kopfzeile statt Karten
  const listed = playable.filter((game) => !game.tool);
  const loadedStyles = new Set();

  let active = null;        // { dispose, game } des laufenden Spiels
  let renderToken = 0;      // verhindert Überschneidungen bei schnellem Hin- und Herwechseln
  let openedFromHub = false;

  let leaving = false;      // Verlassen wurde bestätigt – nicht noch einmal nachfragen

  // Ton freischalten, sobald irgendwo getippt wird
  document.addEventListener('pointerdown', audio.unlock, { passive: true });
  window.addEventListener('hashchange', onHashChange);
  // Neu laden oder Tab schließen mitten im Spiel: der Browser fragt nach (wo er es unterstützt)
  window.addEventListener('beforeunload', (event) => {
    if (!inProgress()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  show(currentRoute());

  // Zurück-Geste mitten im Spiel: Spiel wieder in den Verlauf legen und erst nachfragen
  async function onHashChange() {
    const route = currentRoute();
    if (!leaving && active && route !== active.game.id && inProgress()) {
      history.pushState(null, '', `#/${active.game.id}`);
      if (await confirmLeave()) exitGame();
      return;
    }
    leaving = false;
    show(route);
  }

  // Läuft gerade ein Spiel? Einstellungen und Endbildschirme (data-leave-free) zählen nicht.
  function inProgress() {
    const root = view.querySelector('.game');
    return Boolean(active && root?.firstElementChild && !root.querySelector('.setup, [data-leave-free]'));
  }

  async function requestExit() {
    if (!inProgress() || await confirmLeave()) exitGame();
  }

  function currentRoute() {
    return decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[0]);
  }

  async function show(route) {
    const token = ++renderToken;
    teardown();

    const game = gamesById.get(route);
    if (!game) {
      openedFromHub = false;
      if (route) history.replaceState(null, '', '#/');
      renderTopbar(null);
      document.title = name;
      renderHub(view, {
        games: listed,
        sections,
        tools,
        onOpen: () => { openedFromHub = true; },
      });
      window.scrollTo(0, 0);
      return;
    }

    renderTopbar(game);
    document.title = `${game.title} · ${name}`;
    view.innerHTML = '';
    window.scrollTo(0, 0);

    try {
      await loadStyles(game);
      if (token !== renderToken) return;

      const root = document.createElement('div');
      root.className = `game game-${game.id}`;
      view.append(root);

      const { ctx, dispose } = createContext({ game, root, exit: exitGame });
      active = { dispose, game };
      keepAwake(true);

      const cleanup = game.mount(ctx);
      if (typeof cleanup === 'function') ctx.onCleanup(cleanup);
    } catch (error) {
      console.error(error);
      view.innerHTML = `
        <div class="load-error">
          <p class="eyebrow">Fehler</p>
          <p>„${esc(game.title)}“ konnte nicht gestartet werden.</p>
          <code>${esc(error.message)}</code>
        </div>`;
    }
  }

  function teardown() {
    if (active) {
      active.dispose();
      active = null;
    }
    keepAwake(false);
  }

  // Zurück zur Auswahl. Kam man von dort, wird der Browser-Verlauf genutzt,
  // damit die Zurück-Geste am Handy nicht wieder ins Spiel springt.
  function exitGame() {
    leaving = true;
    if (openedFromHub) {
      openedFromHub = false;
      history.back();
    } else {
      location.replace('#/');
    }
  }

  function renderTopbar(game) {
    const mute = `<button class="icon-btn" type="button" data-action="mute"></button>`;
    topbar.innerHTML = game
      ? `<button class="back-btn" type="button" data-action="back" aria-label="Zurück zur Spieleauswahl">${ICON_BACK}<span>Spiele</span></button>
         <span class="topbar-title">${esc(game.title)}</span>
         ${mute}`
      : `<span class="wordmark">${esc(name)}</span><span></span>
         <div class="topbar-actions">
           ${tools.map((tool) => `<a class="icon-btn tool-btn" href="#/${esc(tool.id)}" aria-label="${esc(tool.title)} öffnen">${tool.icon ?? ''}</a>`).join('')}
           <button class="icon-btn dice-btn" type="button" data-action="dice" aria-label="Würfel öffnen">${DICE_ICON}</button>
           ${mute}
         </div>`;

    for (const link of topbar.querySelectorAll('.tool-btn')) {
      link.addEventListener('click', () => { openedFromHub = true; });
    }

    $('[data-action="back"]', topbar)?.addEventListener('click', requestExit);
    $('[data-action="dice"]', topbar)?.addEventListener('click', openDice);
    const muteButton = $('[data-action="mute"]', topbar);
    muteButton.addEventListener('click', () => {
      audio.setMuted(!audio.isMuted());
      updateMuteButton(muteButton);
    });
    updateMuteButton(muteButton);
  }

  function updateMuteButton(button) {
    const muted = audio.isMuted();
    button.innerHTML = muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
    button.setAttribute('aria-label', muted ? 'Ton einschalten' : 'Ton ausschalten');
  }

  function loadStyles(game) {
    if (!game.styles || loadedStyles.has(game.styles)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = game.styles;
      link.onload = () => {
        loadedStyles.add(game.styles);
        resolve();
      };
      link.onerror = () => {
        link.remove();
        reject(new Error(`Stylesheet nicht gefunden: ${game.styles}`));
      };
      document.head.append(link);
    });
  }
}

// Nachfrage, bevor ein laufendes Spiel verlassen wird. Antwort: true = verlassen.
let openDialog = null;
function confirmLeave() {
  if (openDialog) return openDialog;
  openDialog = new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'leave-overlay';
    overlay.innerHTML = `
      <div class="leave-card" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-text">
        <span class="leave-icon" aria-hidden="true">🚪</span>
        <p class="leave-title" id="leave-title">Spiel verlassen?</p>
        <p class="leave-text" id="leave-text">Punkte und Runde gehen dabei verloren.</p>
        <button class="btn btn-primary" type="button" data-choice="stay">Weiterspielen</button>
        <button class="btn btn-ghost leave-go" type="button" data-choice="leave">Verlassen</button>
      </div>`;
    document.body.append(overlay);
    const stay = overlay.querySelector('[data-choice="stay"]');
    stay.focus();

    const close = (leave) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 180);
      openDialog = null;
      resolve(leave);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-choice]')?.dataset.choice;
      if (choice) close(choice === 'leave');
      else if (event.target === overlay) close(false); // Tippen daneben = weiterspielen
    });
  });
  return openDialog;
}

// Fehlerhafte Einträge in js/games/index.js überspringen, statt die ganze App lahmzulegen.
function validate(games) {
  const seen = new Set();
  return games.filter((game) => {
    let problem = null;
    if (!game) problem = 'leerer Eintrag';
    else if (!game.id) problem = 'id fehlt';
    else if (!/^[a-z0-9-]+$/.test(game.id)) problem = `id "${game.id}" darf nur a–z, 0–9 und - enthalten`;
    else if (!game.title) problem = 'title fehlt';
    else if (typeof game.mount !== 'function') problem = 'mount() fehlt';
    else if (seen.has(game.id)) problem = `id "${game.id}" ist doppelt vergeben`;

    if (problem) {
      console.error(`[Partykiste] Spiel übersprungen: ${problem}`, game);
      return false;
    }
    seen.add(game.id);
    return true;
  });
}
