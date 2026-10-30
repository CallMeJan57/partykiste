import { $, esc } from '../../core/dom.js';
import { pick, shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindToggleList, playerEditor, setupScreen, toggleList } from '../../core/ui.js';
import prompts from './prompts.js';

// Kategorien: Bezeichnung, kurze Beschreibung und Schlucke, wenn man kneift.
const CATEGORIES = {
  locker: { label: 'Locker', hint: 'Harmlos, für jede Runde', sips: 1 },
  frech: { label: 'Frech', hint: 'Peinlich ehrlich und ein bisschen gemein', sips: 2 },
  pikant: { label: 'Pikant', hint: 'Flirts, Dates und Schwärmereien', sips: 3 },
};

const TYPES = {
  wahrheit: { label: 'Wahrheit', hint: 'ehrlich antworten', done: 'Beantwortet', glyph: '?' },
  pflicht: { label: 'Pflicht', hint: 'Aufgabe erledigen', done: 'Erledigt', glyph: '!' },
};

// Zufalls-Roulette: so oft springt die Auswahl hin und her, immer langsamer
const ROULETTE_STEPS = 14;
const ROULETTE_FIRST_MS = 70;
const ROULETTE_LAST_MS = 360;
// So lange bleibt der Stempel auf der Karte, bevor es weitergeht
const STAMP_MS = 950;

const DEFAULT_SELECTION = ['locker', 'frech'];

// Ab so vielen Namen sagt das Spiel, wer dran ist. Darunter wird ohne Namen gespielt.
const NAMED_MIN_PLAYERS = 2;

