// Finger-Auswahl: kein Spiel, sondern ein Werkzeug. Alle legen gleichzeitig einen Finger aufs Display,
// nach kurzer Ruhe wählt die App zufällig aus (wer anfängt, wer trinkt …) oder teilt in zwei Teams auf.
// Wird über den Finger-Knopf in der Kopfzeile der Startseite geöffnet (js/core/app.js) und füllt den ganzen Bildschirm.

import * as audio from '../core/audio.js';
import { $ } from '../core/dom.js';
import { burst, reducedMotion } from '../core/fx.js';
import { vibrate } from '../core/haptics.js';
import { shuffle } from '../core/random.js';
import { appStorage } from '../core/storage.js';

const MODES = [
  { value: '1', label: '1 wählen' },
  { value: '2', label: '2 wählen' },
  { value: 'teams', label: '2 Teams' },
];
const SETTLE_MS = 2400;   // so lange müssen alle Finger ruhig liegen, bis gewählt wird
const RESET_MS = 700;     // nach dem Loslassen aller Finger geht es von vorn los
const COLORS = ['#ff5a36', '#38a9f0', '#34c46b', '#e6b00e', '#a463f2', '#ff5c9d', '#22d3ee', '#f97316', '#84cc16', '#ec4899'];
const TEAM_COLORS = ['#ff5a36', '#38a9f0'];

