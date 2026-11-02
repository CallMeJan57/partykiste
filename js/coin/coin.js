// Münzwurf: kein Spiel, sondern ein Werkzeug für schnelle Entscheidungen. Wird über den Münz-Knopf in der
// Kopfzeile der Startseite geöffnet (js/core/app.js) und legt sich wie der Würfelbecher als Fenster über die Seite.
//
// Die Münze ist flach gezeichnet und dreht sich nur scheinbar: Die Höhe wird mit cos(Winkel) gestaucht,
// und je nach Vorzeichen ist Kopf oder Zahl zu sehen. Darunter liegt der Rand, der beim Kippen sichtbar wird.

import * as audio from '../core/audio.js';
import { $ } from '../core/dom.js';
import { burst, reducedMotion } from '../core/fx.js';
import { vibrate } from '../core/haptics.js';

const HISTORY_LENGTH = 12;
const STREAK_BANNER = 3;     // ab so vielen gleichen Würfen hintereinander gibt es einen Hinweis

// Ablauf eines Wurfs
const CROUCH_MS = 140;       // Münze wird kurz zusammengedrückt, bevor sie abhebt
const FLIGHT_MS = 1350;      // Flug bis zum ersten Aufprall
const SETTLE_MS = 650;       // Nachwackeln auf dem Tisch
const HEIGHT = 230;          // so hoch (px) fliegt sie
const HALF_TURNS = [9, 13];  // so viele halbe Drehungen in der Luft
const THICKNESS = 9;         // Randstärke (px), sichtbar beim Kippen

const FACES = {
  kopf: { label: 'Kopf', short: 'K' },
  zahl: { label: 'Zahl', short: 'Z' },
};

export const COIN_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <ellipse cx="12" cy="12" rx="8.5" ry="8.5" stroke="currentColor" stroke-width="2"/>
    <ellipse cx="12" cy="12" rx="5" ry="5" stroke="currentColor" stroke-width="1.4" stroke-dasharray="1.6 1.6"/>
    <path d="M10.6 9.6 12.4 8.4v7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// Lorbeerzweig links vom Mittelpunkt (die rechte Seite ist gespiegelt): spitze Blätter abwechselnd
// außen und innen an einem Kreisbogen, das letzte Blatt bildet die Spitze
const LAUREL_RADIUS = 38;
const LAUREL_FROM = 125;  // Grad, 90 = unten, 180 = links
const LAUREL_TO = 232;
const LEAF = 'M-6.5 0Q0-4 6.5 0Q0 4-6.5 0Z';

function laurelPoint(angle, radius = LAUREL_RADIUS) {
  const rad = (angle * Math.PI) / 180;
  return [(radius * Math.cos(rad)).toFixed(1), (radius * Math.sin(rad)).toFixed(1)];
}

const LAUREL_LEAVES = Array.from({ length: 8 }, (_, index) => {
  const angle = LAUREL_FROM + 8 + index * 12.5;
  const outside = index % 2 === 0;
  const [x, y] = laurelPoint(angle, LAUREL_RADIUS + (outside ? 4 : -4));
  // Blattspitze zeigt den Zweig entlang nach oben und leicht vom Stiel weg
  const tilt = angle + 90 + (outside ? -32 : 32);
  return `<path d="${LEAF}" transform="translate(${x} ${y}) rotate(${tilt.toFixed(1)})"/>`;
}).join('');
const [stemX1, stemY1] = laurelPoint(LAUREL_FROM);
const [stemX2, stemY2] = laurelPoint(LAUREL_TO);
const [tipX, tipY] = laurelPoint(LAUREL_TO + 4);
const LAUREL = `
  <path class="coin-laurel" d="M${stemX1} ${stemY1}A${LAUREL_RADIUS} ${LAUREL_RADIUS} 0 0 1 ${stemX2} ${stemY2}"/>
  <g class="coin-emboss">
    ${LAUREL_LEAVES}
    <path d="${LEAF}" transform="translate(${tipX} ${tipY}) rotate(${LAUREL_TO + 4 + 90})"/>
  </g>`;

// Motive, jeweils um den Nullpunkt gezeichnet und dann genau in die Münzmitte gesetzt
const EMBLEMS = {
  kopf: `
    <g transform="translate(80 82)">
      <path class="coin-emboss" d="M-24 16H24L29-14 13 0 0-22-13 0-29-14Z"/>
      <circle class="coin-emboss" cx="-29" cy="-19" r="4.5"/>
      <circle class="coin-emboss" cx="0" cy="-27" r="4.5"/>
      <circle class="coin-emboss" cx="29" cy="-19" r="4.5"/>
      <rect class="coin-emboss" x="-26" y="19" width="52" height="8" rx="3"/>
      <circle class="coin-gem" cx="-13" cy="23" r="2"/><circle class="coin-gem" cx="0" cy="23" r="2"/><circle class="coin-gem" cx="13" cy="23" r="2"/>
    </g>`,
  zahl: `
    <g transform="translate(80 81)">
      ${LAUREL}
      <g transform="scale(-1 1)">${LAUREL}</g>
      <path class="coin-emboss" d="M-3-28H7V20H15V28H-13V20H-3V-14L-12-8-15-14Z"/>
    </g>`,
};

