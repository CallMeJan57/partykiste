// Würfelbecher: kein Spiel, sondern ein Werkzeug für Brettspiele. Wird über den Würfel-Knopf in der
// Kopfzeile der Startseite geöffnet (js/core/app.js) und legt sich als Fenster über die Seite.
//
// Die Würfel sind bewusst flach gezeichnet (Elfenbein mit Glanz, sichtbarer Unterkante und eingelassenen
// Augen) – das sieht auf jedem Handy sauber aus und läuft flüssig. Beim Wurf wird ein Becher geschüttelt
// und ausgekippt; die Würfel fliegen heraus, drehen sich, die Augen flackern durch, bis sie landen.

import * as audio from '../core/audio.js';
import { $ } from '../core/dom.js';
import { burst, reducedMotion } from '../core/fx.js';
import { vibrate } from '../core/haptics.js';
import { appStorage } from '../core/storage.js';

const MIN_DICE = 1;
const MAX_DICE = 5;
const DEFAULT_DICE = 2;
const HISTORY_LENGTH = 8;

// Augenpositionen im 3×3-Raster (1–9, zeilenweise)
const PIPS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Ablauf eines Wurfs (ms): Becher kommt, wird geschüttelt, kippt – dann fliegen die Würfel
const CUP_IN_MS = 220;
const CUP_SHAKE_MS = 560;
const CUP_POUR_MS = 420;
const ROLL_MS = [1050, 1400];
const LAND_AT = 0.55;          // Anteil der Flugzeit, bei dem der Würfel zum ersten Mal aufschlägt
const JITTER = 8;              // so weit (px) liegen die Würfel am Ende versetzt
const TILT = 16;               // so schräg (Grad) dürfen sie liegen bleiben
const SHAKE_THRESHOLD = 22;    // Beschleunigung (m/s²), ab der Schütteln würfelt
const SHAKE_PAUSE_MS = 1500;

