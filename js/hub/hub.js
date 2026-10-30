// Spieleauswahl: eine Karte pro Spiel aus js/games/index.js (Werkzeuge wie das Regelrad sitzen in der Kopfzeile).

import { esc } from '../core/dom.js';
import { bindPlayerEditor, playerEditor, splitLetters } from '../core/ui.js';
import { loadActiveRules, saveActiveRules, untilLabel } from '../games/regelrad/active-rules.js';

const RULE_GAME_ID = 'regelrad';

// Konfetti hinter der Überschrift: Farben der Spiele, Anzahl der Schnipsel
const CONFETTI_COLORS = ['#ff5a2e', '#facc15', '#22d3ee', '#ff6fae', '#a855f7', '#34d399'];
const CONFETTI_COUNT = 14;

export function renderHub(view, { games, sections = [], tools = [], onOpen }) {
  const count = games.length === 1 ? '1 Spiel' : `${games.length} Spiele`;
  let index = 0; // fortlaufend über alle Abschnitte, für das gestaffelte Einblenden

  view.innerHTML = `
    <section class="hub">
      <header class="hub-head">
        <span class="hub-confetti" aria-hidden="true">${confetti()}</span>
        <p class="eyebrow hub-eyebrow"><span class="hub-live" aria-hidden="true"></span>${count} · ein Handy für alle</p>
        <h1 class="hub-title" aria-label="Was spielen wir heute?">
          <span class="hub-line">${letters('Was spielen')}</span>
          <span class="hub-line">${letters('wir', 12)} <em class="hub-today">${letters('heute', 16)}<span class="hub-q" style="--i: 21">?</span></em><span class="hub-party" aria-hidden="true">🎉</span></span>
        </h1>
      </header>
      <section class="hub-players">${playerEditor({ name: 'hub-players' })}</section>
      <div class="hub-rules" aria-live="polite"></div>
      ${groupGames(games, sections).map((group) => `
        <section class="hub-section">
          <h2 class="hub-section-title"><span aria-hidden="true">${group.emoji}</span>${esc(group.title)}</h2>
          <ul class="hub-grid">
            ${group.games.map((game) => gameTile(game, index++)).join('')}
          </ul>
        </section>`).join('')}
    </section>`;

  for (const link of view.querySelectorAll('.game-tile')) {
    link.addEventListener('click', onOpen);
  }
  renderRules(view.querySelector('.hub-rules'), [...tools, ...games].find((game) => game.id === RULE_GAME_ID), onOpen);
  // Mitspieler direkt auf der Startseite – dieselbe Liste wie in allen Spielen
  bindPlayerEditor(view, 'hub-players', { min: 0 });
}

// Buchstaben, die per CSS nacheinander erscheinen (Klassen .hub-word / .hub-letter)
const letters = (text, start = 0) => splitLetters(text, { prefix: 'hub', start });

function confetti() {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => {
    const style = [
      `left: ${(index / CONFETTI_COUNT) * 100 + Math.random() * 6}%`,
      `background: ${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}`,
      `animation-duration: ${5 + Math.random() * 5}s`,
      `animation-delay: ${-Math.random() * 10}s`,
      `--spin: ${Math.random() < 0.5 ? -1 : 1}`,
    ].join('; ');
    return `<i style="${style}"></i>`;
  }).join('');
}

// Spiele den Abschnitten zuordnen; was keinem Abschnitt angehört, kommt ans Ende
function groupGames(games, sections) {
  const byId = new Map(games.map((game) => [game.id, game]));
  const groups = sections
    .map((section) => ({ ...section, games: section.ids.map((id) => byId.get(id)).filter(Boolean) }))
    .filter((group) => group.games.length);
  const placed = new Set(groups.flatMap((group) => group.games));
  const rest = games.filter((game) => !placed.has(game));
  if (rest.length) groups.push({ emoji: '🎲', title: groups.length ? 'Weitere Spiele' : 'Spiele', games: rest });
  return groups;
}

// Aktive Regeln aus dem Regelrad – sie gelten auch, während ein anderes Spiel läuft.
function renderRules(box, ruleGame, onOpen) {
  const rules = loadActiveRules();
  if (!rules.length || !ruleGame) {
    box.innerHTML = '';
    return;
  }

  box.style.setProperty('--card-accent', ruleGame.accent ?? 'var(--accent)');
  box.innerHTML = `
    <div class="hub-rules-head">
      <p class="eyebrow">🎡 Aktive Regeln · ${rules.length}</p>
      <a class="hub-rules-link" href="#/${ruleGame.id}">Zum Regelrad</a>
    </div>
    <ul class="hub-rules-list">
      ${rules.map((rule) => `
        <li class="hub-rule">
          <span class="hub-rule-emoji" aria-hidden="true">${esc(rule.emoji)}</span>
          <span class="hub-rule-body">
            <b>${esc(rule.title)}</b>
            <span>${esc(rule.text)}</span>
            <small>${esc(untilLabel(rule))}</small>
          </span>
          <button class="hub-rule-done" type="button" data-done="${esc(rule.id)}" aria-label="Regel ${esc(rule.title)} beenden">Vorbei</button>
        </li>`).join('')}
    </ul>`;

  box.querySelector('.hub-rules-link').addEventListener('click', onOpen);
  for (const button of box.querySelectorAll('[data-done]')) {
    button.addEventListener('click', () => {
      saveActiveRules(loadActiveRules().filter((rule) => String(rule.id) !== button.dataset.done));
      renderRules(box, ruleGame, onOpen);
    });
  }
}

// Kachel: Symbol, Name und der erste Hinweis (meist die Spielerzahl); die Kurzbeschreibung steht im Tooltip
function gameTile(game, index) {
  const meta = game.tags?.[0] ?? '';
  return `
    <li>
      <a class="game-tile" href="#/${game.id}" title="${esc(game.tagline ?? '')}" style="--card-accent: ${esc(game.accent ?? 'var(--accent)')}; --i: ${index}">
        <span class="game-tile-icon" aria-hidden="true">${game.icon ?? ''}</span>
        <span class="game-tile-text">
          <span class="game-tile-title">${esc(game.title)}</span>
          ${meta ? `<span class="game-tile-meta">${esc(meta)}</span>` : ''}
        </span>
      </a>
    </li>`;
}