// Ersatz für {spieler}, wenn ohne Namen gespielt wird (siehe prompts.js).
const NO_NAME_PARTNER = { default: 'dein Gegenüber', dativ: 'deinem Gegenüber' };

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M32 8a24 24 0 0 0 0 48Z" fill="#3d8bff"/>
    <path d="M32 8a24 24 0 0 1 0 48Z" fill="#ff4f7b"/>
    <path d="M17.5 26.5a5.5 5.5 0 1 1 8.2 4.8c-1.6.9-2.2 1.8-2.2 3.4v1.3" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="23.5" cy="42" r="2.1" fill="#fff"/>
    <path d="M42 20.5v15" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="42" cy="42" r="2.2" fill="#fff"/>
  </svg>`;

// Startbild: zwei Karten, blau „?“ für Wahrheit und pink „!“ für Pflicht – abwechselnd hebt sich eine
const HERO = `
  <div class="wp-hero" aria-hidden="true">
    <span class="wp-hero-card wp-hero-wahrheit"><b>?</b><small>Wahrheit</small></span>
    <span class="wp-hero-card wp-hero-pflicht"><b>!</b><small>Pflicht</small></span>
  </div>`;

export default {
  id: 'wahrheit-pflicht',
  title: 'Wahrheit oder Pflicht',
  tagline: 'Ehrlich antworten oder Aufgabe erledigen – wer kneift, trinkt.',
  tags: ['ab 2 Spielern', 'Namen optional'],
  accent: '#ff4f7b',
  icon: ICON,
  styles: new URL('./wahrheit-pflicht.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let players = ctx.players.get();
  let selected = loadSelection();
  let decks = { wahrheit: [], pflicht: [] };
  let named = false; // true = mit Namen, wer dran ist
  let turn = 0;
  let round = 1;
  let cardNumber = 1;
  let sipsByPlayer = new Map();
  let timer = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in CATEGORIES) : [];
    return valid.length ? valid : DEFAULT_SELECTION;
  }

  function sipsLabel(count) {
    return count === 1 ? '1 Schluck' : `${count} Schlucke`;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    stopTimer();
    const options = Object.entries(CATEGORIES).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · kneifen: ${sipsLabel(category.sips)}`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="wp-intro">
          ${HERO}
          <h1 class="wp-title"><span class="wp-word-wahrheit">Wahrheit</span><br>oder <span class="wp-word-pflicht">Pflicht</span></h1>
          <p class="wp-lede">Ehrlich antworten oder Aufgabe erledigen – wer kneift, trinkt.</p>
        </div>`,
      cards: [
        {
          icon: '🎲',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="wp-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Trinken ist kein Muss – Wasser oder Saft zählen genauso.',
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.wp-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? ''
        : players.length === 1
          ? 'Ab zwei Namen sagt das Spiel, wer dran ist – sonst geht es ohne Namen.'
          : 'Mit Namen sagt das Spiel, wer dran ist. Für eine schnelle Runde einfach ohne starten.';
    };

    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        updateStart();
      },
    });
    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    startButton.addEventListener('click', startGame);
    updateStart();
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    decks = { wahrheit: [], pflicht: [] };
    turn = 0;
    round = 1;
    cardNumber = 1;
    sipsByPlayer = new Map(players.map((player) => [player, 0]));
    showTurn();
  }

  // ---------- Wer ist dran? ----------

  function showTurn() {
    stopTimer();
    const drunk = named ? players.filter((name) => sipsByPlayer.get(name) > 0) : [];
    const tally = drunk.length
      ? `<div class="wp-tally">
           <p class="eyebrow">Getrunken</p>
           <ul class="chips">${drunk.map((name) => `<li class="chip">${esc(name)} · ${sipsByPlayer.get(name)}</li>`).join('')}</ul>
         </div>`
      : '';
    const head = named
      ? `<p class="eyebrow">Runde ${round} · am Zug</p>
         <h1 class="wp-name">${letters(players[turn])}</h1>`
      : `<p class="eyebrow">${cardNumber === 1 ? 'Wer fängt an?' : 'Handy weitergeben'} · Karte ${cardNumber}</p>
         <h1 class="wp-name">${letters('Du bist dran')}</h1>`;

    root.innerHTML = `
      <section class="screen wp-turn">
        <div class="wp-turn-head">
          <span class="wp-spotlight" aria-hidden="true"></span>
          ${head}
        </div>
        <div class="wp-choice">
          ${Object.entries(TYPES).map(([type, info]) => `
            <button class="wp-pick wp-pick-${type}" type="button" data-type="${type}">
              <span class="wp-pick-glyph" aria-hidden="true">${info.glyph}</span>
              <span class="wp-pick-label">${info.label}</span>
              <span class="wp-pick-hint">${info.hint}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn-ghost" type="button" data-action="random">Zufall entscheiden lassen</button>
        ${tally}
        <button class="btn-link" type="button" data-action="setup">Mitspieler &amp; Kategorien ändern</button>
      </section>`;

    for (const button of root.querySelectorAll('[data-type]')) {
      button.addEventListener('click', () => choose(button.dataset.type));
    }
    $('[data-action="random"]', root).addEventListener('click', roulette);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }

  // Text in Buchstaben bzw. Wörter zerlegen, die nacheinander hereinspringen
  function letters(text) {
    return [...text].map((char, i) => `<span class="wp-letter" style="--i: ${i}">${char === ' ' ? '&nbsp;' : esc(char)}</span>`).join('');
  }

  function locked() {
    return root.querySelector('.wp-choice.is-locked');
  }

  // Gewählte Seite wächst heran, die andere verblasst – dann kommt die Karte
  function choose(type) {
    if (locked()) return;
    const choice = $('.wp-choice', root);
    choice.classList.add('is-locked');
    for (const button of root.querySelectorAll('[data-action]')) button.disabled = true;
    audio.tone({ freq: type === 'wahrheit' ? 523 : 659, slideTo: type === 'wahrheit' ? 784 : 988, duration: 0.18, type: 'triangle', volume: 0.15 });
    vibrate(20);
    if (fx.reducedMotion()) {
      showCard(type);
      return;
    }
    const picked = $(`[data-type="${type}"]`, choice);
    const other = $(`[data-type]:not([data-type="${type}"])`, choice);
    other.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 260, fill: 'forwards' });
    picked.animate(
      [{ transform: 'none' }, { transform: 'scale(1.08)', offset: 0.4 }, { transform: 'scale(1.15)', opacity: 0 }],
      { duration: 420, easing: 'cubic-bezier(.3, .7, .3, 1)', fill: 'forwards' },
    ).finished.then(() => showCard(type), () => {});
  }

  // Zufall: Die Auswahl springt hin und her und wird immer langsamer
  function roulette() {
    if (locked()) return;
    const choice = $('.wp-choice', root);
    choice.classList.add('is-locked', 'is-spinning');
    for (const button of root.querySelectorAll('[data-action]')) button.disabled = true;
    const buttons = { wahrheit: $('[data-type="wahrheit"]', choice), pflicht: $('[data-type="pflicht"]', choice) };
    const result = Math.random() < 0.5 ? 'wahrheit' : 'pflicht';
    // Schrittzahl so wählen, dass der letzte Schritt auf dem Ergebnis landet
    const steps = ROULETTE_STEPS + (result === 'pflicht' ? 1 : 0);

    const step = (index) => {
      const type = index % 2 === 0 ? 'wahrheit' : 'pflicht';
      for (const [key, button] of Object.entries(buttons)) button.classList.toggle('is-lit', key === type);
      audio.tone({ freq: type === 'wahrheit' ? 880 : 1175, duration: 0.05, type: 'square', volume: 0.08 });
      vibrate(6);
      if (index >= steps - 1) {
        audio.sounds.success();
        vibrate([0, 40, 30, 60]);
        buttons[type].classList.add('is-winner');
        ctx.timeout(() => {
          choice.classList.remove('is-locked');
          choose(type);
        }, 650);
        return;
      }
      const progress = index / (steps - 1);
      ctx.timeout(() => step(index + 1), ROULETTE_FIRST_MS + (ROULETTE_LAST_MS - ROULETTE_FIRST_MS) * progress ** 2);
    };
    step(0);
  }

  // ---------- Karte ----------

  function draw(type) {
    if (!decks[type].length) {
      decks[type] = shuffle(selected.flatMap((key) => prompts[type][key].map((text) => ({ key, text }))));
    }
    return decks[type].pop();
  }

  function showCard(type) {
    stopTimer();
    audio.sounds.blip();
    const player = named ? players[turn] : null;
    const { key, text } = draw(type);
    const category = CATEGORIES[key];
    const partner = named ? pick(players.filter((name) => name !== player)) : null;
    const html = esc(text).replace(/\{spieler(?::(dativ))?\}/g, (_, grammaticalCase) => {
      const label = partner ?? NO_NAME_PARTNER[grammaticalCase ?? 'default'];
      return `<b>${esc(label)}</b>`;
    });
    const seconds = timerSeconds(text);

    root.innerHTML = `
      <section class="screen wp-card-screen wp-is-${type}">
        <div class="wp-card-head">
          <span class="chip wp-type-chip">${TYPES[type].label}</span>
          <span class="chip">${category.label}</span>
        </div>

        <div class="wp-flip">
          <div class="wp-flip-inner">
            <div class="wp-card">
              ${player ? `<p class="wp-card-name">${esc(player)}</p>` : ''}
              <p class="wp-card-text">${words(html)}</p>
              ${seconds ? `<button class="wp-timer" type="button" data-action="timer" data-seconds="${seconds}">Timer starten · ${seconds} s</button>` : ''}
            </div>
            <div class="wp-card-back" aria-hidden="true">
              <span class="wp-card-back-glyph">${TYPES[type].glyph}</span>
              <span class="wp-card-back-label">${TYPES[type].label}</span>
            </div>
          </div>
          <div class="wp-stamp" aria-live="assertive"></div>
        </div>

        <div class="wp-card-actions">
          <button class="btn btn-primary" type="button" data-action="done">${TYPES[type].done}</button>
          <button class="btn btn-ghost" type="button" data-action="drink">Lieber trinken · ${sipsLabel(category.sips)}</button>
        </div>
        <button class="btn-link" type="button" data-action="reroll">Andere Karte</button>
      </section>`;

    // Karte liegt verdeckt und dreht sich um
    const section = $('.wp-card-screen', root);
    if (!fx.reducedMotion()) {
      section.classList.add('is-flipping');
      audio.noise({ duration: 0.2, volume: 0.14, cutoff: 2200, delay: 0.25 });
      $('.wp-flip-inner', root).animate(
        [
          { transform: 'rotateY(180deg) translateY(30px) scale(.85)', offset: 0 },
          { transform: 'rotateY(180deg) translateY(0) scale(1)', offset: 0.35 },
          { transform: 'rotateY(-10deg) scale(1.03)', offset: 0.85 },
          { transform: 'rotateY(0) scale(1)' },
        ],
        { duration: 900, easing: 'cubic-bezier(.4, 0, .2, 1)' },
      ).finished.then(() => section.classList.remove('is-flipping'), () => {});
    }

    let finished = false;
    const finish = (stampClass, label, after) => {
      if (finished) return;
      finished = true;
      stopTimer();
      for (const button of section.querySelectorAll('button')) button.disabled = true;
      const stamp = $('.wp-stamp', root);
      stamp.className = `wp-stamp ${stampClass}`;
      stamp.textContent = label;
      audio.tone({ freq: 110, slideTo: 60, duration: 0.18, type: 'square', volume: 0.2 });
      audio.noise({ duration: 0.1, volume: 0.3, cutoff: 900 });
      after();
      ctx.timeout(nextTurn, fx.reducedMotion() ? 500 : STAMP_MS);
    };

    $('[data-action="timer"]', root)?.addEventListener('click', (event) => toggleTimer(event.currentTarget));
    $('[data-action="done"]', root).addEventListener('click', () => {
      finish('is-done', 'Geschafft!', () => {
        audio.sounds.success();
        vibrate(30);
        const box = $('.wp-flip', root).getBoundingClientRect();
        fx.burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, count: 60, colors: ['#3d8bff', '#ff4f7b', '#ffd76a', '#ffffff'] });
      });
    });
    $('[data-action="drink"]', root).addEventListener('click', () => {
      finish('is-drink', `Gekniffen! 🍺`, () => {
        audio.sounds.fail();
        vibrate([0, 60, 40, 60]);
        if (!fx.reducedMotion()) {
          $('.wp-flip', root).animate(
            [{ transform: 'none' }, { transform: 'translateX(-10px) rotate(-2deg)' }, { transform: 'translateX(9px) rotate(2deg)' }, { transform: 'translateX(-5px)' }, { transform: 'none' }],
            { duration: 380 },
          );
        }
        if (player) {
          sipsByPlayer.set(player, (sipsByPlayer.get(player) ?? 0) + category.sips);
          fx.toast(`${player} trinkt ${sipsLabel(category.sips)}. Prost!`);
        } else {
          fx.toast(`Trinken: ${sipsLabel(category.sips)}. Prost!`);
        }
      });
    });
    $('[data-action="reroll"]', root).addEventListener('click', () => showCard(type));
  }

  // Aufgabentext Wort für Wort einblenden; hervorgehobene Namen (<b>…</b>) bleiben ganz
  function words(html) {
    let index = 0;
    return html.replace(/<b>.*?<\/b>|[^\s<]+/g, (word) => `<span class="wp-word" style="--i: ${index++}">${word}</span>`);
  }

  function nextTurn() {
    cardNumber += 1;
    if (named) {
      turn = (turn + 1) % players.length;
      if (turn === 0) round += 1;
    }
    showTurn();
  }

  // ---------- Timer für Aufgaben mit Zeitangabe ----------

  function timerSeconds(text) {
    const match = text.match(/(\d+)\s*Sekunden/);
    if (match) return Number(match[1]);
    return /eine Minute/.test(text) ? 60 : 0;
  }

  function toggleTimer(button) {
    const seconds = Number(button.dataset.seconds);
    if (timer !== null) {
      stopTimer();
      button.classList.remove('is-running');
      button.style.setProperty('--progress', '0%');
      button.textContent = `Timer starten · ${seconds} s`;
      return;
    }

    const total = seconds * 1000;
    const end = performance.now() + total;
    button.classList.remove('is-done');
    button.classList.add('is-running');

    const update = () => {
      const left = Math.max(0, end - performance.now());
      button.style.setProperty('--progress', `${(1 - left / total) * 100}%`);
      button.textContent = `Noch ${Math.ceil(left / 1000)} s`;
      if (left <= 0) {
        stopTimer();
        button.classList.remove('is-running');
        button.classList.add('is-done');
        button.textContent = 'Zeit um!';
        audio.sounds.success();
        vibrate([0, 120, 60, 120]);
      }
    };
    timer = ctx.interval(update, 100);
    update();
  }

  function stopTimer() {
    if (timer === null) return;
    ctx.clearInterval(timer);
    timer = null;
  }
}
