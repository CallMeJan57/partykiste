// Wiederverwendbare UI-Bausteine als HTML-Vorlagen.

import { esc } from './dom.js';
import { MAX_NAME_LENGTH, getPlayers, setPlayers, validateName } from './players.js';

/**
 * Segment-Schalter, z. B. Kurz | Mittel | Lang.
 * In die HTML-Vorlage einsetzen und danach bindSegmented() aufrufen.
 * options: [{ value: 'kurz', label: 'Kurz' }, …]
 */
export function segmented({ name, label, options, value }) {
  const buttons = options
    .map((option) => `<button type="button" data-value="${esc(option.value)}" aria-pressed="${option.value === value}">${esc(option.label)}</button>`)
    .join('');
  return `<div class="seg" role="group" aria-label="${esc(label)}" data-seg="${esc(name)}" style="--seg-count: ${options.length}">${buttons}</div>`;
}

export function bindSegmented(root, name, onChange) {
  const group = root.querySelector(`[data-seg="${name}"]`);
  group.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    for (const other of group.querySelectorAll('button')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    onChange(button.dataset.value);
  });
}

/**
 * Mehrfachauswahl als Liste mit Häkchen, z. B. für Kategorien.
 * In die HTML-Vorlage einsetzen und danach bindToggleList() aufrufen.
 * options: [{ value: 'locker', label: 'Locker', hint: 'Harmlos' }, …], values: aktuell gewählte values
 */
export function toggleList({ name, label, options, values }) {
  const rows = options
    .map((option) => `
      <button class="toggle-row" type="button" data-value="${esc(option.value)}" aria-pressed="${values.includes(option.value)}">
        <span class="toggle-check" aria-hidden="true"></span>
        <span class="toggle-text">
          <span class="toggle-label">${esc(option.label)}</span>
          ${option.hint ? `<span class="toggle-hint">${esc(option.hint)}</span>` : ''}
        </span>
      </button>`)
    .join('');
  return `<div class="toggle-list" role="group" aria-label="${esc(label)}" data-toggles="${esc(name)}">${rows}</div>`;
}

/** onChange bekommt die Liste der gewählten values. Weniger als `min` lässt sich nicht abwählen. */
export function bindToggleList(root, name, onChange, { min = 1 } = {}) {
  const group = root.querySelector(`[data-toggles="${name}"]`);
  const selected = () => [...group.querySelectorAll('[aria-pressed="true"]')].map((row) => row.dataset.value);
  // Steht die Liste in einer Einstellungskarte mit count, zeigt deren Kopf „2 von 5“
  const counter = root.querySelector(`[data-count-for="${name}"]`);
  const total = group.querySelectorAll('button[data-value]').length;
  const updateCount = () => {
    if (counter) counter.textContent = `${selected().length} von ${total}`;
  };
  updateCount();

  group.addEventListener('click', (event) => {
    const row = event.target.closest('button[data-value]');
    if (!row) return;
    const isOn = row.getAttribute('aria-pressed') === 'true';
    if (isOn && selected().length <= min) {
      row.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 240 },
      );
      return;
    }
    row.setAttribute('aria-pressed', String(!isOn));
    updateCount();
    onChange(selected());
  });
}

/**
 * Mitspieler eintragen und entfernen. Die Liste wird app-weit gespeichert (js/core/players.js),
 * jedes Spiel sieht also dieselben Namen. In die HTML-Vorlage einsetzen, danach bindPlayerEditor() aufrufen.
 * Zugeklappt zeigt sie nur bunte Kreise und die Namen; ein Tippen klappt sie zum Bearbeiten auf.
 */
export function playerEditor({ name }) {
  return `
    <div class="players" data-players="${esc(name)}">
      <button class="players-summary" type="button" aria-expanded="false">
        <span class="players-avatars" aria-hidden="true"></span>
        <span class="players-summary-text">
          <b class="players-count"></b>
          <span class="players-names"></span>
        </span>
        <span class="players-toggle" aria-hidden="true"></span>
      </button>
      <div class="players-body">
        <div class="players-inner">
          <ul class="player-list"></ul>
          <form class="player-add" autocomplete="off">
            <input type="text" name="player" maxlength="${MAX_NAME_LENGTH}" placeholder="Name eingeben" enterkeyhint="done" aria-label="Name eines Mitspielers">
            <button type="submit" aria-label="Mitspieler hinzufügen">+</button>
          </form>
        </div>
      </div>
      <p class="player-hint" aria-live="polite"></p>
    </div>`;
}

const AVATAR_COLORS = ['#ff5a2e', '#22d3ee', '#facc15', '#ff6fae', '#a855f7', '#34d399', '#3d8bff'];
const MAX_AVATARS = 5;

/**
 * onChange bekommt die aktuelle Namensliste. min = wie viele Mitspieler das Spiel mindestens braucht.
 * Fehlen noch Namen (min > 0), ist die Liste von Anfang an aufgeklappt.
 */
