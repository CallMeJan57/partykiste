import { $, esc } from '../../core/dom.js';
import { between, shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupScreen, toggleList } from '../../core/ui.js';
import images from './images.js';
import { categories } from './questions.js';

const ROUND_OPTIONS = ['5', '10', '15', 'endlos'];
const DEFAULT_ROUNDS = '10';
const DEFAULT_CATEGORIES = Object.keys(categories);

// Ab so vielen Namen schätzen alle nacheinander und wer am nächsten dran ist, gewinnt. Sonst Solo mit Punkten.
const NAMED_MIN_PLAYERS = 2;

const CURRENT_YEAR = new Date().getFullYear();
const SLIDER_STEPS = 1000;       // Auflösung des Schiebereglers
const DEFAULT_YEAR_SPAN = 300;   // Jahre auf dem Regler, wenn die Frage nichts vorgibt
const DEFAULT_DECADES = [2, 3];  // Zehnerpotenzen auf logarithmischen Reglern
const HINT_WIDTH = 0.3;          // Tipp-Bereich: Anteil der Reglerbreite
const EXACT = 0.004;             // so nah (Anteil der Reglerbreite) zählt als Volltreffer
const SOLO_MAX_POINTS = 100;
const SOLO_FALLOFF = 2.5;        // je größer, desto schneller gibt es 0 Punkte

