import { $, esc } from '../../core/dom.js';
import { between } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters } from '../../core/ui.js';
import { css, hsvToRgb, matchPercent, rgbToHsv, textOn } from './color.js';

const MEMORY_TIMES = [
  { value: '6', label: 'Leicht · 6 s' },
  { value: '4', label: 'Mittel · 4 s' },
  { value: '2', label: 'Schwer · 2 s' },
];
const ROUND_COUNTS = ['3', '5', '10'];
const MODES = [
  { value: 'hsb', label: 'Farbton-Regler' },
  { value: 'rgb', label: 'RGB-Regler' },
];

const SLIDERS = {
  hsb: [
    { key: 'h', label: 'Farbton', max: 360, unit: '°' },
    { key: 's', label: 'Sättigung', max: 100, unit: ' %' },
    { key: 'v', label: 'Helligkeit', max: 100, unit: ' %' },
  ],
  rgb: [
    { key: 'r', label: 'Rot', max: 255, unit: '' },
    { key: 'g', label: 'Grün', max: 255, unit: '' },
    { key: 'b', label: 'Blau', max: 255, unit: '' },
  ],
};

// Ab so vielen Namen wird reihum gespielt und es gibt eine Rangliste
const NAMED_MIN_PLAYERS = 2;

const MIN_HUE_STEP = 45;    // Abstand zur vorherigen Farbe im Farbkreis
const FLOOD_MS = 520;       // Farbe flutet den Bildschirm
const SCRAMBLE_MS = 420;    // Farben wirbeln durcheinander, bevor die Regler kommen
const SCRAMBLE_STEPS = 7;
const COLLAPSE_MS = 380;    // Farbe schrumpft auf einen Punkt
const COLLIDE_MS = 620;     // die zwei Hälften prallen aufeinander
const COUNT_MS = 1300;      // Prozentzahl läuft hoch
const DROP_GAP_MS = 130;    // Farbtropfen beim Schieben
const TICK_GAP_MS = 70;     // Klick beim Schieben
const GALLERY_MAX = 10;