export function bindPlayerEditor(root, name, { min = 2, onChange = () => {} } = {}) {
  const box = root.querySelector(`[data-players="${name}"]`);
  const summary = box.querySelector('.players-summary');
  const avatars = box.querySelector('.players-avatars');
  const count = box.querySelector('.players-count');
  const names = box.querySelector('.players-names');
  const list = box.querySelector('.player-list');
  const form = box.querySelector('.player-add');
  const input = form.querySelector('input');
  const hint = box.querySelector('.player-hint');
  let players = getPlayers();

  function setOpen(open) {
    summary.setAttribute('aria-expanded', String(open));
    box.classList.toggle('is-open', open);
  }

  function render(message = '') {
    list.innerHTML = players
      .map((player, index) => `
        <li class="player-chip">
          <span>${esc(player)}</span>
          <button class="player-remove" type="button" data-index="${index}" aria-label="${esc(player)} entfernen">×</button>
        </li>`)
      .join('');

    const shown = players.slice(0, MAX_AVATARS);
    const extra = players.length - shown.length;
    avatars.innerHTML = players.length
      ? shown.map((player, index) => `<span style="--c: ${AVATAR_COLORS[index % AVATAR_COLORS.length]}; --i: ${index}">${esc(initial(player))}</span>`).join('')
        + (extra > 0 ? `<span class="players-more">+${extra}</span>` : '')
      : '<span class="players-empty">👥</span>';
    count.textContent = players.length
      ? `${players.length} ${players.length === 1 ? 'Person' : 'Personen'}`
      : 'Noch niemand eingetragen';
    names.textContent = players.length ? players.join(', ') : 'Antippen, um Namen einzutragen';

    const missing = min - players.length;
    hint.textContent = message || (missing > 0 ? `Noch ${missing} ${missing === 1 ? 'Person' : 'Personen'} eintragen.` : '');
    hint.classList.toggle('is-error', Boolean(message));
  }

  function update(next, message) {
    players = next;
    setPlayers(players);
    render(message);
    onChange(players);
  }

  summary.addEventListener('click', () => {
    const open = !box.classList.contains('is-open');
    setOpen(open);
    if (open) input.focus({ preventScroll: true });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateName(input.value, players);
    if (result.error) {
      render(result.error);
      return;
    }
    input.value = '';
    update([...players, result.name]);
    input.focus();
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('.player-remove');
    if (!button) return;
    update(players.filter((_, index) => index !== Number(button.dataset.index)));
  });

  setOpen(players.length < min);
  render();
  return players;
}

function initial(name) {
  return [...name.trim()][0]?.toUpperCase() ?? '?';
}

/**
 * Einheitliche Einstellungsseite aller Spiele:
 *   hero   – Bild/Animation, Titel und ein kurzer Satz (HTML des Spiels, behält dessen Stil)
 *   cards  – [{ icon, title, body, note?, count?, optional? }]: je eine Karte mit Überschrift;
 *            count = name einer toggleList, deren Auswahl im Kopf gezählt wird („2 von 5“)
 *   start  – HTML des Start-Knopfs (bleibt unten immer sichtbar), startNote – kleiner Hinweis darunter
 */
export function setupScreen({ hero, cards, start, startNote = '' }) {
  return `
    <section class="screen setup">
      <header class="setup-hero">${hero}</header>
      ${cards.filter(Boolean).map((card, index) => `
        <section class="setup-card" style="--i: ${index}">
          <h2 class="setup-card-head">
            <span class="setup-card-icon" aria-hidden="true">${card.icon ?? ''}</span>
            <span class="setup-card-title">${card.title}</span>
            ${card.optional ? '<span class="setup-optional">optional</span>' : ''}
            ${card.count ? `<span class="setup-count" data-count-for="${esc(card.count)}"></span>` : ''}
          </h2>
          ${card.body}
          ${card.note ? `<p class="setup-note">${card.note}</p>` : ''}
        </section>`).join('')}
      <div class="setup-start">
        ${start}
        ${startNote ? `<p class="setup-start-note">${startNote}</p>` : ''}
      </div>
    </section>`;
}

/** Eine Einstellung innerhalb einer Karte: Beschriftung, Bedienelement, optional ein Hinweis darunter. */
export function setupRow({ label, control, hint = '' }) {
  return `
    <div class="setup-row">
      <p class="setup-row-label">${label}</p>
      ${control}
      ${hint}
    </div>`;
}

/**
 * Rangliste für Endbildschirme. rows: [{ name, value, note?, gain? }], schon sortiert (beste zuerst).
 *   note – kleine Zusatzzeile neben dem Namen, gain – z. B. 2 für „+2“ in dieser Runde
 * crown: Platz 1 bekommt eine Krone. Die Zeilen gleiten nacheinander herein.
 */
export function rankingList(rows, { crown = true } = {}) {
  return `
    <ol class="ranking${crown ? ' has-crown' : ''}">
      ${rows.map((row, index) => `
        <li style="--i: ${index}">
          <span class="ranking-name">${esc(row.name)}</span>
          ${row.note ? `<small class="ranking-note">${esc(row.note)}</small>` : ''}
          ${row.gain ? `<em class="ranking-gain">+${esc(row.gain)}</em>` : ''}
          <b class="ranking-value">${esc(row.value)}</b>
        </li>`).join('')}
    </ol>`;
}

/**
 * Text in einzelne Buchstaben zerlegt, die per CSS nacheinander erscheinen (Index in --i).
 * Wörter bleiben in einem eigenen Element zusammen, damit nicht mitten im Wort umgebrochen wird.
 * prefix bestimmt die Klassen: z. B. 'pm' → .pm-word und .pm-letter (die Animation legt jedes Spiel selbst fest).
 */
export function splitLetters(text, { prefix, start = 0 }) {
  let index = start;
  return String(text).split(' ').map((word) => {
    const chars = [...word].map((char) => `<span class="${prefix}-letter" style="--i: ${index++}">${esc(char)}</span>`).join('');
    index += 1;
    return `<span class="${prefix}-word">${chars}</span>`;
  }).join(' ');
}