// Beide Seiten der Münze: Perlrand, Schriftband zwischen zwei Linien, in der Mitte Krone oder große Eins
function face(kind) {
  const id = `coin-${kind}`;
  const word = FACES[kind].label.toUpperCase();
  const ring = `★ ${word} ★ PARTYKISTE ★ ${word} ★ PARTYKISTE `;
  return `
    <svg class="coin-face coin-face-${kind}" viewBox="0 0 160 160" aria-hidden="true">
      <defs>
        <radialGradient id="${id}-gold" cx=".35" cy=".3" r=".8">
          <stop offset="0" stop-color="#fff2b8"/>
          <stop offset=".45" stop-color="#f2c14e"/>
          <stop offset="1" stop-color="#b07b16"/>
        </radialGradient>
        <path id="${id}-arc" d="M24 80a56 56 0 1 1 112 0a56 56 0 1 1-112 0"/>
      </defs>
      <circle cx="80" cy="80" r="78" fill="#9a6a10"/>
      <circle cx="80" cy="80" r="75" fill="url(#${id}-gold)"/>
      <circle class="coin-beads" cx="80" cy="80" r="72"/>
      <circle class="coin-line" cx="80" cy="80" r="68"/>
      <circle class="coin-line" cx="80" cy="80" r="49"/>
      <text class="coin-ring"><textPath href="#${id}-arc" textLength="346" lengthAdjust="spacing">${ring}</textPath></text>
      ${EMBLEMS[kind]}
      <path class="coin-gloss" d="M8.6 54A76 76 0 0 1 54 8.6"/>
    </svg>`;
}

// Liegt außerhalb des Fensters: Würfe und Zählerstand bleiben beim Schließen erhalten, bis die App neu geladen wird
const history = [];
const counts = { kopf: 0, zahl: 0 };

let open = null; // laufendes Fenster – es gibt immer nur eins