const COUNT_MS = 2400;           // Lösung hochzählen
const MARKER_STAGGER = 220;

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M8 44a24 24 0 0 1 48 0" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    <path d="M8 44a24 24 0 0 1 10-19.4" fill="none" stroke="#ff4f7b" stroke-width="7" stroke-linecap="round"/>
    <path d="M32 44 44 26" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="32" cy="44" r="5" fill="#fff"/>
    <text x="32" y="16" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">?</text>
  </svg>`;

export default {
  id: 'schaetzen',
  title: 'Schätz mal!',
  tagline: 'Wie hoch, wie viele, wann? Schätzen per Schieberegler – wer am nächsten dran ist, gewinnt.',
  tags: ['ab 1 Spieler', 'mit Bildern'],
  accent: '#6366f1',
  icon: ICON,
  styles: new URL('./schaetzen.css', import.meta.url).href,
  mount,
};

// ---------- Zahlen, Regler und Format ----------

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/** Zufallswert in [0.12, 0.88], aber nicht nahe der Mitte – die Lösung soll nie mittig liegen. */
function offCenter() {
  const value = between(0.12, 0.76);
  return value < 0.42 ? value : value + 0.12;
}

function niceStep(raw) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = raw / power;
  return (factor < 1.5 ? 1 : factor < 3.5 ? 2 : factor < 7.5 ? 5 : 10) * power;
}

function roundSignificant(value, digits) {
  if (value === 0) return 0;
  const power = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return Math.round(value / power) * power;
}

/** Baut den Schieberegler für eine Frage: Bereich, Umrechnung Regler ↔ Wert und Rundung. */
function makeScale(question) {
  const answer = question.a;

  if (question.log) {
    const decades = question.decades ?? between(...DEFAULT_DECADES);
    const center = Math.log10(answer);
    const low = Math.max(0, center - offCenter() * decades);
    const high = low + decades;
    const round = (value) => (value < 100 ? Math.round(value) : roundSignificant(value, 3));
    return {
      min: round(10 ** low),
      max: round(10 ** high),
      toValue: (t) => round(10 ** (low + t * decades)),
      toT: (value) => (Math.log10(Math.max(value, 1e-9)) - low) / decades,
      round,
    };
  }

  let span;
  let step;
  let lower;
  let upper = Infinity;
  if (question.year) {
    span = question.span ?? DEFAULT_YEAR_SPAN;
    step = span > 1500 ? 10 : 1;
    lower = -Infinity;
    upper = CURRENT_YEAR;
  } else {
    span = question.span ?? Math.max(answer * between(1.6, 3.2), 6);
    // Ganzzahlige Antworten in ganzen Schritten, Kommazahlen (z. B. 9,58 s) feiner
    step = Number.isInteger(answer) ? Math.max(1, niceStep(span / 120)) : niceStep(span / 120);
    lower = 0;
  }
  let min = answer - offCenter() * span;
  if (min < lower) min = lower;
  if (min + span > upper) min = upper - span;
  // Am Rand angestoßen und die Lösung liegt dadurch doch mittig? Dann den Bereich verbreitern.
  const position = (answer - min) / span;
  if (position > 0.4 && position < 0.6) {
    if (min === lower) span = (answer - min) / 0.3;
    else min -= span * 0.35;
  }
  min = Math.floor(min / step) * step;
  const max = Math.min(upper, Math.ceil((min + span) / step) * step);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const round = (value) => Number((Math.round(value / step) * step).toFixed(decimals));
  return {
    min,
    max,
    toValue: (t) => round(min + t * (max - min)),
    toT: (value) => (value - min) / (max - min),
    round,
  };
}

/** Tipp-Bereich für schwere Fragen: enthält die Lösung, aber an zufälliger Stelle. */
function makeHint(scale, answer) {
  const position = scale.toT(answer);
  const start = Math.min(Math.max(position - offCenter() * HINT_WIDTH, 0), 1 - HINT_WIDTH);
  return { start, end: start + HINT_WIDTH, from: scale.toValue(start), to: scale.toValue(start + HINT_WIDTH) };
}

function formatYear(value) {
  if (value < 0) return `${-value} v. Chr.`;
  if (value < 500) return `${value} n. Chr.`;
  return String(value);
}

function formatValue(value, question, { unit = true } = {}) {
  if (question.year) return formatYear(value);
  const text = numberFormat.format(value);
  return unit && question.unit ? `${text} ${question.unit}` : text;
}

function formatDifference(guess, question) {
  const difference = Math.abs(guess - question.a);
  if (difference === 0) return 'genau richtig!';
  if (question.year) return `${numberFormat.format(difference)} ${difference === 1 ? 'Jahr' : 'Jahre'} daneben`;
  return `${numberFormat.format(difference)}${question.unit ? ` ${question.unit}` : ''} daneben`;
}

/** Eingetippten Text in eine Zahl verwandeln („1.889“, „2560 v. Chr.“, „3,5“). */
function parseInput(text, question) {
  let cleaned = text.trim().toLowerCase();
  if (!cleaned) return null;
  const beforeChrist = question.year && /v\.?\s*chr/.test(cleaned);
  cleaned = cleaned.replace(/[a-zäöüß°²/.\s]+$/g, '').replace(/v\.?\s*chr\.?|n\.?\s*chr\.?/g, '').replace(/\s/g, '');
  cleaned = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return beforeChrist ? -Math.abs(value) : value;
}

// ---------- Spiel ----------

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let selected = loadSelection();
  let rounds = ROUND_OPTIONS.includes(storage.get('rounds')) ? storage.get('rounds') : DEFAULT_ROUNDS;
  let players = ctx.players.get();
  let named = false;
  let points = new Map();
  let queue = [];
  let endless = false; // Endlos-Modus: Fragen gehen nie aus, beendet wird über „Spiel beenden“
  let number = 0;
  let current = null; // { key, question, scale, hint, guesses: [{ name, value }] }
  let stopLoop = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function guessers() {
    return named ? players : ['Du'];
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endLoop();
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: `${category.emoji}\u2002${category.label}`,
      hint: `${category.hint} · ${category.questions.length} Fragen`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="sz-intro">
          <div class="sz-gauge" aria-hidden="true">
            <svg viewBox="0 0 120 70">
              <path class="sz-gauge-track" d="M10 62a50 50 0 0 1 100 0"/>
              <path class="sz-gauge-fill" d="M10 62a50 50 0 0 1 100 0" pathLength="1"/>
              <g class="sz-gauge-needle"><path d="M60 62 60 20"/><circle cx="60" cy="62" r="6"/></g>
            </svg>
          </div>
          <h1 class="sz-title">Schätz mal!</h1>
          <p class="sz-lede">Per Regler oder eintippen – wer am nächsten dran ist, gewinnt.</p>
        </div>`,
      cards: [
        {
          icon: '🧠',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '🔢',
          title: 'Fragen pro Spiel',
          body: segmented({ name: 'rounds', label: 'Fragen pro Spiel', options: ROUND_OPTIONS.map((value) => ({ value, label: value === 'endlos' ? 'Endlos' : value })), value: rounds }),
          note: 'Endlos: so lange ihr wollt – beendet wird über „Spiel beenden“.',
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="sz-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.sz-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Solo spielen';
      playersHint.textContent = withNames
        ? 'Alle schätzen nacheinander verdeckt. Wer am nächsten dran ist, bekommt einen Punkt – bei einem Volltreffer gibt es einen Bonus.'
        : 'Ohne Namen spielst du solo und bekommst bis zu 100 Punkte pro Frage – je genauer, desto mehr.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'rounds', (value) => {
      rounds = value;
      storage.set('rounds', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        updateStart();
      },
    });
    startButton.addEventListener('click', startGame);
    updateStart();
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    points = new Map(guessers().map((name) => [name, 0]));
    endless = rounds === 'endlos';
    queue = endless ? shuffle(questionPool()) : shuffle(questionPool()).slice(0, Number(rounds));
    number = 0;
    nextQuestion();
  }

  function questionPool() {
    return selected.flatMap((key) => categories[key].questions.map((question) => ({ key, question })));
  }

  // ---------- Frage und Schätzen ----------

  function imageFor(question) {
    return question.image ? images[question.image] : null;
  }

  function photo(entry) {
    const src = imageFor(entry.question);
    return `
      <div class="sz-photo${src ? '' : ' is-fallback'}" data-emoji="${esc(categories[entry.key].emoji)}">
        ${src ? `<img src="${esc(src)}" alt="" decoding="async" referrerpolicy="no-referrer">` : ''}
      </div>`;
  }

  function bindPhotoFallback() {
    for (const img of root.querySelectorAll('.sz-photo img')) {
      img.addEventListener('error', () => {
        img.parentElement.classList.add('is-fallback');
        img.remove();
      }, { once: true });
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    }
  }

  function preload(entry) {
    const src = entry && imageFor(entry.question);
    if (src) {
      const image = new Image();
      image.referrerPolicy = 'no-referrer';
      image.src = src;
    }
  }

  function nextQuestion() {
    if (endless && number >= queue.length) {
      // Alle Fragen durch: neu mischen und weiter – die letzte Frage nicht gleich wiederholen
      const last = queue[queue.length - 1];
      const next = shuffle(questionPool());
      if (next.length > 1 && next[0].question === last?.question) next.push(next.shift());
      queue = queue.concat(next);
    }
    const entry = queue[number];
    if (!entry) {
      showEnd();
      return;
    }
    number += 1;
    const scale = makeScale(entry.question);
    current = {
      ...entry,
      scale,
      hint: entry.question.hard ? makeHint(scale, entry.question.a) : null,
      guesses: [],
    };
    preload(queue[number]);
    showQuestion();
  }

  function showQuestion() {
    const { question, key } = current;
    root.innerHTML = `
      <section class="screen sz-ask">
        <div class="sz-head">
          <p class="eyebrow">${endless ? `Frage ${number} · Endlos` : `Frage ${number} von ${queue.length}`}</p>
          <span class="chip sz-category">${categories[key].emoji} ${esc(categories[key].label)}</span>
        </div>
        <div class="sz-qcard">
          ${photo(current)}
          <p class="sz-question">${esc(question.q)}</p>
        </div>
        <div class="sz-panel"></div>
      </section>`;

    bindPhotoFallback();
    if (!fx.reducedMotion()) {
      $('.sz-qcard', root).animate(
        [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }],
        { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
    }
    showGuessPanel(0);
  }

  function showGuessPanel(index) {
    const { question, scale, hint } = current;
    const list = guessers();
    const name = list[index];
    const last = index === list.length - 1;
    const panel = $('.sz-panel', root);
    // Jeder startet an einer zufälligen Stelle – so verrät der Regler nichts.
    let value = scale.toValue(between(0.08, 0.92));

    panel.innerHTML = `
      <p class="sz-who">${named ? `<b>${esc(name)}</b> schätzt` : 'Deine Schätzung'}</p>
      <p class="sz-value" aria-live="polite"></p>
      <div class="sz-slider">
        ${hint ? `<span class="sz-band" style="left: ${hint.start * 100}%; width: ${HINT_WIDTH * 100}%"></span>` : ''}
        <input class="sz-range" type="range" min="0" max="${SLIDER_STEPS}" step="1" aria-label="Schätzung">
      </div>
      <div class="sz-ends"><span>${esc(formatValue(scale.min, question))}</span><span>${esc(formatValue(scale.max, question))}</span></div>
      ${hint ? `<p class="sz-hint"><span>Tipp</span> Die Lösung liegt zwischen <b>${esc(formatValue(hint.from, question))}</b> und <b>${esc(formatValue(hint.to, question))}</b>.</p>` : ''}
      <label class="sz-type">
        <input type="text" inputmode="${question.year ? 'text' : 'decimal'}" autocomplete="off" placeholder="oder eintippen" aria-label="Schätzung eintippen">
        ${question.unit && !question.year ? `<span>${esc(question.unit)}</span>` : ''}
      </label>
      ${question.year && question.a < 500 ? '<p class="sz-small">Vor Christus? Einfach „v. Chr.“ dazuschreiben oder ein Minus davor.</p>' : ''}
      <button class="btn btn-primary" type="button" data-action="lock">${named ? (last ? 'Abgeben & auflösen' : `Abgeben – weiter an ${esc(list[index + 1])}`) : 'Auflösen'}</button>
      ${named ? `<ul class="sz-progress">${list.map((player, i) => `<li class="${i < index ? 'is-done' : i === index ? 'is-now' : ''}">${i < index ? '✓ ' : ''}${esc(player)}</li>`).join('')}</ul>` : ''}`;

    const range = $('.sz-range', panel);
    const display = $('.sz-value', panel);
    const typed = $('.sz-type input', panel);

    const show = (fromSlider) => {
      display.textContent = formatValue(value, question);
      const t = Math.min(1, Math.max(0, scale.toT(value)));
      if (!fromSlider) range.value = String(Math.round(t * SLIDER_STEPS));
      range.style.setProperty('--fill', `${t * 100}%`);
    };
    range.addEventListener('input', () => {
      value = scale.toValue(Number(range.value) / SLIDER_STEPS);
      typed.value = '';
      show(true);
    });
    typed.addEventListener('input', () => {
      const parsed = parseInput(typed.value, question);
      if (parsed === null) return;
      value = parsed;
      show(false);
    });
    typed.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') typed.blur();
    });
    show(false);

    $('[data-action="lock"]', panel).addEventListener('click', () => {
      current.guesses.push({ name, value });
      audio.sounds.blip();
      vibrate(20);
      if (last) {
        showReveal();
        return;
      }
      if (fx.reducedMotion()) {
        showGuessPanel(index + 1);
        return;
      }
      panel.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-40px)' }],
        { duration: 180, easing: 'ease-in' },
      ).finished.then(() => {
        showGuessPanel(index + 1);
        panel.animate(
          [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }],
          { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' },
        );
      }, () => {});
    });

    if (!fx.reducedMotion() && index === 0) {
      range.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    }
  }

  // ---------- Auflösung ----------

  function evaluate() {
    const { question, scale } = current;
    const answerT = scale.toT(question.a);
    const results = current.guesses.map((guess) => {
      const error = Math.abs(scale.toT(guess.value) - answerT);
      return { ...guess, error, exact: guess.value === question.a || error < EXACT };
    });
    results.sort((a, b) => a.error - b.error);
    const best = results[0].error;
    for (const result of results) {
      result.winner = named && result.error - best < 1e-9;
      result.solo = Math.round(SOLO_MAX_POINTS * Math.max(0, 1 - result.error * SOLO_FALLOFF));
      if (result.exact) result.solo = SOLO_MAX_POINTS;
      result.gain = named ? (result.winner ? 1 : 0) + (result.exact ? 1 : 0) : result.solo;
      points.set(result.name, (points.get(result.name) ?? 0) + result.gain);
    }
    return results;
  }

  function rating(score) {
    if (score >= 95) return 'Volltreffer!';
    if (score >= 75) return 'Sehr nah dran!';
    if (score >= 45) return 'Nicht schlecht!';
    if (score > 0) return 'Knapp daneben …';
    return 'Weit daneben!';
  }

  function showReveal() {
    const { question, scale, key } = current;
    const results = evaluate();
    const answerT = scale.toT(question.a);
    const clampT = (t) => Math.min(1, Math.max(0, t));

    // Dicht beieinanderliegende Schätzungen abwechselnd hoch und tief stecken, damit sie sich nicht verdecken
    const markerRows = new Map();
    let previous = null;
    for (const guess of [...current.guesses].sort((a, b) => a.value - b.value)) {
      const t = clampT(scale.toT(guess.value));
      const row = previous && t - previous.t < 0.1 ? 1 - previous.row : 0;
      markerRows.set(guess, row);
      previous = { t, row };
    }

    const markers = current.guesses.map((guess, index) => {
      const t = scale.toT(guess.value);
      const result = results.find((entry) => entry.name === guess.name);
      const label = named ? guess.name : 'Du';
      return `
        <span class="sz-marker${result.winner ? ' is-winner' : ''}${t < 0 || t > 1 ? ' is-outside' : ''}" style="left: ${clampT(t) * 100}%; --row: ${markerRows.get(guess)}" data-index="${index}">
          <span class="sz-marker-pin">${esc(label.slice(0, 2))}</span>
          <span class="sz-marker-name">${esc(label)}</span>
        </span>`;
    }).join('');

    const rows = results.map((result) => `
      <li class="${result.winner || (!named && result.solo >= 75) ? 'is-best' : ''}">
        <span class="sz-res-name">${result.winner ? '👑 ' : ''}${esc(named ? result.name : 'Deine Schätzung')}</span>
        <span class="sz-res-guess">${esc(formatValue(result.value, question))}<small>${esc(formatDifference(result.value, question))}</small></span>
        <b class="sz-res-gain">${named ? (result.gain ? `+${result.gain}` : '') : `+${result.solo}`}</b>
      </li>`).join('');

    const soloScore = named ? null : results[0].solo;

    root.innerHTML = `
      <section class="screen sz-reveal">
        <div class="sz-qmini">
          ${photo(current)}
          <p>${esc(question.q)}</p>
        </div>
        <div class="sz-answer-box">
          <p class="eyebrow">Die Lösung</p>
          <p class="sz-answer">…</p>
        </div>
        <div class="sz-line">
          <div class="sz-track"><span class="sz-track-fill"></span></div>
          <span class="sz-flag" style="left: 0%"><span>🎯</span></span>
          ${markers}
        </div>
        <div class="sz-ends"><span>${esc(formatValue(scale.min, question))}</span><span>${esc(formatValue(scale.max, question))}</span></div>
        <div class="sz-after">
          ${soloScore !== null ? `<p class="sz-rating">${rating(soloScore)}</p>` : ''}
          <ol class="sz-results">${rows}</ol>
          ${question.fact ? `<p class="sz-fact"><span>💡</span>${esc(question.fact)}</p>` : ''}
          <button class="btn btn-primary" type="button" data-action="next">${endless || number < queue.length ? 'Nächste Frage' : 'Zur Auswertung'}</button>
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    bindPhotoFallback();
    $('[data-action="next"]', root).addEventListener('click', nextQuestion);
    $('[data-action="end"]', root).addEventListener('click', showEnd);

    const answerLabel = $('.sz-answer', root);
    const flag = $('.sz-flag', root);
    const fill = $('.sz-track-fill', root);
    const after = $('.sz-after', root);
    const markerEls = [...root.querySelectorAll('.sz-marker')];
    const finalT = clampT(answerT);

    const finish = () => {
      answerLabel.textContent = formatValue(question.a, question);
      flag.style.left = `${finalT * 100}%`;
      fill.style.width = `${finalT * 100}%`;
      root.querySelector('.sz-reveal').classList.add('is-done');
      audio.sounds.success();
      audio.tone({ freq: 1568, duration: 0.5, type: 'triangle', volume: 0.12, delay: 0.12 });
      vibrate([0, 50, 30, 90]);

      const winner = root.querySelector('.sz-marker.is-winner') ?? (soloScore >= 75 ? markerEls[0] : null);
      if (winner) {
        const box = winner.getBoundingClientRect();
        const styles = getComputedStyle(root);
        fx.burst({ x: box.left + box.width / 2, y: box.top, count: 50, colors: ['--accent', '--accent-2', '--gold'].map((token) => styles.getPropertyValue(token).trim()) });
      }
      if (!fx.reducedMotion()) {
        answerLabel.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
        flag.animate([{ transform: 'translate(-50%, -14px)' }, { transform: 'translate(-50%, 0)' }], { duration: 380, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
        [...after.children].forEach((child, index) => child.animate(
          [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, delay: 120 + index * 110, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' },
        ));
      }
      after.classList.add('is-visible');
    };

    if (fx.reducedMotion()) {
      finish();
      return;
    }

    // 1. Schätzungen fallen nacheinander auf den Zahlenstrahl
    markerEls.forEach((marker, index) => {
      marker.animate(
        [{ opacity: 0, transform: 'translate(-50%, -60px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }],
        { duration: 420, delay: index * MARKER_STAGGER, easing: 'cubic-bezier(.3, 1.5, .5, 1)', fill: 'backwards' },
      );
      ctx.timeout(() => audio.tone({ freq: 440 + index * 110, duration: 0.08, type: 'triangle', volume: 0.15 }), index * MARKER_STAGGER + 120);
    });

    // 2. Trommelwirbel: Die Lösung zählt hoch, die Zielfahne fährt mit
    ctx.timeout(() => {
      const start = performance.now();
      let lastBeat = -1;
      stopLoop = ctx.loop((now) => {
        const progress = Math.min(1, (now - start) / COUNT_MS);
        const eased = 1 - (1 - progress) ** 3;
        const t = eased * finalT;
        flag.style.left = `${t * 100}%`;
        fill.style.width = `${t * 100}%`;
        answerLabel.textContent = formatValue(progress < 1 ? scale.toValue(t) : question.a, question);
        const beat = Math.floor(progress * 34);
        if (beat !== lastBeat) {
          lastBeat = beat;
          audio.noise({ duration: 0.035, volume: 0.22, cutoff: 1600 + beat * 40 });
        }
        if (progress >= 1) {
          stopLoop = null;
          finish();
          return false;
        }
      });
    }, markerEls.length * MARKER_STAGGER + 350);
  }

  function endLoop() {
    stopLoop?.();
    stopLoop = null;
  }

  // ---------- Spielende ----------

  function showEnd() {
    endLoop();
    const played = current ? number - (current.guesses.length < guessers().length ? 1 : 0) : 0;
    if (!played) {
      showSetup();
      return;
    }

    let body;
    if (named) {
      const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
      const best = ranked[0][1];
      const winners = ranked.filter(([, score]) => score === best && best > 0).map(([name]) => name);
      body = `
        <p class="sz-end-title">${winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden'}</p>
        ${rankingList(ranked.map(([name, value]) => ({ name, value })))}`;
    } else {
      const total = points.get('Du') ?? 0;
      const average = Math.round(total / played);
      body = `
        <p class="sz-end-title">${numberFormat.format(total)} Punkte</p>
        <p class="sz-rating">${rating(average)} <small>Im Schnitt ${average} von ${SOLO_MAX_POINTS} pro Frage</small></p>`;
    }

    audio.sounds.success();
    const styles = getComputedStyle(root);
    fx.burst({ colors: ['--accent', '--accent-2', '--gold'].map((token) => styles.getPropertyValue(token).trim()) });

    root.innerHTML = `
      <section class="screen sz-end" data-leave-free>
        <p class="eyebrow">${played} ${played === 1 ? 'Frage' : 'Fragen'} geschätzt</p>
        ${body}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
