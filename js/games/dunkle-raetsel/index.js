import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, toggleList } from '../../core/ui.js';
import categories from './cases.js';

const DEFAULT_CATEGORIES = ['mord', 'krimi', 'makaber', 'grusel'];
const SELECTION_KEY = 'case-categories'; // neu benannt, damit „Mordfälle“ auch bei alter Auswahl dabei ist
const LIMITS = ['15', '25', 'ohne']; // Fragen, bis die Kerze erlischt

// Ab so vielen Namen leitet reihum jemand anderes den Fall, und es gibt Punkte
const NAMED_MIN_PLAYERS = 2;

const MAX_POINTS = 3;     // ohne Tipp; jeder Tipp kostet einen Punkt
const HINT_COST = 2;      // ein Tipp verbrennt so viele Fragen
const LOW_CANDLE = 3;     // ab hier schlägt das Herz
const TYPE_MS = 18;       // Schreibmaschine: ms pro Zeichen
const OPEN_MS = 950;      // Siegel bricht, Akte klappt auf
const STORM_MS = 1200;    // Blitz und Donner vor der Auflösung

const ANSWERS = {
  ja: { label: 'Ja', stamp: 'JA' },
  nein: { label: 'Nein', stamp: 'NEIN' },
  egal: { label: 'Egal', stamp: 'EGAL' },
};

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="27" fill="#1b1622"/>
    <path d="M42 12a23 23 0 1 0 0 40 19 19 0 0 1 0-40Z" fill="#ffc65c"/>
    <path d="M36 24c1-6 13-6 13 2 0 6-7 6-7 11M42 44v1" fill="none" stroke="#ff5d5d" stroke-width="4.5" stroke-linecap="round"/>
  </svg>`;

// Startbild: Gewitternacht – Wolken ziehen am Mond vorbei, im Fenster flackert Licht, Fledermäuse, ab und zu ein Blitz
const HERO = `
  <div class="dr-hero" aria-hidden="true">
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#151026"/>
          <stop offset="1" stop-color="#2c1e3f"/>
        </linearGradient>
        <radialGradient id="dr-glow">
          <stop offset="0" stop-color="#ffe9b0" stop-opacity=".55"/>
          <stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#dr-sky)"/>
      <g class="dr-stars" fill="#fff">
        <circle cx="30" cy="24" r="1.2"/><circle cx="70" cy="44" r="1"/><circle cx="118" cy="18" r="1.3"/>
        <circle cx="150" cy="52" r="1"/><circle cx="256" cy="26" r="1.2"/><circle cx="240" cy="70" r="1"/>
      </g>
      <circle cx="200" cy="54" r="58" fill="url(#dr-glow)" class="dr-moon-glow"/>
      <circle cx="200" cy="54" r="27" fill="#ffe9b0"/>
      <circle cx="191" cy="46" r="5" fill="#f1d48d"/><circle cx="208" cy="62" r="7" fill="#f1d48d"/>
      <g class="dr-cloud dr-cloud-1"><path d="M0 62a12 12 0 0 1 22-7 15 15 0 0 1 27 3 10 10 0 0 1 8 16H6A10 10 0 0 1 0 62Z" fill="#3a2d52"/></g>
      <g class="dr-cloud dr-cloud-2"><path d="M0 34a9 9 0 0 1 16-5 11 11 0 0 1 20 2 8 8 0 0 1 6 12H4a8 8 0 0 1-4-9Z" fill="#46385f"/></g>
      <path class="dr-bat dr-bat-1" d="M0 4c3-4 6-4 8-1 1-2 3-2 4 0 2-3 5-3 8 1-3-1-5 0-6 2-1-1-3-1-4 0-1-2-3-3-6-2 Z" fill="#0b0814"/>
      <path class="dr-bat dr-bat-2" d="M0 4c3-4 6-4 8-1 1-2 3-2 4 0 2-3 5-3 8 1-3-1-5 0-6 2-1-1-3-1-4 0-1-2-3-3-6-2 Z" fill="#0b0814"/>
      <path d="M0 160v-34c36-14 70-18 108-10 38 7 62 2 96-8 30-9 56-8 76 0v52Z" fill="#0b0814"/>
      <path d="M58 122V88h-7l27-28 27 28h-7v34Z" fill="#0b0814"/>
      <rect x="88" y="62" width="7" height="16" fill="#0b0814"/>
      <rect class="dr-window" x="66" y="92" width="11" height="14" rx="1" fill="#ffc65c"/>
      <rect class="dr-window dr-window-2" x="82" y="92" width="11" height="14" rx="1" fill="#ffc65c"/>
      <path d="M232 112c-2-16-2-26-8-40M228 92c-8-6-12-8-16-16M226 80c6-6 8-10 8-18M224 72c-4-6-4-10-2-14" fill="none" stroke="#0b0814" stroke-width="3.2" stroke-linecap="round"/>
      <path class="dr-raven" d="M210 76c3-3 7-4 10-2l5-1-3 3c0 4-3 7-7 7l-5 3 2-4c-2-1-2-4-2-6Z" fill="#0b0814"/>
      <rect class="dr-lightning" width="280" height="160" fill="#fff"/>
    </svg>
  </div>`;

// Wachssiegel: unregelmäßig zerlaufenes Wachs mit eingeprägtem Dolch.
// Beide Bruchhälften zeichnen dasselbe Siegel, jede zeigt per clip-path nur ihre Seite.
// Die Prägung liegt doppelt übereinander: dunkel und leicht versetzt hell, das wirkt eingedrückt.
const SEAL_EMBLEM = `
  <circle class="dr-wax-ring" cx="80" cy="80" r="50"/>
  <circle class="dr-wax-ring is-thin" cx="80" cy="80" r="43"/>
  <path class="dr-wax-crest" d="M80 41a5 5 0 0 1 3 9v13h17a3 3 0 0 1 0 6H85v2l-1.5 33L80 117l-3.5-13L75 71v-2H60a3 3 0 0 1 0-6h17V50a5 5 0 0 1 3-9Z"/>`;

const SEAL_ART = `
  <svg viewBox="0 0 160 160">
    <defs>
      <radialGradient id="dr-wax" cx=".36" cy=".3" r=".8">
        <stop offset="0" stop-color="#e2494d"/>
        <stop offset=".5" stop-color="#ab1b21"/>
        <stop offset="1" stop-color="#6f0b10"/>
      </radialGradient>
    </defs>
    <path class="dr-wax-edge" d="M82 7c11-3 19 3 29 7 10 5 22 6 28 16 5 9 2 19 7 29 5 11 12 20 8 31-3 10-14 14-19 24-5 9-4 21-13 27-10 7-21 2-32 5-11 2-20 11-31 8-11-2-16-13-25-19-9-7-22-9-27-20-4-10 3-20 2-31-1-10-9-20-5-30 3-11 16-13 24-21 7-8 9-20 19-25 10-6 24 2 35-1Z"/>
    <path fill="url(#dr-wax)" d="M81 15c10-2 17 3 26 7 9 3 19 5 24 13 5 9 2 17 6 26 5 10 10 18 7 28-3 9-13 13-17 22-5 9-4 19-12 24-9 6-19 2-29 4-10 3-18 10-28 8-10-3-14-12-23-18-8-6-19-8-23-18-4-9 3-18 2-28-1-9-8-18-4-27 4-10 14-12 21-19 7-8 8-18 17-23 10-5 22 3 33 1Z"/>
    <path class="dr-wax-shine" d="M34 56c8-16 24-27 42-29"/>
    <g class="dr-wax-light" transform="translate(0 1.6)">${SEAL_EMBLEM}</g>
    <g class="dr-wax-deep">${SEAL_EMBLEM}</g>
  </svg>`;

const SEAL_CRUMBS = [[-62, -30], [-38, 58], [-14, -66], [24, 70], [52, -40], [70, 24]]
  .map(([x, y], index) => `<i class="dr-seal-crumb" style="--dx: ${x}px; --dy: ${y}px; --i: ${index}"></i>`)
  .join('');

const SEAL = `
  <span class="dr-seal" aria-hidden="true">
    <span class="dr-seal-glow"></span>
    <span class="dr-seal-half is-left">${SEAL_ART}</span>
    <span class="dr-seal-half is-right">${SEAL_ART}</span>
    ${SEAL_CRUMBS}
  </span>`;

export default {
  id: 'dunkle-raetsel',
  title: 'Black Stories',
  tagline: 'Eine rätselhafte Geschichte, nur Ja/Nein-Fragen – und die Kerze brennt herunter.',
  tags: ['ab 2 Spielern', 'Namen optional'],
  accent: '#c0392b',
  icon: ICON,
  styles: new URL('./dunkle-raetsel.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  // Das Spiel läuft immer im dunklen Design, sonst geht die Stimmung verloren
  const html = document.documentElement;
  const previousTheme = html.dataset.theme;
  html.dataset.theme = 'dark';
  ctx.onCleanup(() => {
    if (previousTheme) html.dataset.theme = previousTheme;
    else delete html.dataset.theme;
  });

  let selected = loadSelection();
  let limit = LIMITS.includes(storage.get('limit')) ? storage.get('limit') : '25';
  let players = ctx.players.get();

  let named = false;
  let scores = new Map();
  let deck = [];
  let caseNumber = 0;
  let solved = 0;
  let played = 0;
  let turn = 0;        // wer den Fall leitet (Index in players)
  let current = null;  // { key, title, story, solution, hints }
  let asked = 0;       // gestellte Fragen
  let burned = 0;      // verbrannte Fragen (gestellt + Tipps)
  let tally = { ja: 0, nein: 0, egal: 0 };
  let hintsUsed = 0;
  let busy = false;
  let stopTyping = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get(SELECTION_KEY);
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function maxQuestions() {
    return limit === 'ohne' ? Infinity : Number(limit);
  }

  function master() {
    return named ? players[turn % players.length] : null;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endTyping();
    busy = false;
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: `${category.emoji}\u00a0${category.label}`,
      hint: `${category.hint} · ${category.cases.length} Fälle`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="dr-intro">
          ${HERO}
          <h1 class="dr-title">Black Stories</h1>
          <p class="dr-lede">Eine Geschichte, die keinen Sinn ergibt. Nur Ja/Nein-Fragen führen zur Wahrheit.</p>
        </div>`,
      cards: [
        {
          icon: '🗂️',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options, values: selected }),
        },
        {
          icon: '🕯️',
          title: 'Kerze',
          body: setupRow({
            label: 'Fragen pro Fall',
            control: segmented({ name: 'limit', label: 'Fragen pro Fall', options: LIMITS.map((value) => ({ value, label: value === 'ohne' ? 'Ohne Limit' : value })), value: limit }),
          }),
          note: 'Jede Frage brennt die Kerze herunter. Erlischt sie, bleibt der Fall ungelöst.',
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="dr-players-hint"></span>',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">Fall öffnen</button>',
    });

    const hint = $('.dr-players-hint', root);
    const updateHint = () => {
      hint.textContent = players.length >= NAMED_MIN_PLAYERS
        ? `Reihum leitet jemand den Fall. Wer ihn löst, bekommt bis zu ${MAX_POINTS} Punkte.`
        : 'Mit Namen leitet reihum jemand den Fall, und es gibt Punkte.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set(SELECTION_KEY, values);
    });
    bindSegmented(root, 'limit', (value) => {
      limit = value;
      storage.set('limit', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        updateHint();
      },
    });
    updateHint();
    $('[data-action="start"]', root).addEventListener('click', startGame);
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    scores = new Map(players.map((name) => [name, 0]));
    deck = [];
    caseNumber = 0;
    solved = 0;
    played = 0;
    turn = 0;
    nextCase();
  }

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => categories[key].cases.map((entry) => ({ ...entry, key }))));
    }
    return deck.pop();
  }

  // ---------- Akte mit Siegel ----------

  function nextCase() {
    endTyping();
    busy = false;
    current = draw();
    caseNumber += 1;
    asked = 0;
    burned = 0;
    tally = { ja: 0, nein: 0, egal: 0 };
    hintsUsed = 0;
    const name = master();

    root.innerHTML = `
      <section class="screen dr-case">
        <div class="dr-case-head">
          <p class="eyebrow">Fall ${caseNumber}</p>
          <h1 class="dr-who">${name ? `${esc(name)} leitet den Fall` : 'Wer leitet den Fall?'}</h1>
          <p class="dr-lede">${name ? `Gib ${esc(name)} das Handy.` : 'Eine Person nimmt das Handy und liest vor.'}</p>
        </div>
        <button class="dr-file" type="button" data-action="open" aria-label="Akte öffnen">
          <span class="dr-file-tab">Akte ${String(caseNumber).padStart(3, '0')}</span>
          <span class="dr-file-stamp">Streng geheim</span>
          <span class="dr-file-cat">${esc(categories[current.key].label)}</span>
          ${SEAL}
          <span class="dr-file-tap">Siegel brechen</span>
        </button>
        <div class="dr-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    $('[data-action="open"]', root).addEventListener('click', openFile);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
  }

  function openFile() {
    if (busy) return;
    sound.seal();
    vibrate(25);
    if (fx.reducedMotion()) {
      showStory();
      return;
    }
    busy = true;
    $('.dr-file', root).classList.add('is-open');
    ctx.timeout(() => {
      busy = false;
      showStory();
    }, OPEN_MS);
  }

  // ---------- Geschichte vorlesen ----------

  function showStory() {
    const category = categories[current.key];
    root.innerHTML = `
      <section class="screen dr-story">
        <div class="dr-paper">
          <div class="dr-paper-head">
            <span class="chip dr-chip">${category.emoji} ${esc(category.label)}</span>
            <span class="dr-paper-no">Fall ${caseNumber}</span>
          </div>
          <h2 class="dr-paper-title">${esc(current.title)}</h2>
          <p class="dr-paper-text" aria-label="${esc(current.story)}"><span class="dr-typed"></span><i class="dr-caret" aria-hidden="true"></i></p>
        </div>
        <p class="dr-small dr-center">Laut vorlesen. Die Lösung sieht nur, wer den Fall leitet.</p>
        <div class="dr-actions">
          <button class="btn btn-ghost" type="button" data-action="peek">🔦 Lösung heimlich ansehen</button>
          <button class="btn btn-primary" type="button" data-action="ask">Fragen beginnen</button>
          <button class="btn-link" type="button" data-action="other">Anderer Fall</button>
        </div>
      </section>`;

    typeStory($('.dr-typed', root));
    $('.dr-paper', root).addEventListener('click', finishTyping);
    $('[data-action="peek"]', root).addEventListener('click', showFlashlight);
    $('[data-action="ask"]', root).addEventListener('click', showQuestions);
    $('[data-action="other"]', root).addEventListener('click', () => {
      caseNumber -= 1;
      nextCase();
    });
  }

  // Schreibmaschine: Zeichen für Zeichen; Antippen zeigt sofort den ganzen Text
  function typeStory(target) {
    const text = current.story;
    if (fx.reducedMotion()) {
      target.textContent = text;
      return;
    }
    let index = 0;
    const id = ctx.interval(() => {
      index += 1;
      target.textContent = text.slice(0, index);
      if (text[index - 1] !== ' ' && index % 2) sound.key();
      if (index >= text.length) finishTyping();
    }, TYPE_MS);
    stopTyping = () => {
      ctx.clearInterval(id);
      target.textContent = text;
    };
  }

  function finishTyping() {
    stopTyping?.();
    stopTyping = null;
    $('.dr-caret', root)?.classList.add('is-done');
  }

  function endTyping() {
    stopTyping?.();
    stopTyping = null;
  }

  // ---------- Taschenlampe: Lösung wird nur im Lichtkegel unter dem Finger sichtbar ----------

  function showFlashlight() {
    finishTyping();
    sound.click();
    const overlay = document.createElement('div');
    overlay.className = 'dr-torch';
    overlay.innerHTML = `
      <p class="dr-torch-hint">Finger über das Dunkel bewegen</p>
      <div class="dr-torch-paper">
        <p class="eyebrow">Die Lösung</p>
        <p class="dr-torch-text">${esc(current.solution)}</p>
      </div>
      <button class="btn btn-ghost" type="button" data-action="close-torch">Lampe aus</button>`;
    root.append(overlay);

    const paper = $('.dr-torch-paper', overlay);
    const moveLight = (event) => {
      const box = paper.getBoundingClientRect();
      paper.style.setProperty('--x', `${event.clientX - box.left}px`);
      paper.style.setProperty('--y', `${event.clientY - box.top}px`);
    };
    overlay.addEventListener('pointerdown', moveLight);
    overlay.addEventListener('pointermove', moveLight);
    // Ohne Bewegung (Maus, „Bewegung reduzieren“) zumindest in der Mitte starten
    paper.style.setProperty('--x', '50%');
    paper.style.setProperty('--y', '50%');
    if (fx.reducedMotion()) paper.classList.add('is-lit');

    $('[data-action="close-torch"]', overlay).addEventListener('click', () => {
      sound.click();
      overlay.remove();
    });
  }

  // ---------- Fragen: die Kerze brennt herunter ----------

  function questionsLeft() {
    return Math.max(0, maxQuestions() - burned);
  }

  function candleLevel() {
    if (limit === 'ohne') return Math.max(0.25, 1 - burned / 60); // ohne Limit wird sie nur langsam kürzer
    return questionsLeft() / maxQuestions();
  }

  function leftLabel() {
    if (limit === 'ohne') return `${asked} ${asked === 1 ? 'Frage' : 'Fragen'} gestellt`;
    const left = questionsLeft();
    return `Noch ${left} ${left === 1 ? 'Frage' : 'Fragen'}`;
  }

  function showQuestions() {
    endTyping();
    root.innerHTML = `
      <section class="screen dr-ask">
        <div class="dr-ask-head">
          <p class="eyebrow">${esc(current.title)}</p>
          <p class="dr-left" aria-live="polite">${leftLabel()}</p>
        </div>
        <div class="dr-candle" style="--level: ${candleLevel()}" aria-hidden="true">
          <span class="dr-halo"></span>
          <span class="dr-stick">
            <span class="dr-flame"><i></i></span>
            <span class="dr-wick"></span>
            <span class="dr-drip"></span>
          </span>
          <span class="dr-holder"></span>
        </div>
        <div class="dr-tally" aria-live="polite">
          ${Object.entries(ANSWERS).map(([key, answer]) => `<span class="dr-count dr-count-${key}">${answer.label} <b data-tally="${key}">${tally[key]}</b></span>`).join('')}
        </div>
        <ul class="dr-hints"></ul>
        <div class="dr-answers" role="group" aria-label="Antwort auf die Frage">
          ${Object.entries(ANSWERS).map(([key, answer]) => `<button class="dr-answer dr-answer-${key}" type="button" data-answer="${key}">${answer.label}</button>`).join('')}
        </div>
        <div class="dr-actions">
          <button class="btn btn-primary" type="button" data-action="solved">Gelöst!</button>
          <div class="dr-row">
            <button class="btn btn-ghost" type="button" data-action="hint">💡 Tipp${limit === 'ohne' ? '' : ` −${HINT_COST}`}</button>
            <button class="btn btn-ghost" type="button" data-action="story">📜 Fall</button>
            <button class="btn btn-ghost" type="button" data-action="peek">🔦 Lösung</button>
          </div>
          <p class="dr-small dr-center">🔦 Die Lösung ist nur für die Person, die den Fall leitet.</p>
          <button class="btn-link" type="button" data-action="give-up">Aufgeben</button>
        </div>
      </section>`;

    for (const button of root.querySelectorAll('[data-answer]')) {
      button.addEventListener('click', () => answer(button));
    }
    $('[data-action="solved"]', root).addEventListener('click', () => storm('solved'));
    $('[data-action="give-up"]', root).addEventListener('click', () => storm('given-up'));
    $('[data-action="hint"]', root).addEventListener('click', giveHint);
    $('[data-action="story"]', root).addEventListener('click', showStoryNote);
    $('[data-action="peek"]', root).addEventListener('click', showFlashlight);
    renderHints();
    updateHintButton();
    if (!fx.reducedMotion()) {
      $('.dr-flame', root).animate([{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: 0.6 }, { transform: 'none' }], { duration: 600 });
    }
    sound.match();
  }

  function answer(button) {
    if (busy) return;
    const key = button.dataset.answer;
    asked += 1;
    burned += 1;
    tally[key] += 1;
    sound.answer(key);
    vibrate(10);
    flyStamp(button, ANSWERS[key].stamp, key);
    updateCandle();
  }

  function flyStamp(button, text, key) {
    if (fx.reducedMotion()) return;
    const stamp = document.createElement('span');
    stamp.className = `dr-stamp dr-stamp-${key}`;
    stamp.textContent = text;
    button.append(stamp);
    stamp.animate(
      [
        { opacity: 0, transform: 'translate(-50%, 0) rotate(-14deg) scale(.6)' },
        { opacity: 1, transform: 'translate(-50%, -46px) rotate(-8deg) scale(1.25)', offset: 0.3 },
        { opacity: 0, transform: 'translate(-50%, -110px) rotate(4deg) scale(.9)' },
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => stamp.remove();
  }

  function updateCandle() {
    const candle = $('.dr-candle', root);
    candle.style.setProperty('--level', String(candleLevel()));
    $('.dr-left', root).textContent = leftLabel();
    for (const key of Object.keys(ANSWERS)) {
      $(`[data-tally="${key}"]`, root).textContent = String(tally[key]);
    }
    const left = questionsLeft();
    const low = left <= LOW_CANDLE;
    candle.classList.toggle('is-low', low);
    if (low && left > 0) sound.heartbeat();
    if (!fx.reducedMotion()) {
      $('.dr-drip', root).animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(46px)', opacity: 0 }], { duration: 800, easing: 'ease-in' });
    }
    if (left <= 0) blowOut();
  }

  // Kerze erlischt: Rauch steigt auf, dann die Auflösung
  function blowOut() {
    busy = true;
    sound.blowOut();
    const candle = $('.dr-candle', root);
    candle.classList.add('is-out');
    if (!fx.reducedMotion()) {
      for (let i = 0; i < 5; i++) {
        const puff = document.createElement('span');
        puff.className = 'dr-smoke';
        puff.style.setProperty('--i', String(i));
        $('.dr-stick', candle).append(puff);
      }
    }
    ctx.timeout(() => {
      busy = false;
      storm('out');
    }, fx.reducedMotion() ? 0 : 1500);
  }

  function giveHint() {
    if (busy || hintsUsed >= current.hints.length) return;
    hintsUsed += 1;
    if (limit !== 'ohne') burned += HINT_COST;
    sound.hint();
    vibrate(15);
    renderHints(true);
    updateHintButton();
    updateCandle();
  }

  function renderHints(animateLast = false) {
    const list = $('.dr-hints', root);
    list.innerHTML = current.hints.slice(0, hintsUsed).map((hint) => `<li>💡 ${esc(hint)}</li>`).join('');
    if (animateLast && !fx.reducedMotion()) {
      list.lastElementChild?.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
    }
  }

  function updateHintButton() {
    const button = $('[data-action="hint"]', root);
    if (hintsUsed >= current.hints.length) {
      button.textContent = 'Keine Tipps';
      button.disabled = true;
    }
  }

  // Geschichte zum Nachlesen während der Fragerunde
  function showStoryNote() {
    sound.click();
    const overlay = document.createElement('div');
    overlay.className = 'dr-note';
    overlay.innerHTML = `
      <div class="dr-paper">
        <h2 class="dr-paper-title">${esc(current.title)}</h2>
        <p class="dr-paper-text">${esc(current.story)}</p>
      </div>
      <button class="btn btn-ghost" type="button" data-action="close-note">Schließen</button>`;
    root.append(overlay);
    $('[data-action="close-note"]', overlay).addEventListener('click', () => {
      sound.click();
      overlay.remove();
    });
  }

  // ---------- Auflösung: Blitz, Donner, Stempel ----------

  function storm(outcome) {
    if (busy) return;
    if (fx.reducedMotion()) {
      showReveal(outcome);
      return;
    }
    busy = true;
    sound.thunder();
    vibrate([0, 60, 40, 120]);
    const flash = document.createElement('div');
    flash.className = 'dr-storm';
    $('.dr-ask', root).append(flash);
    ctx.timeout(() => {
      busy = false;
      showReveal(outcome);
    }, STORM_MS);
  }

  function showReveal(outcome) {
    played += 1;
    const success = outcome === 'solved';
    if (success) solved += 1;
    const name = master();
    const points = Math.max(1, MAX_POINTS - hintsUsed);
    const others = named ? players.filter((player) => player !== name) : [];
    const heading = { solved: 'Fall gelöst', 'given-up': 'Aufgegeben', out: 'Die Kerze ist erloschen' }[outcome];

    // Bleibt der Fall ungelöst, gewinnt die Person, die ihn geleitet hat
    if (!success && named) scores.set(name, (scores.get(name) ?? 0) + 1);

    const words = current.solution.split(' ').map((word, index) => `<span class="dr-word" style="--i: ${index}">${esc(word)}</span>`).join(' ');
    root.innerHTML = `
      <section class="screen dr-reveal ${success ? 'is-solved' : 'is-unsolved'}">
        <p class="eyebrow">${esc(current.title)} · ${asked} ${asked === 1 ? 'Frage' : 'Fragen'}</p>
        <div class="dr-verdict">
          <p class="dr-verdict-title">${heading}</p>
          <span class="dr-rubber">${success ? 'Gelöst' : 'Ungelöst'}</span>
        </div>
        <div class="dr-paper dr-solution">
          <p class="eyebrow">Was wirklich geschah</p>
          <p class="dr-solution-text">${words}</p>
        </div>
        ${!success && named ? `<p class="dr-small dr-center">+1 Punkt für ${esc(name)}, der Fall blieb ungelöst.</p>` : ''}
        ${success && named ? `
          <div class="dr-award">
            <p class="eyebrow">Wer hat's gelöst? <b>+${points}</b></p>
            <div class="dr-award-buttons">
              ${others.map((player, index) => `<button class="dr-award-btn" type="button" data-player="${esc(player)}" style="--i: ${index}">${esc(player)}</button>`).join('')}
            </div>
          </div>` : ''}
        <div class="dr-actions">
          ${success && named ? '<button class="btn-link" type="button" data-action="next">Ohne Punkte weiter</button>' : '<button class="btn btn-primary" type="button" data-action="next">Nächster Fall</button>'}
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    if (success) {
      sound.solved();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
    } else {
      sound.unsolved();
      fx.shake();
    }

    $('[data-action="next"]', root).addEventListener('click', advance);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
    for (const button of root.querySelectorAll('[data-player]')) {
      button.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        const player = button.dataset.player;
        scores.set(player, (scores.get(player) ?? 0) + points);
        sound.point();
        button.classList.add('is-picked');
        fx.toast(`+${points} für ${player}`);
        ctx.timeout(() => {
          busy = false;
          advance();
        }, fx.reducedMotion() ? 0 : 500);
      });
    }
  }

  function advance() {
    if (named) turn += 1;
    nextCase();
  }

  // ---------- Spielende ----------

  function showEnd() {
    endTyping();
    if (!played) {
      showSetup();
      return;
    }
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0]?.[1] ?? 0;
    const winners = ranked.filter(([, points]) => points === best && best > 0).map(([name]) => name);
    const title = named && winners.length
      ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!`
      : `${solved} von ${played} gelöst`;
    if (solved) sound.solved();

    root.innerHTML = `
      <section class="screen dr-end" data-leave-free>
        <span class="dr-end-icon" aria-hidden="true">🕯️</span>
        <p class="eyebrow">${played} ${played === 1 ? 'Fall' : 'Fälle'} · ${solved} gelöst</p>
        <p class="dr-end-title">${title}</p>
        ${named ? rankingList(ranked.map(([name, value]) => ({ name, value }))) : ''}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