const VERDICTS = [
  { min: 99, text: 'Pixelperfekt!' },
  { min: 90, text: 'Farbgenie!' },
  { min: 75, text: 'Richtig stark!' },
  { min: 55, text: 'Ganz ordentlich' },
  { min: 35, text: 'Da geht noch was' },
  { min: 0, text: 'Das war nichts' },
];

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="#17131f"/>
    <g style="mix-blend-mode: screen">
      <circle cx="32" cy="23" r="13.5" fill="#ff3d5a"/>
      <circle cx="23" cy="39" r="13.5" fill="#2bd96b"/>
      <circle cx="41" cy="39" r="13.5" fill="#3d7bff"/>
    </g>
  </svg>`;

// Startbild: drei Lichtkreise treiben auseinander und mischen sich wieder zu Weiß
const HERO = `
  <div class="cm-hero" aria-hidden="true">
    <span class="cm-light is-red"></span>
    <span class="cm-light is-green"></span>
    <span class="cm-light is-blue"></span>
  </div>`;

export default {
  id: 'color-match',
  title: 'Color Match',
  tagline: 'Farbe merken, mit drei Reglern nachmischen – wie viel Prozent triffst du?',
  tags: ['ab 1 Spieler', 'Namen optional'],
  accent: '#8b5cf6',
  icon: ICON,
  styles: new URL('./color-match.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let memory = MEMORY_TIMES.some((option) => option.value === storage.get('memory')) ? storage.get('memory') : '4';
  let rounds = ROUND_COUNTS.includes(storage.get('rounds')) ? storage.get('rounds') : '5';
  let mode = MODES.some((option) => option.value === storage.get('mode')) ? storage.get('mode') : 'hsb';
  let players = ctx.players.get();

  let named = false;
  let turn = 0;          // laufende Nummer über alle Züge
  let results = [];      // { name, percent, target, guess }
  let target = null;     // Vorgabe als { r, g, b }
  let lastHue = null;
  let values = {};       // aktuelle Reglerwerte
  let lastDropAt = 0;
  let lastTickAt = 0;

  showSetup();

  function totalTurns() {
    return Number(rounds) * (named ? players.length : 1);
  }

  function currentName() {
    return named ? players[turn % players.length] : null;
  }

  function currentRound() {
    return Math.floor(turn / (named ? players.length : 1)) + 1;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    root.innerHTML = setupScreen({
      hero: `
        <div class="cm-intro">
          ${HERO}
          <h1 class="cm-title" aria-label="Color Match">${splitLetters('Color Match', { prefix: 'cm' })}</h1>
          <p class="cm-lede">Merk dir die Farbe. Misch sie nach. Hoffe auf 100 %.</p>
        </div>`,
      cards: [
        {
          icon: '👁️',
          title: 'Merkzeit',
          body: segmented({ name: 'memory', label: 'Merkzeit', options: MEMORY_TIMES, value: memory }),
        },
        {
          icon: '🎚️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Regler',
              control: segmented({ name: 'mode', label: 'Regler', options: MODES, value: mode }),
            })}
            ${setupRow({
              label: 'Runden',
              control: segmented({ name: 'rounds', label: 'Runden', options: ROUND_COUNTS.map((value) => ({ value, label: value })), value: rounds }),
            })}`,
          note: 'Farbton-Regler: Farbton, Sättigung, Helligkeit. RGB-Regler: Rot, Grün, Blau.',
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: 'Mit Namen wird reihum gespielt, am Ende gibt es eine Rangliste.',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">Los geht\'s</button>',
    });

    bindSegmented(root, 'memory', (value) => {
      memory = value;
      storage.set('memory', value);
    });
    bindSegmented(root, 'mode', (value) => {
      mode = value;
      storage.set('mode', value);
    });
    bindSegmented(root, 'rounds', (value) => {
      rounds = value;
      storage.set('rounds', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
      },
    });
    $('[data-action="start"]', root).addEventListener('click', startGame);
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    turn = 0;
    results = [];
    lastHue = null;
    showTurn();
  }

  // ---------- Bereit machen ----------

  function showTurn() {
    const name = currentName();
    root.innerHTML = `
      <section class="screen cm-turn">
        <p class="eyebrow">Runde ${currentRound()} von ${rounds}</p>
        <h1 class="cm-who">${name ? `${esc(name)} ist dran` : 'Bereit?'}</h1>
        <button class="cm-reveal-btn" type="button" data-action="show">
          <span class="cm-orbit" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="cm-reveal-label">Farbe zeigen</span>
        </button>
        <p class="cm-hint">${Number(memory)} Sekunden zum Einprägen. Danach ist sie weg.</p>
      </section>`;
    $('[data-action="show"]', root).addEventListener('click', showMemory, { once: true });
  }

  function nextTarget() {
    let hue = between(0, 360);
    while (lastHue !== null && hueGap(hue, lastHue) < MIN_HUE_STEP) hue = between(0, 360);
    lastHue = hue;
    return hsvToRgb({ h: hue, s: between(35, 100), v: between(40, 100) });
  }

  // ---------- Farbe einprägen ----------

  function showMemory(event) {
    target = nextTarget();
    const seconds = Number(memory);
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;

    const flood = document.createElement('div');
    flood.className = 'cm-flood';
    flood.style.setProperty('--c', css(target));
    flood.style.setProperty('--on-c', textOn(target));
    flood.style.setProperty('--x', `${x}px`);
    flood.style.setProperty('--y', `${y}px`);
    flood.style.setProperty('--ms', `${seconds * 1000}ms`);
    flood.innerHTML = `
      <p class="cm-flood-title">Merk dir diese Farbe</p>
      <div class="cm-timer" aria-live="off">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="cm-timer-back" cx="60" cy="60" r="52"/>
          <circle class="cm-timer-ring" cx="60" cy="60" r="52" pathLength="100"/>
        </svg>
        <span class="cm-timer-number">${seconds}</span>
      </div>`;
    root.append(flood);
    sound.flood();
    vibrate(20);

    const number = $('.cm-timer-number', flood);
    const startDelay = fx.reducedMotion() ? 0 : FLOOD_MS;
    flood.classList.add('is-open');

    let left = seconds;
    ctx.timeout(() => {
      flood.classList.add('is-counting');
      const id = ctx.interval(() => {
        left -= 1;
        if (left <= 0) {
          ctx.clearInterval(id);
          scrambleAway(flood);
          return;
        }
        number.textContent = String(left);
        sound.tick(left);
        if (!fx.reducedMotion()) {
          number.animate([{ transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
        }
      }, 1000);
    }, startDelay);
  }

  // Die Farbe zerfällt: Fremde Farben wirbeln durch, dann schrumpft alles auf einen Punkt
  function scrambleAway(flood) {
    if (fx.reducedMotion()) {
      flood.remove();
      showMix();
      return;
    }
    flood.classList.add('is-scrambling');
    sound.scramble();
    vibrate([0, 30, 30, 30]);
    const frames = Array.from({ length: SCRAMBLE_STEPS }, () => ({ backgroundColor: css(hsvToRgb({ h: between(0, 360), s: between(60, 100), v: between(60, 100) })) }));
    flood.animate(frames, { duration: SCRAMBLE_MS, easing: `steps(${SCRAMBLE_STEPS}, end)`, fill: 'forwards' });
    ctx.timeout(() => {
      flood.animate(
        [{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0 at 50% 50%)' }],
        { duration: COLLAPSE_MS, easing: 'cubic-bezier(.7, 0, .8, .4)', fill: 'forwards' },
      );
      sound.collapse();
    }, SCRAMBLE_MS);
    ctx.timeout(() => {
      flood.remove();
      showMix();
    }, SCRAMBLE_MS + COLLAPSE_MS);
  }

  // ---------- Regler ----------

  function guessRgb() {
    return mode === 'hsb' ? hsvToRgb(values) : { r: values.r, g: values.g, b: values.b };
  }

  function startValues() {
    if (mode === 'rgb') return { r: 128, g: 128, b: 128 };
    return { h: Math.round(between(0, 360)), s: 50, v: 50 };
  }

  function showMix() {
    values = startValues();
    const name = currentName();
    root.innerHTML = `
      <section class="screen cm-mix">
        <div class="cm-mix-head">
          <p class="eyebrow">Runde ${currentRound()} von ${rounds}${name ? ` · ${esc(name)}` : ''}</p>
          <h1 class="cm-mix-title">Misch die Farbe</h1>
        </div>
        <div class="cm-stage" aria-hidden="true">
          <span class="cm-glow"></span>
          <span class="cm-blob"></span>
        </div>
        <div class="cm-sliders">
          ${SLIDERS[mode].map((slider, index) => `
            <div class="cm-slider" data-key="${slider.key}" style="--i: ${index}">
              <div class="cm-slider-head">
                <span>${slider.label}</span>
                <b data-value></b>
              </div>
              <div class="cm-track" role="slider" tabindex="0" aria-label="${slider.label}" aria-valuemin="0" aria-valuemax="${slider.max}">
                <span class="cm-thumb"></span>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn btn-primary" type="button" data-action="lock">Farbe prüfen</button>
      </section>`;

    for (const slider of SLIDERS[mode]) bindSlider(slider);
    refreshMix();
    $('[data-action="lock"]', root).addEventListener('click', showResult);
  }

  function bindSlider(slider) {
    const row = $(`[data-key="${slider.key}"]`, root);
    const track = $('.cm-track', row);
    let dragging = false;

    const setFromPointer = (event) => {
      const box = track.getBoundingClientRect();
      const inset = $('.cm-thumb', track).offsetWidth / 2;
      const ratio = (event.clientX - box.left - inset) / (box.width - inset * 2);
      setValue(slider, track, Math.round(Math.min(1, Math.max(0, ratio)) * slider.max));
    };

    track.addEventListener('pointerdown', (event) => {
      dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-grabbed');
      setFromPointer(event);
    });
    track.addEventListener('pointermove', (event) => {
      if (dragging) setFromPointer(event);
    });
    const release = () => {
      dragging = false;
      track.classList.remove('is-grabbed');
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);

    track.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      setValue(slider, track, Math.min(slider.max, Math.max(0, values[slider.key] + step)));
    });
  }

  function setValue(slider, track, value) {
    if (values[slider.key] === value) return;
    values[slider.key] = value;
    refreshMix();

    const now = performance.now();
    if (now - lastTickAt >= TICK_GAP_MS) {
      lastTickAt = now;
      sound.slide(value / slider.max);
    }
    if (now - lastDropAt >= DROP_GAP_MS) {
      lastDropAt = now;
      flyDrop(track);
    }
  }

  // Beim Schieben fliegt ein Farbtropfen vom Regler in den Kreis
  function flyDrop(track) {
    if (fx.reducedMotion()) return;
    const screen = $('.cm-mix', root);
    const blob = $('.cm-blob', root);
    const thumb = $('.cm-thumb', track).getBoundingClientRect();
    const end = blob.getBoundingClientRect();
    const from = { x: thumb.left + thumb.width / 2, y: thumb.top + thumb.height / 2 };
    const to = { x: end.left + end.width / 2, y: end.top + end.height / 2 };

    const drop = document.createElement('span');
    drop.className = 'cm-drop';
    drop.style.left = `${from.x}px`;
    drop.style.top = `${from.y}px`;
    screen.append(drop);
    drop.animate(
      [
        { transform: 'translate(-50%, -50%) scale(.6)', opacity: 1 },
        { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(1.1)`, opacity: 1, offset: 0.85 },
        { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(.3)`, opacity: 0 },
      ],
      { duration: 340, easing: 'cubic-bezier(.5, 0, .9, .6)' },
    ).onfinish = () => {
      drop.remove();
      if (blob.isConnected) {
        blob.animate([{ scale: '1' }, { scale: '1.05' }, { scale: '1' }], { duration: 200, easing: 'ease-out' });
      }
    };
  }

  function refreshMix() {
    const screen = $('.cm-mix', root);
    const color = guessRgb();
    screen.style.setProperty('--c', css(color));
    screen.style.setProperty('--on-c', textOn(color));

    for (const slider of SLIDERS[mode]) {
      const row = $(`[data-key="${slider.key}"]`, root);
      const track = $('.cm-track', row);
      const value = values[slider.key];
      track.style.setProperty('--track', trackGradient(slider.key));
      track.style.setProperty('--pos', String(value / slider.max));
      track.setAttribute('aria-valuenow', String(value));
      $('[data-value]', row).textContent = `${value}${slider.unit}`;
    }
  }

  // Die Reglerspur zeigt, was der Regler bei den aktuellen anderen Werten bewirkt
  function trackGradient(key) {
    const { h, s, v } = values;
    const stops = {
      h: () => [0, 60, 120, 180, 240, 300, 360].map((hue) => hsvToRgb({ h: hue, s: Math.max(s, 25), v: Math.max(v, 45) })),
      s: () => [hsvToRgb({ h, s: 0, v }), hsvToRgb({ h, s: 100, v })],
      v: () => [hsvToRgb({ h, s, v: 0 }), hsvToRgb({ h, s, v: 100 })],
      r: () => [{ ...values, r: 0 }, { ...values, r: 255 }],
      g: () => [{ ...values, g: 0 }, { ...values, g: 255 }],
      b: () => [{ ...values, b: 0 }, { ...values, b: 255 }],
    }[key]();
    return `linear-gradient(90deg, ${stops.map(css).join(', ')})`;
  }

  // ---------- Ergebnis ----------

  function differences(guess) {
    if (mode === 'rgb') {
      return SLIDERS.rgb.map((slider) => ({ ...slider, delta: guess[slider.key] - target[slider.key] }));
    }
    const wanted = rgbToHsv(target);
    return SLIDERS.hsb.map((slider) => ({
      ...slider,
      delta: Math.round(slider.key === 'h' ? signedHueStep(wanted.h, values.h) : values[slider.key] - wanted[slider.key]),
    }));
  }

  function showResult() {
    const guess = guessRgb();
    const percent = matchPercent(target, guess);
    results.push({ name: currentName(), percent, target, guess });
    const last = turn + 1 >= totalTurns();
    const nextName = named && !last ? players[(turn + 1) % players.length] : null;
    const verdict = VERDICTS.find((entry) => percent >= entry.min).text;
    sound.lock();
    vibrate(15);

    root.innerHTML = `
      <section class="screen cm-result" style="--target: ${css(target)}; --guess: ${css(guess)}">
        <p class="eyebrow">Runde ${currentRound()} von ${rounds}${results.at(-1).name ? ` · ${esc(results.at(-1).name)}` : ''}</p>
        <div class="cm-compare" role="img" aria-label="Vorgabe und deine Farbe im Vergleich">
          <svg class="cm-gauge" viewBox="0 0 120 120" aria-hidden="true">
            <circle class="cm-gauge-back" cx="60" cy="60" r="56"/>
            <circle class="cm-gauge-fill" cx="60" cy="60" r="56" pathLength="100"/>
          </svg>
          <span class="cm-half is-target"><em>Vorgabe</em></span>
          <span class="cm-half is-guess"><em>Deine Farbe</em></span>
        </div>
        <p class="cm-score" aria-label="${percent} Prozent"><b data-score>0</b><small>%</small></p>
        <p class="cm-verdict" aria-label="${esc(verdict)}"></p>
        <div class="cm-diffs">
          ${differences(guess).map((entry, index) => `
            <span class="cm-diff" style="--i: ${index}">
              <small>${entry.label}</small>
              <b>${entry.delta > 0 ? '+' : ''}${String(entry.delta).replace('-', '−')}${entry.unit}</b>
            </span>`).join('')}
        </div>
        <button class="btn btn-primary cm-next" type="button" data-action="next" disabled>${last ? 'Ergebnis ansehen' : nextName ? `Weiter: ${esc(nextName)}` : 'Nächste Farbe'}</button>
      </section>`;

    $('[data-action="next"]', root).addEventListener('click', advance);

    if (fx.reducedMotion()) {
      finishResult(percent, verdict);
      return;
    }
    ctx.timeout(() => {
      sound.collide();
      vibrate(30);
      fx.shake($('.cm-compare', root));
    }, COLLIDE_MS * 0.7);
    ctx.timeout(() => countUp(percent, verdict), COLLIDE_MS);
  }

  function countUp(percent, verdict) {
    const started = performance.now();
    const number = $('[data-score]', root);
    const gauge = $('.cm-gauge-fill', root);
    let shown = -1;
    ctx.loop((now) => {
      const progress = Math.min(1, (now - started) / COUNT_MS);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(percent * eased);
      if (value !== shown) {
        shown = value;
        number.textContent = String(value);
        gauge.style.strokeDashoffset = String(100 - value);
        gauge.style.stroke = gaugeColor(value);
        if (value % 4 === 0) sound.count(value);
      }
      if (progress < 1) return true;
      finishResult(percent, verdict);
      return false;
    });
  }

  function finishResult(percent, verdict) {
    const screen = $('.cm-result', root);
    $('[data-score]', root).textContent = String(percent);
    const gauge = $('.cm-gauge-fill', root);
    gauge.style.strokeDashoffset = String(100 - percent);
    gauge.style.stroke = gaugeColor(percent);
    $('.cm-verdict', root).innerHTML = splitLetters(verdict, { prefix: 'cm' });
    screen.classList.add('is-done');
    $('[data-action="next"]', root).disabled = false;

    if (percent >= 90) {
      sound.great();
      vibrate([0, 40, 40, 80]);
      const box = $('.cm-compare', root).getBoundingClientRect();
      fx.burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, colors: [css(target), css(results.at(-1).guess), '#ffffff'] });
    } else if (percent >= 55) {
      sound.good();
    } else {
      sound.bad();
      if (percent < 35) fx.shake();
    }
  }

  function advance() {
    turn += 1;
    if (turn >= totalTurns()) showEnd();
    else showTurn();
  }

  // ---------- Spielende ----------

  function average(list) {
    return Math.round(list.reduce((sum, entry) => sum + entry.percent, 0) / list.length);
  }

  function showEnd() {
    const overall = average(results);
    const bestKey = `best-${memory}`;
    const record = !named && overall > storage.get(bestKey, 0);
    if (record) storage.set(bestKey, overall);

    const ranked = named
      ? players
        .map((name) => {
          const own = results.filter((entry) => entry.name === name);
          return { name, score: average(own), best: Math.max(...own.map((entry) => entry.percent)) };
        })
        .sort((a, b) => b.score - a.score)
      : [];
    const top = ranked.filter((entry) => entry.score === ranked[0].score).map((entry) => entry.name);
    const title = named
      ? `${top.map(esc).join(' & ')} ${top.length > 1 ? 'gewinnen' : 'gewinnt'}!`
      : VERDICTS.find((entry) => overall >= entry.min).text;
    const gallery = [...results].sort((a, b) => b.percent - a.percent).slice(0, GALLERY_MAX);

    root.innerHTML = `
      <section class="screen cm-end" data-leave-free>
        <div class="cm-end-ring" aria-hidden="true"><span>${overall}<small>%</small></span></div>
        <p class="eyebrow">${named ? 'Ø aller Runden' : 'Dein Durchschnitt'}</p>
        <h1 class="cm-end-title">${title}</h1>
        ${record ? '<p class="cm-record">Neuer Rekord</p>' : ''}
        ${!named && !record && storage.get(bestKey, 0) ? `<p class="cm-hint">Dein Rekord bei dieser Merkzeit: ${storage.get(bestKey, 0)} %</p>` : ''}
        ${named ? rankingList(ranked.map((entry) => ({ name: entry.name, value: `${entry.score} %`, note: `beste Runde ${entry.best} %` }))) : ''}
        <div class="cm-gallery-box">
          <p class="eyebrow">${gallery.length < results.length ? 'Die besten Treffer' : named ? 'Alle Treffer' : 'Deine Treffer'}</p>
          <div class="cm-gallery">
            ${gallery.map((entry, index) => `
              <span class="cm-swatch" style="--i: ${index}; --target: ${css(entry.target)}; --guess: ${css(entry.guess)}">
                <i></i>
                <b>${entry.percent} %</b>
              </span>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" type="button" data-action="again">Nochmal</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;

    if (overall >= 75) sound.great();
    else sound.good();
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

function hueGap(first, second) {
  const gap = Math.abs(first - second) % 360;
  return gap > 180 ? 360 - gap : gap;
}

// Kürzester Weg im Farbkreis, mit Vorzeichen
function signedHueStep(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function gaugeColor(percent) {
  return `hsl(${Math.round(percent * 1.3)}, 85%, 55%)`;
}

function createSounds(audio) {
  return {
    flood: () => {
      audio.noise({ duration: 0.45, volume: 0.22, cutoff: 2600 });
      audio.tone({ freq: 220, slideTo: 880, duration: 0.45, type: 'sine', volume: 0.14 });
    },
    tick: (left) => audio.tone({ freq: left <= 1 ? 1320 : 990, duration: 0.05, type: 'square', volume: 0.07 }),
    scramble: () => {
      for (let i = 0; i < 7; i++) {
        audio.tone({ freq: 400 + Math.random() * 1200, duration: 0.05, type: 'square', volume: 0.06, delay: i * 0.06 });
      }
    },
    collapse: () => audio.tone({ freq: 900, slideTo: 90, duration: 0.36, type: 'sine', volume: 0.18 }),
    slide: (ratio) => audio.tone({ freq: 300 + ratio * 900, duration: 0.025, type: 'triangle', volume: 0.05 }),
    lock: () => audio.tone({ freq: 520, slideTo: 780, duration: 0.14, type: 'triangle', volume: 0.16 }),
    collide: () => {
      audio.noise({ duration: 0.12, volume: 0.4, cutoff: 1400 });
      audio.tone({ freq: 130, slideTo: 60, duration: 0.2, type: 'sine', volume: 0.4 });
    },
    count: (value) => audio.tone({ freq: 340 + value * 9, duration: 0.03, type: 'square', volume: 0.05 }),
    great: () => {
      [523, 659, 784, 1047].forEach((freq, index) => audio.tone({ freq, duration: 0.3, type: 'triangle', volume: 0.15, delay: index * 0.08 }));
    },
    good: () => {
      [523, 659].forEach((freq, index) => audio.tone({ freq, duration: 0.22, type: 'triangle', volume: 0.14, delay: index * 0.1 }));
    },
    bad: () => audio.tone({ freq: 240, slideTo: 110, duration: 0.45, type: 'sawtooth', volume: 0.11 }),
  };
}