export const FINGER_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9.5 13V5.5a1.5 1.5 0 0 1 3 0V11"/>
    <path d="M12.5 10.5a1.5 1.5 0 0 1 3 0V12"/>
    <path d="M15.5 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a5.5 5.5 0 0 1-4.6-2.5L5 15.8a1.5 1.5 0 0 1 2.4-1.8L9.5 16"/>
    <circle cx="11" cy="4" r="3.2" stroke-width="1.2" opacity=".5"/>
  </svg>`;

// Weiche, natürliche Klänge statt Piepen: Blubbern, Holzticken, ausklingende Glocke
const sounds = {
  // „Plopp“ wie eine Blase – jeder weitere Finger etwas höher
  pop: (count) => {
    const freq = 380 + count * 40;
    audio.tone({ freq, slideTo: freq * 1.9, duration: 0.08, type: 'sine', volume: 0.18 });
    audio.noise({ duration: 0.025, volume: 0.04, cutoff: 3000 });
  },
  click: () => audio.noise({ duration: 0.02, volume: 0.07, cutoff: 3200 }),
  // Holzticken wie bei einer Uhr
  tick: () => {
    audio.noise({ duration: 0.03, volume: 0.13, cutoff: 1300 });
    audio.tone({ freq: 1700, slideTo: 1400, duration: 0.025, type: 'sine', volume: 0.025 });
  },
  // Glocke: Grundton mit leiseren Obertönen, die langsam ausklingen
  chime: () => {
    bell(784, 0);
    bell(1175, 0.14);
  },
  teams: () => {
    bell(659, 0);
    bell(988, 0.18);
  },
};

function bell(freq, delay) {
  audio.tone({ freq, duration: 1.6, type: 'sine', volume: 0.14, delay });
  audio.tone({ freq: freq * 2, duration: 0.9, type: 'sine', volume: 0.05, delay });
  audio.tone({ freq: freq * 2.76, duration: 0.5, type: 'sine', volume: 0.025, delay });
}

let open = null; // laufendes Fenster – es gibt immer nur eins

/** Öffnet die Finger-Auswahl. Gibt eine Funktion zum Schließen zurück. */
export function openFinger() {
  if (open) return open.close;

  let mode = MODES.some((option) => option.value === appStorage.get('finger-mode')) ? appStorage.get('finger-mode') : '1';
  let phase = 'waiting';          // waiting → counting → done
  const fingers = new Map();      // pointerId → { x, y, el, color }
  const timers = new Set();
  let settleTimer = null;
  let tickId = 0;                 // neuer Countdown macht alte Ticks ungültig

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const cancel = (id) => {
    clearTimeout(id);
    timers.delete(id);
  };

  const overlay = document.createElement('div');
  overlay.className = 'finger-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Finger-Auswahl');
  overlay.innerHTML = `
    <div class="finger-field" aria-hidden="true"></div>
    <div class="finger-flood" aria-hidden="true"></div>
    <div class="finger-top">
      <div class="finger-modes" role="group" aria-label="Was soll passieren?">
        ${MODES.map((option) => `<button type="button" data-mode="${option.value}" aria-pressed="${option.value === mode}">${option.label}</button>`).join('')}
      </div>
      <button class="icon-btn finger-close" type="button" aria-label="Finger-Auswahl schließen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="finger-hint">
      <span class="finger-hint-hands" aria-hidden="true"><i>☝️</i><i>☝️</i><i>☝️</i></span>
      <p class="finger-hint-title">Alle einen Finger drauf!</p>
      <p class="finger-hint-text"></p>
    </div>
    <p class="finger-result" aria-live="polite"></p>`;
  document.body.append(overlay);
  document.documentElement.classList.add('finger-open');

  const field = $('.finger-field', overlay);
  const flood = $('.finger-flood', overlay);
  const hint = $('.finger-hint', overlay);
  const hintText = $('.finger-hint-text', overlay);
  const result = $('.finger-result', overlay);

  if (!reducedMotion()) {
    overlay.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
  updateHint();

  // ---------- Bedienung ----------

  $('.finger-close', overlay).addEventListener('click', close);
  $('.finger-modes', overlay).addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    mode = button.dataset.mode;
    appStorage.set('finger-mode', mode);
    for (const other of overlay.querySelectorAll('[data-mode]')) other.setAttribute('aria-pressed', String(other === button));
    sounds.click();
    if (phase !== 'done') restartSettle();
    updateHint();
  });

  field.addEventListener('pointerdown', onDown);
  field.addEventListener('pointermove', onMove);
  field.addEventListener('pointerup', onUp);
  field.addEventListener('pointercancel', onUp);
  // Lange drücken soll kein Menü und keine Textauswahl öffnen
  overlay.addEventListener('contextmenu', (event) => event.preventDefault());
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  open = { close };
  return close;

  // ---------- Finger ----------

  function needed() {
    return mode === 'teams' ? 2 : Number(mode) + 1;
  }

  function updateHint() {
    const count = fingers.size;
    hint.classList.toggle('is-hidden', phase === 'done' || count >= needed());
    hintText.textContent = count === 0
      ? (mode === 'teams' ? 'Die App teilt euch zufällig in zwei Teams auf.' : `Die App wählt ${mode === '1' ? 'eine Person' : 'zwei Personen'} zufällig aus.`)
      : `Noch ${needed() - count} Finger …`;
  }

  function nextColor() {
    const used = new Set([...fingers.values()].map((finger) => finger.color));
    return COLORS.find((color) => !used.has(color)) ?? COLORS[fingers.size % COLORS.length];
  }

  function place(finger) {
    finger.el.style.left = `${finger.x}px`;
    finger.el.style.top = `${finger.y}px`;
  }

  function onDown(event) {
    event.preventDefault();
    if (phase === 'done') return;
    try {
      field.setPointerCapture(event.pointerId); // Finger bleibt zugeordnet, auch wenn er über den Rand rutscht
    } catch {
      // manche Browser erlauben das nicht – dann eben ohne
    }
    const color = nextColor();
    const el = document.createElement('span');
    el.className = 'finger-dot';
    el.style.setProperty('--c', color);
    el.style.setProperty('--ms', `${SETTLE_MS}ms`);
    field.append(el);
    const finger = { x: event.clientX, y: event.clientY, el, color };
    fingers.set(event.pointerId, finger);
    place(finger);
    sounds.pop(fingers.size);
    vibrate(10);
    restartSettle();
    updateHint();
  }

  function onMove(event) {
    const finger = fingers.get(event.pointerId);
    if (!finger) return;
    finger.x = event.clientX;
    finger.y = event.clientY;
    place(finger);
  }

  function onUp(event) {
    const finger = fingers.get(event.pointerId);
    if (!finger) return;
    fingers.delete(event.pointerId);
    if (phase === 'done') {
      // Nach der Auswahl: Kreise der Gewinner bleiben, bis alle losgelassen haben
      if (!finger.el.classList.contains('is-picked')) finger.el.remove();
      if (!fingers.size) later(reset, RESET_MS);
      return;
    }
    finger.el.classList.add('is-gone');
    later(() => finger.el.remove(), 300);
    restartSettle();
    updateHint();
  }

  // Jede Änderung startet die Wartezeit neu; liegen genug Finger still, läuft der Countdown
  function restartSettle() {
    if (settleTimer) cancel(settleTimer);
    settleTimer = null;
    for (const finger of fingers.values()) {
      finger.el.classList.remove('is-counting');
      void finger.el.offsetWidth; // Animation neu starten
    }
    if (fingers.size < needed()) {
      phase = 'waiting';
      return;
    }
    phase = 'counting';
    for (const finger of fingers.values()) finger.el.classList.add('is-counting');
    tickTock();
    settleTimer = later(choose, SETTLE_MS);
  }

  // Ticken, das immer schneller wird
  function tickTock() {
    const run = ++tickId;
    let at = 0;
    let gap = 420;
    while (at + gap < SETTLE_MS) {
      at += gap;
      later(() => {
        if (run !== tickId || phase !== 'counting') return;
        sounds.tick();
      }, at);
      gap = Math.max(90, gap * 0.78);
    }
  }

  // ---------- Auswahl ----------

  function choose() {
    settleTimer = null;
    if (fingers.size < needed()) return;
    phase = 'done';
    tickId += 1;
    const order = shuffle([...fingers.values()]);

    if (mode === 'teams') {
      order.forEach((finger, index) => {
        const team = index % 2;
        finger.el.style.setProperty('--c', TEAM_COLORS[team]);
        finger.el.classList.remove('is-counting');
        finger.el.classList.add('is-picked', 'is-team');
        finger.el.style.setProperty('--i', String(index));
        finger.el.dataset.team = team ? 'B' : 'A';
      });
      result.textContent = 'Teams stehen!';
      sounds.teams();
      vibrate([0, 60, 40, 60]);
      return;
    }

    const winners = order.slice(0, Number(mode));
    for (const finger of fingers.values()) {
      finger.el.classList.remove('is-counting');
      finger.el.classList.add(winners.includes(finger) ? 'is-picked' : 'is-out');
    }
    const first = winners[0];
    flood.style.setProperty('--c', first.color);
    flood.style.setProperty('--x', `${first.x}px`);
    flood.style.setProperty('--y', `${first.y}px`);
    flood.classList.add('is-on');
    result.textContent = winners.length > 1 ? 'Ihr zwei!' : 'Du!';
    sounds.chime();
    vibrate([0, 80, 40, 160]);
    burst({ x: first.x, y: first.y, count: 60, colors: [first.color, '#ffffff', winners[1]?.color ?? '#ffd76a'] });
  }

  function reset() {
    if (fingers.size) return; // jemand hat schon wieder einen Finger draufgelegt
    phase = 'waiting';
    field.innerHTML = '';
    flood.classList.remove('is-on');
    result.textContent = '';
    updateHint();
  }

  // ---------- Schließen ----------

  function close() {
    if (!open) return;
    open = null;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('finger-open');
    if (reducedMotion()) {
      overlay.remove();
      return;
    }
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => overlay.remove(), () => overlay.remove());
  }
}