/** Öffnet den Münzwurf. Gibt eine Funktion zum Schließen zurück. */
export function openCoin() {
  if (open) return open.close;

  let angle = 0;           // aktueller Drehwinkel in Grad (0 = Kopf oben)
  let flipping = false;
  let frame = 0;
  const timers = new Set();
  const cleanups = [];

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const overlay = document.createElement('div');
  overlay.className = 'coin-overlay';
  overlay.innerHTML = `
    <div class="coin-sheet" role="dialog" aria-modal="true" aria-label="Münzwurf">
      <span class="coin-grabber" aria-hidden="true"></span>
      <div class="coin-head">
        <div>
          <p class="coin-kicker">Für schnelle Entscheidungen</p>
          <p class="coin-title">Münzwurf</p>
        </div>
        <button class="icon-btn coin-close" type="button" aria-label="Münzwurf schließen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="coin-stage" aria-label="Münze – antippen zum Werfen">
        <span class="coin-spot" aria-hidden="true"></span>
        <span class="coin-shadow" aria-hidden="true"></span>
        <span class="coin-dust" aria-hidden="true"></span>
        <div class="coin" aria-hidden="true">
          <span class="coin-edge"></span>
          <span class="coin-body">${face('kopf')}${face('zahl')}</span>
        </div>
        <p class="coin-banner" aria-hidden="true"></p>
      </div>
      <p class="coin-result" aria-live="polite"><span class="coin-result-value">–</span></p>
      <div class="coin-stats">
        <div class="coin-bar" aria-hidden="true"><i class="is-kopf"></i><i class="is-zahl"></i></div>
        <p class="coin-counts"><span>Kopf <b data-count="kopf">0</b></span><span><b data-count="zahl">0</b> Zahl</span></p>
      </div>
      <div class="coin-history" aria-label="Letzte Würfe"></div>
      <button class="btn btn-primary coin-flip" type="button">Werfen</button>
      <p class="coin-hint">Münze antippen = werfen · <button class="coin-reset" type="button">Zähler zurücksetzen</button></p>
    </div>`;
  document.body.append(overlay);
  document.documentElement.classList.add('coin-open');

  const sheet = $('.coin-sheet', overlay);
  const stage = $('.coin-stage', overlay);
  const coin = $('.coin', overlay);
  const body = $('.coin-body', overlay);
  const edge = $('.coin-edge', overlay);
  const shadow = $('.coin-shadow', overlay);
  const dust = $('.coin-dust', overlay);
  const banner = $('.coin-banner', overlay);
  const resultValue = $('.coin-result-value', overlay);
  const flipButton = $('.coin-flip', overlay);

  // Die zuletzt geworfene Seite liegt oben
  if (history[0]?.face === 'zahl') angle = 180;
  draw(0, angle);
  renderStats();
  renderHistory(false);
  if (history.length) resultValue.textContent = FACES[history[0].face].label;

  if (!reducedMotion()) {
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 });
    sheet.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(-2%)', offset: 0.75 }, { transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    // Münze rollt herein und kippt auf ihre Seite
    coin.animate(
      [
        { transform: 'translateX(-160%) rotate(-540deg)', opacity: 0 },
        { transform: 'translateX(8%) rotate(14deg)', opacity: 1, offset: 0.7 },
        { transform: 'none' },
      ],
      { duration: 760, delay: 180, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'backwards' },
    );
  }
  audio.tone({ freq: 1568, duration: 0.18, type: 'sine', volume: 0.08, delay: 0.5 });

  // ---------- Bedienung ----------

  $('.coin-close', overlay).addEventListener('click', close);
  flipButton.addEventListener('click', flip);
  stage.addEventListener('click', flip);
  $('.coin-reset', overlay).addEventListener('click', reset);
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));

  open = { close };
  return close;

  // ---------- Darstellung ----------

  // Höhe über dem Tisch (px) und Drehwinkel (Grad) → gestauchte Seite, sichtbarer Rand, Schatten
  function draw(height, degrees) {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const squash = Math.max(0.02, Math.abs(cos));
    const showsKopf = cos >= 0;
    const lift = 1 + height / HEIGHT * 0.22; // in der Luft wirkt sie näher und größer
    body.classList.toggle('shows-zahl', !showsKopf);
    body.style.transform = `translateY(${-height}px) scale(${lift}, ${lift * squash})`;
    edge.style.transform = `translateY(${-height + THICKNESS * Math.abs(Math.sin(radians)) * lift}px) scale(${lift}, ${lift * squash})`;
    edge.style.opacity = String(Math.min(1, Math.abs(Math.sin(radians)) * 3));
    const away = Math.min(1, height / HEIGHT);
    shadow.style.transform = `scale(${1 - away * 0.55})`;
    shadow.style.opacity = String(0.6 - away * 0.4);
  }

  function renderStats() {
    const total = counts.kopf + counts.zahl;
    for (const kind of Object.keys(FACES)) {
      $(`[data-count="${kind}"]`, overlay).textContent = String(counts[kind]);
    }
    const share = total ? counts.kopf / total : 0.5;
    $('.coin-bar', overlay).style.setProperty('--kopf', String(share));
    $('.coin-stats', overlay).classList.toggle('is-empty', !total);
  }

  function renderHistory(fresh = true) {
    $('.coin-history', overlay).innerHTML = history.length
      ? `<span class="coin-history-label">Letzte Würfe</span>${history.map((entry, index) => `<span class="coin-chip is-${entry.face}${fresh && index === 0 ? ' is-new' : ''}" title="${FACES[entry.face].label}">${FACES[entry.face].short}</span>`).join('')}`
      : '';
  }

  function streak() {
    let length = 0;
    while (length < history.length && history[length].face === history[0].face) length += 1;
    return length;
  }

  // ---------- Werfen ----------

  function flip() {
    if (flipping) return;
    flipping = true;
    flipButton.disabled = true;
    banner.classList.remove('is-on');
    resultValue.classList.remove('is-shown');
    resultValue.textContent = '…';

    const result = Math.random() < 0.5 ? 'kopf' : 'zahl';
    const halfTurns = HALF_TURNS[0] + Math.floor(Math.random() * (HALF_TURNS[1] - HALF_TURNS[0]));
    // Endwinkel so wählen, dass die richtige Seite oben liegt
    const start = angle;
    let end = start + halfTurns * 180;
    const endsOnZahl = Math.round(end / 180) % 2 !== 0;
    if (endsOnZahl !== (result === 'zahl')) end += 180;
    const wobble = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 14);

    audio.tone({ freq: 2093, slideTo: 2637, duration: 0.09, type: 'triangle', volume: 0.12 });
    audio.tone({ freq: 3136, duration: 0.25, type: 'sine', volume: 0.05, delay: 0.02 });
    vibrate(15);

    if (reducedMotion()) {
      angle = end % 360;
      draw(0, angle);
      land(result);
      return;
    }

    coin.classList.add('is-flying');
    const began = performance.now() + CROUCH_MS;
    body.animate([{ translate: '0 0' }, { translate: '0 6px' }, { translate: '0 0' }], { duration: CROUCH_MS, easing: 'ease-in-out' });
    scheduleWhirr();

    let landed = false;
    const step = (now) => {
      const t = now - began;
      if (t < 0) {
        frame = requestAnimationFrame(step);
        return;
      }
      if (t < FLIGHT_MS) {
        // Flugbahn als Parabel, Drehung wird zum Ende hin langsamer
        const p = t / FLIGHT_MS;
        const height = HEIGHT * 4 * p * (1 - p);
        const spin = 1 - (1 - p) ** 1.6;
        angle = start + (end + wobble - start) * spin;
        draw(height, angle);
      } else {
        if (!landed) {
          landed = true;
          impact(1);
        }
        // Auf dem Tisch: kleine Hüpfer und abklingendes Kippeln
        const s = (t - FLIGHT_MS) / SETTLE_MS;
        const bounce = s < 0.35 ? 26 * Math.sin((s / 0.35) * Math.PI) : s < 0.6 ? 7 * Math.sin(((s - 0.35) / 0.25) * Math.PI) : 0;
        angle = end + wobble * Math.exp(-5 * s) * Math.cos(s * 18);
        draw(bounce, angle);
        if (s >= 0.35 && !step.secondHit) {
          step.secondHit = true;
          impact(0.45);
        }
        if (s >= 1) {
          angle = end % 360;
          draw(0, angle);
          coin.classList.remove('is-flying');
          land(result);
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  // Leises Surren der Drehung: Klicks, die zum Ende hin langsamer werden
  function scheduleWhirr() {
    let at = CROUCH_MS + 60;
    let gap = 45;
    while (at < CROUCH_MS + FLIGHT_MS * 0.92) {
      audio.tone({ freq: 2400 + Math.random() * 600, duration: 0.012, type: 'sine', volume: 0.025, delay: at / 1000 });
      at += gap;
      gap *= 1.07;
    }
  }

  function impact(strength) {
    audio.tone({ freq: 2637, duration: 0.12 * strength + 0.05, type: 'triangle', volume: 0.1 * strength });
    audio.tone({ freq: 3951, duration: 0.18 * strength, type: 'sine', volume: 0.05 * strength, delay: 0.01 });
    audio.noise({ duration: 0.05, volume: 0.25 * strength, cutoff: 5000 });
    vibrate(Math.round(20 * strength));
    dust.animate(
      [{ transform: 'scale(.3)', opacity: 0.7 * strength }, { transform: 'scale(1.7)', opacity: 0 }],
      { duration: 520, easing: 'cubic-bezier(.2, .7, .3, 1)' },
    );
  }

  function land(result) {
    flipping = false;
    flipButton.disabled = false;
    counts[result] += 1;
    history.unshift({ face: result });
    history.length = Math.min(history.length, HISTORY_LENGTH);

    resultValue.textContent = FACES[result].label;
    resultValue.classList.remove('is-shown');
    void resultValue.offsetWidth; // Animation neu starten
    resultValue.classList.add('is-shown');
    renderStats();
    renderHistory();
    coin.classList.remove('is-glow');
    void coin.offsetWidth;
    coin.classList.add('is-glow');

    const run = streak();
    if (run >= STREAK_BANNER) {
      banner.textContent = `${run}× ${FACES[result].label} in Folge!`;
      banner.classList.add('is-on');
      [1047, 1319, 1568, 2093].forEach((freq, index) => audio.tone({ freq, duration: 0.16, type: 'triangle', volume: 0.1, delay: 0.1 + index * 0.07 }));
      const box = stage.getBoundingClientRect();
      burst({ x: box.left + box.width / 2, y: box.top + box.height * 0.6, count: 50, colors: ['#ffd76a', '#fff2b8', '#f2c14e', '#ffffff'] });
      vibrate([0, 40, 30, 80]);
    } else {
      [1568, 2093].forEach((freq, index) => audio.tone({ freq, duration: 0.14, type: 'triangle', volume: 0.09, delay: 0.05 + index * 0.08 }));
    }
  }

  function reset() {
    if (flipping) return;
    history.length = 0;
    counts.kopf = 0;
    counts.zahl = 0;
    renderStats();
    renderHistory();
    resultValue.textContent = '–';
    banner.classList.remove('is-on');
    audio.tone({ freq: 660, slideTo: 330, duration: 0.15, type: 'triangle', volume: 0.1 });
  }

  // ---------- Schließen ----------

  function close() {
    if (!open) return;
    open = null;
    cancelAnimationFrame(frame);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const fn of cleanups) fn();
    document.documentElement.classList.remove('coin-open');
    if (reducedMotion()) {
      overlay.remove();
      return;
    }
    sheet.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 260, easing: 'cubic-bezier(.5, 0, .8, .4)', fill: 'forwards' });
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => overlay.remove(), () => overlay.remove());
  }
}