// Düstere Klänge: Siegel, Schreibmaschine, Streichholz, Donner, Herzschlag
function createSounds(audio) {
  return {
    seal: () => {
      audio.noise({ duration: 0.09, volume: 0.45, cutoff: 3000 });
      audio.noise({ duration: 0.3, volume: 0.2, cutoff: 1200, delay: 0.5 });
    },
    key: () => audio.noise({ duration: 0.02, volume: 0.1, cutoff: 5000 }),
    click: () => audio.tone({ freq: 1400, duration: 0.03, type: 'square', volume: 0.06 }),
    match: () => {
      audio.noise({ duration: 0.2, volume: 0.25, cutoff: 6000 });
      audio.noise({ duration: 0.5, volume: 0.1, cutoff: 1500, delay: 0.15 });
    },
    answer: (key) => {
      const freq = { ja: 660, nein: 220, egal: 440 }[key];
      audio.tone({ freq, slideTo: freq * (key === 'nein' ? 0.8 : 1.15), duration: 0.14, type: 'triangle', volume: 0.16 });
    },
    hint: () => {
      [1047, 1319].forEach((freq, index) => audio.tone({ freq, duration: 0.16, type: 'sine', volume: 0.1, delay: index * 0.07 }));
    },
    heartbeat: () => {
      audio.tone({ freq: 62, slideTo: 40, duration: 0.14, type: 'sine', volume: 0.45 });
      audio.tone({ freq: 58, slideTo: 38, duration: 0.12, type: 'sine', volume: 0.32, delay: 0.17 });
    },
    blowOut: () => audio.noise({ duration: 0.7, volume: 0.28, cutoff: 1800 }),
    thunder: () => {
      audio.noise({ duration: 0.12, volume: 0.7, cutoff: 8000 });
      audio.noise({ duration: 1.8, volume: 0.8, cutoff: 500, delay: 0.1 });
      audio.tone({ freq: 70, slideTo: 32, duration: 1.6, type: 'sine', volume: 0.5, delay: 0.1 });
    },
    solved: () => {
      [392, 494, 587, 784].forEach((freq, index) => audio.tone({ freq, duration: 0.4, type: 'triangle', volume: 0.13, delay: index * 0.1 }));
    },
    unsolved: () => {
      [220, 208, 196, 147].forEach((freq, index) => audio.tone({ freq, duration: 0.5, type: 'sawtooth', volume: 0.07, delay: index * 0.2 }));
    },
    point: () => {
      audio.tone({ freq: 880, duration: 0.08, type: 'square', volume: 0.07 });
      audio.tone({ freq: 1320, duration: 0.16, type: 'square', volume: 0.07, delay: 0.08 });
    },
  };
}