export const DICE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" stroke-width="2"/>
    <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/>
    <circle cx="15.5" cy="8.5" r="1.6" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
    <circle cx="8.5" cy="15.5" r="1.6" fill="currentColor"/>
    <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/>
  </svg>`;

// Lederbecher mit Goldrand
const CUP = `
  <svg class="dice-cup" viewBox="0 0 100 120" aria-hidden="true">
    <defs>
      <linearGradient id="dice-cup-leather" x1="0" x2="1">
        <stop offset="0" stop-color="#3b1c0e"/>
        <stop offset=".35" stop-color="#8a4a26"/>
        <stop offset=".55" stop-color="#6e3519"/>
        <stop offset="1" stop-color="#2c1308"/>
      </linearGradient>
      <linearGradient id="dice-cup-gold" x1="0" x2="1">
        <stop offset="0" stop-color="#8a6212"/>
        <stop offset=".45" stop-color="#ffe08a"/>
        <stop offset="1" stop-color="#8a6212"/>
      </linearGradient>
    </defs>
    <path d="M18 8h64l-9 104a6 6 0 0 1-6 5H33a6 6 0 0 1-6-5Z" fill="url(#dice-cup-leather)"/>
    <path d="M24 30h52M27 92h46" stroke="#f3d27a" stroke-width="1.6" stroke-dasharray="4 4" opacity=".7"/>
    <rect x="13" y="2" width="74" height="12" rx="5" fill="url(#dice-cup-gold)"/>
    <rect x="26" y="108" width="48" height="9" rx="4" fill="url(#dice-cup-gold)"/>
    <path d="M30 18l-3 70" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".12"/>
  </svg>`;

const random = (min, max) => min + Math.random() * (max - min);
const roll = () => 1 + Math.floor(Math.random() * 6);

function pips(value) {
  return Array.from({ length: 9 }, (_, index) => (PIPS[value].includes(index + 1) ? '<i></i>' : '<b></b>')).join('');
}

function newDie() {
  return { value: roll(), held: false, tilt: random(-TILT, TILT), offset: { x: random(-JITTER, JITTER), y: random(-JITTER, JITTER) } };
}

function restingTransform(die) {
  return `translate(${die.offset.x}px, ${die.offset.y}px) rotate(${die.tilt}deg)`;
}

let open = null; // laufendes Fenster – es gibt immer nur eins

/** Öffnet den Würfelbecher. Gibt eine Funktion zum Schließen zurück. */
export function openDice() {
  if (open) return open.close;

  let count = clampCount(appStorage.get('dice-count', DEFAULT_DICE));
  let dice = Array.from({ length: count }, newDie);
  let rolling = false;
  const history = [];
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
  overlay.className = 'dice-overlay';
  overlay.innerHTML = `
    <div class="dice-sheet" role="dialog" aria-modal="true" aria-label="Würfelbecher">
      <span class="dice-grabber" aria-hidden="true"></span>
      <div class="dice-head">
        <div>
          <p class="dice-kicker">Für eure Brettspiele</p>
          <p class="dice-title">Würfelbecher</p>
        </div>
        <button class="icon-btn dice-close" type="button" aria-label="Würfel schließen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="dice-count" role="group" aria-label="Anzahl Würfel">
        <span class="dice-count-thumb" aria-hidden="true"></span>
        ${Array.from({ length: MAX_DICE }, (_, index) => `<button type="button" data-count="${index + 1}" aria-label="${index + 1} Würfel">${index + 1}</button>`).join('')}
      </div>
      <div class="dice-table" aria-label="Würfelfläche – antippen zum Würfeln">
        <span class="dice-spot" aria-hidden="true"></span>
        <div class="dice-cup-box" aria-hidden="true">${CUP}</div>
        <div class="dice-row"></div>
        <p class="dice-banner" aria-hidden="true"></p>
      </div>
      <div class="dice-result" aria-live="polite">
        <div class="dice-sum">
          <span class="dice-sum-label">Summe</span>
          <span class="dice-sum-value">–</span>
        </div>
        <div class="dice-chips"></div>
      </div>
      <div class="dice-history" aria-label="Letzte Würfe"></div>
      <button class="btn btn-primary dice-roll" type="button">Würfeln</button>
      <p class="dice-hint">Würfel antippen = festhalten · Tisch antippen = würfeln</p>
    </div>`;
  document.body.append(overlay);
  document.documentElement.classList.add('dice-open');

  const sheet = $('.dice-sheet', overlay);
  const row = $('.dice-row', overlay);
  const table = $('.dice-table', overlay);
  const cupBox = $('.dice-cup-box', overlay);
  const sumValue = $('.dice-sum-value', overlay);
  const chips = $('.dice-chips', overlay);
  const historyBox = $('.dice-history', overlay);
  const banner = $('.dice-banner', overlay);
  const rollButton = $('.dice-roll', overlay);

  renderDice();
  renderCount();
  showResult(false);

  if (!reducedMotion()) {
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240 });
    sheet.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(-2%)', offset: 0.75 }, { transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
    );
    popIn(220);
  }
  audio.tone({ freq: 523, slideTo: 784, duration: 0.14, type: 'triangle', volume: 0.12 });

  // ---------- Bedienung ----------

  $('.dice-close', overlay).addEventListener('click', close);
  rollButton.addEventListener('click', throwDice);
  table.addEventListener('click', (event) => {
    const die = event.target.closest('.dice-die');
    if (die) toggleHold(Number(die.dataset.index));
    else throwDice();
  });
  $('.dice-count', overlay).addEventListener('click', (event) => {
    const button = event.target.closest('[data-count]');
    if (!button || rolling) return;
    setCount(Number(button.dataset.count));
  });
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  cleanups.push(() => document.removeEventListener('keydown', onKey));
  listenForShake();

  open = { close };
  return close;

  // ---------- Darstellung ----------

  function clampCount(value) {
    const number = Number(value);
    return Number.isInteger(number) ? Math.min(MAX_DICE, Math.max(MIN_DICE, number)) : DEFAULT_DICE;
  }

  function label(die, index) {
    return `Würfel ${index + 1}: ${die.value}${die.held ? ', festgehalten' : ''}`;
  }

  function renderDice() {
    row.dataset.count = String(dice.length);
    row.innerHTML = dice.map((die, index) => `
      <button class="dice-die${die.held ? ' is-held' : ''}" type="button" data-index="${index}" aria-label="${label(die, index)}" aria-pressed="${die.held}">
        <span class="dice-shadow"></span>
        <span class="dice-puff"></span>
        <span class="dice-throw" style="transform: ${restingTransform(die)}">
          <span class="dice-body dice-body-${die.value}">${pips(die.value)}</span>
        </span>
        <span class="dice-lock" aria-hidden="true">🔒</span>
      </button>`).join('');
  }

  function showFace(element, value) {
    const body = $('.dice-body', element);
    body.className = `dice-body dice-body-${value}`;
    body.innerHTML = pips(value);
  }

  function popIn(delay) {
    [...row.children].forEach((element, index) => element.animate(
      [{ transform: 'translateY(-24px) scale(.4) rotate(-25deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 420, delay: delay + index * 55, easing: 'cubic-bezier(.3, 1.6, .5, 1)', fill: 'backwards' },
    ));
  }

  function renderCount() {
    for (const button of overlay.querySelectorAll('[data-count]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.count) === dice.length));
    }
    $('.dice-count', overlay).style.setProperty('--pos', String(dice.length - 1));
  }

  function setCount(next) {
    if (next === dice.length) return;
    count = next;
    appStorage.set('dice-count', count);
    while (dice.length < count) dice.push(newDie());
    dice = dice.slice(0, count);
    renderDice();
    renderCount();
    showResult(false);
    updateRollLabel();
    audio.tone({ freq: 440 + count * 80, duration: 0.07, type: 'triangle', volume: 0.12 });
    vibrate(10);
    if (!reducedMotion()) popIn(0);
  }

  function updateRollLabel() {
    if (dice.length > 1 && dice.every((die) => die.held)) rollButton.textContent = 'Alle festgehalten';
    else rollButton.textContent = dice.some((die) => die.held) ? 'Restliche würfeln' : 'Würfeln';
  }

  function toggleHold(index) {
    if (rolling) return;
    if (dice.length < 2) {
      throwDice();
      return;
    }
    const die = dice[index];
    die.held = !die.held;
    const element = row.children[index];
    element.classList.toggle('is-held', die.held);
    element.setAttribute('aria-pressed', String(die.held));
    element.setAttribute('aria-label', label(die, index));
    audio.tone({ freq: die.held ? 880 : 520, duration: 0.07, type: 'square', volume: 0.06 });
    vibrate(12);
    updateRollLabel();
  }

  function showResult(final) {
    const total = dice.reduce((sum, die) => sum + die.value, 0);
    $('.dice-sum-label', overlay).textContent = dice.length > 1 ? 'Summe' : 'Augen';
    sumValue.textContent = final ? String(total) : '–';
    chips.innerHTML = final && dice.length > 1
      ? dice.map((die, index) => `<span class="dice-chip" style="--i: ${index}">${die.value}</span>`).join('')
      : '';
  }

  function renderHistory() {
    historyBox.innerHTML = history.length
      ? `<span class="dice-history-label">Letzte Würfe</span>${history.map((entry, index) => `<span class="dice-history-item${index === 0 ? ' is-new' : ''}${entry.pasch ? ' is-pasch' : ''}">${entry.total}</span>`).join('')}`
      : '';
  }

  // ---------- Würfeln ----------

  function rattle(duration) {
    const hits = Math.round(duration / 55);
    for (let i = 0; i < hits; i++) {
      audio.noise({ duration: 0.035, volume: 0.25 + Math.random() * 0.15, cutoff: 2400 + Math.random() * 2600, delay: (i * duration) / hits / 1000 });
    }
  }

  function throwDice() {
    if (rolling) return;
    const moving = dice.map((die, index) => (die.held ? null : index)).filter((index) => index !== null);
    if (!moving.length) {
      rollButton.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 240 });
      return;
    }
    rolling = true;
    rollButton.disabled = true;
    banner.classList.remove('is-on');
    showResult(false);
    overlay.classList.add('is-rolling');

    for (const index of moving) {
      const die = dice[index];
      die.value = roll();
      die.tilt = random(-TILT, TILT);
      die.offset = { x: random(-JITTER, JITTER), y: random(-JITTER, JITTER) };
    }

    if (reducedMotion()) {
      for (const index of moving) {
        const element = row.children[index];
        showFace(element, dice[index].value);
        $('.dice-throw', element).style.transform = restingTransform(dice[index]);
      }
      later(finish, 0);
      return;
    }

    // 1. Becher kommt und wird geschüttelt – die Würfel sind jetzt „darin“
    const cup = $('.dice-cup', cupBox);
    cupBox.classList.add('is-on');
    for (const index of moving) row.children[index].classList.add('is-gone');
    cup.animate(
      [{ transform: 'translateY(-120%) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(0) rotate(0)', opacity: 1 }],
      { duration: CUP_IN_MS, easing: 'cubic-bezier(.2, .9, .3, 1.2)' },
    );
    later(() => {
      cup.animate(
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ transform: i === 8 ? 'rotate(0)' : `translate(${i % 2 ? 7 : -7}px, ${i % 2 ? -4 : 2}px) rotate(${i % 2 ? 13 : -13}deg)` })),
        { duration: CUP_SHAKE_MS, easing: 'ease-in-out' },
      );
      rattle(CUP_SHAKE_MS);
      vibrate([0, 30, 20, 30, 20, 30, 20, 30]);
    }, CUP_IN_MS);

    // 2. Becher kippt, Würfel purzeln heraus
    later(() => {
      cup.animate(
        [{ transform: 'rotate(0)', opacity: 1 }, { transform: 'translate(14%, 10%) rotate(118deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(70%, -10%) rotate(150deg)', opacity: 0 }],
        { duration: CUP_POUR_MS + 300, easing: 'cubic-bezier(.4, 0, .4, 1)', fill: 'forwards' },
      );
      audio.noise({ duration: 0.25, volume: 0.2, cutoff: 1500 });
      later(() => {
        const mouth = cup.getBoundingClientRect();
        const origin = { x: mouth.left + mouth.width * 0.5, y: mouth.top + mouth.height * 0.55 };
        let longest = 0;
        moving.forEach((index, order) => {
          const duration = random(...ROLL_MS);
          longest = Math.max(longest, order * 70 + duration);
          later(() => fly(index, origin, duration), order * 70);
        });
        later(finish, longest + 60);
        later(() => cupBox.classList.remove('is-on'), CUP_POUR_MS + 400);
      }, CUP_POUR_MS * 0.45);
    }, CUP_IN_MS + CUP_SHAKE_MS);
  }

  // Ein Würfel fliegt aus der Becheröffnung zu seinem Platz, dreht sich und zeigt flackernd wechselnde Augen
  function fly(index, origin, duration) {
    const die = dice[index];
    const element = row.children[index];
    const thrower = $('.dice-throw', element);
    const shadow = $('.dice-shadow', element);
    const puff = $('.dice-puff', element);
    element.classList.remove('is-gone');

    const slot = element.getBoundingClientRect();
    const from = { x: origin.x - (slot.left + slot.width / 2), y: origin.y - (slot.top + slot.height / 2) };
    const to = die.offset;
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 };
    const spin = (Math.random() < 0.5 ? -1 : 1) * random(540, 900);
    const end = die.tilt;
    thrower.style.transform = restingTransform(die);

    thrower.animate(
      [
        { transform: `translate(${from.x}px, ${from.y}px) rotate(${end - spin}deg) scale(.4)` },
        { transform: `translate(${mid.x}px, ${mid.y}px) rotate(${end - spin * 0.45}deg) scale(1.2)`, offset: 0.3 },
        { transform: `translate(${to.x}px, ${to.y}px) rotate(${end - spin * 0.12}deg) scale(1.08, .9)`, offset: LAND_AT },
        { transform: `translate(${to.x}px, ${to.y - 22}px) rotate(${end - spin * 0.04}deg) scale(1.03)`, offset: 0.7 },
        { transform: `translate(${to.x}px, ${to.y}px) rotate(${end}deg) scale(1.04, .95)`, offset: 0.84 },
        { transform: `translate(${to.x}px, ${to.y - 5}px) rotate(${end}deg) scale(1)`, offset: 0.92 },
        { transform: restingTransform(die) },
      ],
      { duration, easing: 'ease-out' },
    );
    shadow.animate(
      [
        { transform: 'scale(.3)', opacity: 0 },
        { transform: 'scale(1.5)', opacity: 0.15, offset: 0.3 },
        { transform: 'scale(1)', opacity: 0.55, offset: LAND_AT },
        { transform: 'scale(1.15)', opacity: 0.35, offset: 0.7 },
        { transform: 'scale(1)', opacity: 0.55 },
      ],
      { duration, easing: 'ease-out' },
    );

    // Augen flackern im Flug durch, immer langsamer, bis die gewürfelte Zahl liegen bleibt
    let elapsed = 0;
    let gap = 55;
    while (elapsed + gap < duration * 0.82) {
      elapsed += gap;
      later(() => showFace(element, roll()), elapsed);
      gap *= 1.16;
    }
    later(() => showFace(element, die.value), duration * 0.84);

    // Aufprall: Staubwölkchen und Klacken
    later(() => {
      puff.animate(
        [{ transform: 'scale(.3)', opacity: 0.7 }, { transform: 'scale(1.8)', opacity: 0 }],
        { duration: 520, easing: 'cubic-bezier(.2, .7, .3, 1)' },
      );
      audio.noise({ duration: 0.05, volume: 0.32, cutoff: 3400 });
      audio.tone({ freq: 230 + Math.random() * 120, duration: 0.05, type: 'square', volume: 0.1 });
      vibrate(12);
    }, duration * LAND_AT);
    for (const [moment, volume] of [[0.84, 0.18], [0.96, 0.08]]) {
      later(() => audio.noise({ duration: 0.04, volume, cutoff: 3000 }), duration * moment);
    }
  }

  function finish() {
    rolling = false;
    rollButton.disabled = false;
    overlay.classList.remove('is-rolling');
    dice.forEach((die, index) => {
      const element = row.children[index];
      showFace(element, die.value);
      element.setAttribute('aria-label', label(die, index));
    });
    audio.sounds.success();
    vibrate(25);

    const total = dice.reduce((sum, die) => sum + die.value, 0);
    const pasch = dice.length > 1 && dice.every((die) => die.value === dice[0].value);
    showResult(true);
    countUp(total);
    history.unshift({ total, pasch });
    history.length = Math.min(history.length, HISTORY_LENGTH);
    renderHistory();

    if (pasch) {
      banner.textContent = dice.length === 2 ? 'Pasch!' : `${dice.length}er-Pasch!`;
      banner.classList.add('is-on');
      for (const element of row.children) element.classList.add('is-match');
      later(() => {
        for (const element of row.children) element.classList.remove('is-match');
      }, 1600);
      [784, 988, 1175, 1568].forEach((freq, index) => audio.tone({ freq, duration: 0.18, type: 'triangle', volume: 0.12, delay: 0.15 + index * 0.08 }));
      const box = table.getBoundingClientRect();
      burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, count: 90, colors: ['#ffd76a', '#ff4f7b', '#ffffff', '#22c55e'] });
      vibrate([0, 60, 40, 60, 40, 120]);
    }
  }

  function countUp(total) {
    if (reducedMotion()) {
      sumValue.textContent = String(total);
      return;
    }
    const start = performance.now();
    const duration = 480;
    const step = (now) => {
      if (!open) return;
      const progress = Math.min(1, (now - start) / duration);
      sumValue.textContent = String(Math.round(total * (1 - (1 - progress) ** 3)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    sumValue.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
  }

  // Schütteln zum Würfeln – nur wo der Browser Bewegungsdaten ohne Nachfrage liefert (z. B. Android)
  function listenForShake() {
    if (typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission === 'function') return;
    let last = 0;
    const onMotion = (event) => {
      const a = event.accelerationIncludingGravity;
      if (!a) return;
      const strength = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const now = Date.now();
      if (strength > SHAKE_THRESHOLD && now - last > SHAKE_PAUSE_MS) {
        last = now;
        throwDice();
      }
    };
    window.addEventListener('devicemotion', onMotion);
    cleanups.push(() => window.removeEventListener('devicemotion', onMotion));
  }

  // ---------- Schließen ----------

  function close() {
    if (!open) return;
    open = null;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const fn of cleanups) fn();
    document.documentElement.classList.remove('dice-open');
    if (reducedMotion()) {
      overlay.remove();
      return;
    }
    sheet.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 260, easing: 'cubic-bezier(.5, 0, .8, .4)', fill: 'forwards' });
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }).finished.then(() => overlay.remove(), () => overlay.remove());
  }
}
