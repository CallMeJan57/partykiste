import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters, toggleList } from '../../core/ui.js';
import categories from './puzzles.js';

const TIMES = ['aus', '30', '60', '90'];      // Sekunden pro Rätsel
const ROUNDS = ['10', '20', 'endlos'];
const DEFAULT_CATEGORIES = ['woerter', 'filme', 'figuren', 'party'];

// Ab so vielen Namen fragt das Spiel, wer erraten hat, und zählt Punkte
const NAMED_MIN_PLAYERS = 2;

// Punkte: ohne Tipp 3, mit einem Tipp 2, mit zwei Tipps 1
const MAX_POINTS = 3;
const HINT_LEVELS = 2;

const DROP_STAGGER = 260;  // ms zwischen zwei hereinfallenden Emojis
const EXIT_MS = 450;
const URGENT_SECONDS = 10;

// Umkreisen das nachdenkliche Gesicht auf dem Startbildschirm
const ORBIT = ['🍕', '🎬', '🦁', '🏰', '🎤', '🌈', '🚀', '🍺'];

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="24" fill="#facc15"/>
    <circle cx="24" cy="27" r="3.4" fill="#3b2a05"/>
    <circle cx="40" cy="27" r="3.4" fill="#3b2a05"/>
    <path d="M23 40c3 3 15 3 18-2" fill="none" stroke="#3b2a05" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M44 8a7 7 0 0 1 10 5c0 5-6 5-6 10M48 28v1" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>
  </svg>`;

export default {
  id: 'emoji-raten',
  title: 'Emoji-Raten',
  tagline: 'Ein paar Emojis, ein Begriff – Film, Sprichwort oder Wort. Wer kommt zuerst drauf?',
  tags: ['ab 2 Spielern', 'Namen optional'],
  accent: '#facc15',
  icon: ICON,
  styles: new URL('./emoji-raten.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let selected = loadSelection();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : '60';
  let rounds = ROUNDS.includes(storage.get('rounds')) ? storage.get('rounds') : '10';
  let players = ctx.players.get();

  let named = false;
  let scores = new Map();
  let deck = [];
  let played = 0;
  let solved = 0;
  let current = null;   // { key, emojis: [...], answer }
  let hints = 0;        // aufgedeckte Tipps im aktuellen Rätsel
  let finished = false; // Rätsel gelöst oder aufgelöst
  let busy = false;
  let stopClock = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function total() {
    return rounds === 'endlos' ? Infinity : Number(rounds);
  }

  function endClock() {
    stopClock?.();
    stopClock = null;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endClock();
    busy = false;
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${category.puzzles.length} Rätsel`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="em-intro">
          <div class="em-orbit" aria-hidden="true">
            <span class="em-orbit-center">🤔</span>
            <span class="em-orbit-ring">
              ${ORBIT.map((emoji, index) => `<span class="em-orbit-item" style="--i: ${index}; --n: ${ORBIT.length}"><span>${emoji}</span></span>`).join('')}
            </span>
          </div>
          <h1 class="em-title">${letters('Emoji-Raten')}</h1>
          <p class="em-lede">Die Emojis ergeben ein Wort, einen Film oder ein Sprichwort – wer kommt zuerst drauf?</p>
        </div>`,
      cards: [
        {
          icon: '😀',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '⚙️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Zeit pro Rätsel',
              control: segmented({ name: 'time', label: 'Zeit pro Rätsel', options: TIMES.map((value) => ({ value, label: value === 'aus' ? 'Ohne' : `${value} Sek.` })), value: time }),
            })}
            ${setupRow({
              label: 'Anzahl Rätsel',
              control: segmented({ name: 'rounds', label: 'Anzahl Rätsel', options: ROUNDS.map((value) => ({ value, label: value === 'endlos' ? 'Endlos' : value })), value: rounds }),
            })}`,
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="em-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.em-players-hint', root);
    const update = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? `Wer zuerst richtig rät, bekommt bis zu ${MAX_POINTS} Punkte – jeder Tipp kostet einen.`
        : 'Mit Namen zählt das Spiel Punkte. Für eine schnelle Runde einfach ohne starten.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'time', (value) => {
      time = value;
      storage.set('time', value);
    });
    bindSegmented(root, 'rounds', (value) => {
      rounds = value;
      storage.set('rounds', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        update();
      },
    });
    startButton.addEventListener('click', startGame);
    update();
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    scores = new Map(players.map((name) => [name, 0]));
    deck = [];
    played = 0;
    solved = 0;
    busy = false;
    nextPuzzle();
  }

  // ---------- Rätsel ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => categories[key].puzzles.map(([emojis, answer]) => ({
        key,
        emojis: emojis.split(' '),
        answer,
      }))));
    }
    return deck.pop();
  }

  // Alte Emojis fliegen in alle Richtungen davon, dann kommt das nächste Rätsel
  function nextPuzzle() {
    if (busy) return;
    if (played >= total()) {
      showEnd();
      return;
    }
    const old = [...root.querySelectorAll('.em-emoji')];
    if (!old.length || fx.reducedMotion()) {
      showPuzzle();
      return;
    }
    busy = true;
    sound.whoosh();
    old.forEach((emoji) => {
      const angle = Math.random() * Math.PI * 2;
      emoji.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * 260}px, ${Math.sin(angle) * 260 - 80}px) rotate(${-200 + Math.random() * 400}deg) scale(.4)`, opacity: 0 },
        ],
        { duration: EXIT_MS, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' },
      );
    });
    ctx.timeout(() => {
      busy = false;
      showPuzzle();
    }, EXIT_MS);
  }

  function showPuzzle() {
    endClock();
    current = draw();
    played += 1;
    hints = 0;
    finished = false;
    const seconds = time === 'aus' ? 0 : Number(time);
    const counter = rounds === 'endlos' ? `Rätsel ${played}` : `Rätsel ${played} von ${total()}`;

    root.innerHTML = `
      <section class="screen em-round" style="--count: ${current.emojis.length}">
        <div class="em-head">
          <p class="eyebrow">${counter}</p>
          <span class="chip em-category">${esc(categories[current.key].label)}</span>
        </div>
        <div class="em-stage">
          <span class="em-stage-glow" aria-hidden="true"></span>
          <div class="em-emojis" role="img" aria-label="Emoji-Rätsel">
            ${current.emojis.map((emoji, index) => `
              <span class="em-slot" style="--i: ${index}">
                <span class="em-emoji">${emoji}</span>
                <span class="em-shadow" aria-hidden="true"></span>
              </span>`).join('')}
          </div>
          ${seconds ? '<div class="em-fuse" aria-hidden="true"><span class="em-fuse-bar"></span></div>' : ''}
        </div>
        <div class="em-tiles" data-level="0" aria-live="polite">${tiles(current.answer)}</div>
        <div class="em-actions">
          <button class="btn btn-primary" type="button" data-action="solved">Erraten!</button>
          <div class="em-action-row">
            <button class="btn btn-ghost" type="button" data-action="hint">Tipp: Buchstaben</button>
            <button class="btn btn-ghost" type="button" data-action="reveal">Auflösen</button>
          </div>
        </div>
        <div class="em-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    $('[data-action="solved"]', root).addEventListener('click', () => resolve(true));
    $('[data-action="reveal"]', root).addEventListener('click', () => resolve(false));
    $('[data-action="hint"]', root).addEventListener('click', giveHint);
    $('[data-action="end"]', root).addEventListener('click', showEnd);

    dropIn();
    if (seconds) runClock(seconds);
  }

  // Emojis fallen nacheinander herein, prallen auf und wippen dann im Takt
  function dropIn() {
    root.querySelectorAll('.em-slot').forEach((slot, index) => {
      ctx.timeout(() => sound.drop(index), index * DROP_STAGGER);
      if (fx.reducedMotion()) return;
      const delay = index * DROP_STAGGER;
      $('.em-emoji', slot).animate(
        [
          { transform: 'translateY(-220px) rotate(-30deg) scale(.6)', opacity: 0 },
          { transform: 'translateY(0) rotate(8deg) scale(1.15, .8)', opacity: 1, offset: 0.55 },
          { transform: 'translateY(-26px) rotate(-4deg) scale(.95, 1.08)', offset: 0.75 },
          { transform: 'translateY(0) scale(1.05, .95)', offset: 0.9 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 760, delay, easing: 'cubic-bezier(.35, 0, .4, 1)', fill: 'backwards' },
      );
      $('.em-shadow', slot).animate(
        [{ transform: 'scaleX(.2)', opacity: 0 }, { transform: 'scaleX(1.2)', opacity: 0.5, offset: 0.55 }, { transform: 'none', opacity: 0.35 }],
        { duration: 760, delay, fill: 'backwards' },
      );
    });
  }

  function runClock(seconds) {
    const screen = $('.em-round', root);
    const bar = $('.em-fuse-bar', root);
    const totalMs = seconds * 1000;
    const end = performance.now() + totalMs;
    let shown = seconds;
    stopClock = ctx.loop((now) => {
      const left = Math.max(0, end - now);
      bar.style.transform = `scaleX(${left / totalMs})`;
      const whole = Math.ceil(left / 1000);
      if (whole !== shown) {
        shown = whole;
        if (whole <= URGENT_SECONDS && whole > 0) {
          screen.classList.add('is-urgent');
          audio.sounds.tick();
        }
      }
      if (left <= 0) {
        stopClock = null;
        resolve(false, true);
        return false;
      }
    });
  }

  // Tipp 1: Anzahl der Buchstaben, Tipp 2: Anfangsbuchstaben
  function giveHint() {
    if (finished || hints >= HINT_LEVELS) return;
    hints += 1;
    const box = $('.em-tiles', root);
    box.dataset.level = String(hints);
    sound.hint(hints);
    vibrate(10);
    const button = $('[data-action="hint"]', root);
    if (hints < HINT_LEVELS) {
      button.textContent = 'Tipp: Anfänge';
    } else {
      button.textContent = 'Keine Tipps mehr';
      button.disabled = true;
    }
  }

  // ---------- Auflösung ----------

  function resolve(success, timeout = false) {
    if (finished || busy) return;
    finished = true;
    endClock();
    const screen = $('.em-round', root);
    screen.classList.remove('is-urgent');
    screen.classList.add(success ? 'is-solved' : 'is-failed');
    $('.em-tiles', root).dataset.level = 'all';

    if (success) {
      solved += 1;
      sound.solved();
      vibrate([0, 60, 40, 60]);
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--pop'].map((token) => styles.getPropertyValue(token).trim()) });
    } else {
      sound.failed();
      vibrate([0, 120, 60, 120]);
      if (timeout) fx.shake();
    }

    const points = Math.max(1, MAX_POINTS - hints);
    const actions = $('.em-actions', root);
    actions.innerHTML = success && named
      ? `<p class="em-award-title">Wer hat's erraten? <b>+${points}</b></p>
         <div class="em-award-buttons">
           ${players.map((name, index) => `<button class="em-award" type="button" data-player="${esc(name)}" style="--i: ${index}">${esc(name)}</button>`).join('')}
         </div>
         <button class="btn-link" type="button" data-action="next">Ohne Punkte weiter</button>`
      : `<p class="em-award-title">${success ? 'Stark!' : timeout ? 'Zeit um!' : 'Aufgelöst'}</p>
         <button class="btn btn-primary" type="button" data-action="next">${played >= total() ? 'Zur Auswertung' : 'Nächstes Rätsel'}</button>`;

    $('[data-action="next"]', root).addEventListener('click', nextPuzzle);
    for (const button of root.querySelectorAll('[data-player]')) {
      button.addEventListener('click', () => {
        if (busy) return;
        const name = button.dataset.player;
        scores.set(name, (scores.get(name) ?? 0) + points);
        sound.point();
        button.classList.add('is-picked');
        button.insertAdjacentHTML('beforeend', `<span class="em-plus" aria-hidden="true">+${points}</span>`);
        fx.toast(`+${points} für ${name}`);
        busy = true;
        ctx.timeout(() => {
          busy = false;
          nextPuzzle();
        }, fx.reducedMotion() ? 0 : 600);
      });
    }
  }

  // ---------- Spielende ----------

  function showEnd() {
    endClock();
    busy = false;
    const count = finished ? played : played - 1; // das gerade offene Rätsel zählt nicht
    if (!count) {
      showSetup();
      return;
    }

    let title = `${solved} von ${count} gelöst`;
    let ranking = '';
    if (named) {
      const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const best = ranked[0][1];
      const winners = ranked.filter(([, points]) => points === best && best > 0).map(([name]) => name);
      title = winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden';
      ranking = rankingList(ranked.map(([name, value]) => ({ name, value })));
    }
    if (solved) {
      sound.solved();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--pop'].map((token) => styles.getPropertyValue(token).trim()) });
    }

    root.innerHTML = `
      <section class="screen em-end" data-leave-free>
        <div class="em-end-emojis" aria-hidden="true">${['🏆', '🥳', '🎉'].map((emoji, index) => `<span style="--i: ${index}">${emoji}</span>`).join('')}</div>
        <p class="eyebrow">${count} Rätsel gespielt${named ? ` · ${solved} gelöst` : ''}</p>
        <p class="em-end-title">${title}</p>
        ${ranking}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

// Buchstabenkacheln der Lösung; Satzzeichen stehen ohne Kachel dazwischen.
// is-first markiert den Anfangsbuchstaben jedes Worts (für Tipp 2).
function tiles(answer) {
  let index = 0;
  const isLetter = (char) => /[\p{L}\p{N}]/u.test(char);
  const letterCount = [...answer].filter(isLetter).length;
  // Lange Lösungen kleiner; das längste Wort muss immer in eine Zeile passen (--longest, siehe CSS)
  const size = letterCount > 30 ? 'is-tiny' : letterCount > 16 ? 'is-small' : '';
  const longest = Math.max(...answer.split(' ').map((word) => [...word].length));
  const words = answer.split(' ').map((word) => {
    const chars = [...word].map((char, position) => {
      if (!/[\p{L}\p{N}]/u.test(char)) return `<span class="em-punct">${esc(char)}</span>`;
      const first = position === 0 || !/[\p{L}\p{N}]/u.test(word[position - 1]);
      // ß bleibt ß – toUpperCase() machte daraus zwei Buchstaben (SS) in einer Kachel
      const shown = char === 'ß' ? char : char.toUpperCase();
      return `<span class="em-tile${first ? ' is-first' : ''}" style="--i: ${index++}"><span class="em-tile-char">${esc(shown)}</span></span>`;
    }).join('');
    return `<span class="em-tile-word">${chars}</span>`;
  }).join('');
  return `<div class="em-tile-grid ${size}" style="--longest: ${longest}">${words}</div>`;
}

// Buchstaben, die per CSS nacheinander erscheinen (Klassen .em-word / .em-letter)
const letters = (text, start = 0) => splitLetters(text, { prefix: 'em', start });

// Plopp-Klänge in steigender Tonhöhe, Glitzer für Tipps, Fanfare und ein trauriges Tröten
function createSounds(audio) {
  return {
    drop: (index) => {
      audio.tone({ freq: 420 + index * 110, slideTo: 260 + index * 110, duration: 0.12, type: 'sine', volume: 0.25 });
      audio.noise({ duration: 0.05, volume: 0.15, cutoff: 1800, delay: 0.38 });
    },
    whoosh: () => audio.noise({ duration: 0.4, volume: 0.25, cutoff: 3500 }),
    hint: (level) => {
      [1047, 1319, 1568].slice(0, level + 1).forEach((freq, index) => {
        audio.tone({ freq, duration: 0.18, type: 'sine', volume: 0.12, delay: index * 0.07 });
      });
    },
    solved: () => {
      [523, 659, 784, 1047].forEach((freq, index) => audio.tone({ freq, duration: 0.22, type: 'triangle', volume: 0.16, delay: index * 0.08 }));
      audio.tone({ freq: 1568, duration: 0.5, type: 'sine', volume: 0.1, delay: 0.34 });
    },
    failed: () => {
      audio.tone({ freq: 330, slideTo: 300, duration: 0.25, type: 'sawtooth', volume: 0.1 });
      audio.tone({ freq: 294, slideTo: 196, duration: 0.6, type: 'sawtooth', volume: 0.1, delay: 0.28 });
    },
    point: () => {
      audio.tone({ freq: 880, duration: 0.08, type: 'square', volume: 0.08 });
      audio.tone({ freq: 1320, duration: 0.16, type: 'square', volume: 0.08, delay: 0.08 });
    },
  };
}
