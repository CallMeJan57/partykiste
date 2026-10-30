import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupScreen, toggleList } from '../../core/ui.js';
import { createSlotSounds } from './sounds.js';
import packs from './words.js';

// Die drei Walzen des Automaten.
const REELS = [
  { key: 'wer', label: 'Wer', placeholder: 'Figur' },
  { key: 'wo', label: 'Wo', placeholder: 'Ort' },
  { key: 'was', label: 'Was', placeholder: 'Ding' },
];

const TIMES = ['30', '60', '90', 'frei']; // Erzählzeit in Sekunden, „frei“ = ohne Uhr
const DEFAULT_TIME = '60';
const DEFAULT_PACKS = ['alltag', 'fantasie'];

// Ab so vielen Namen sagt das Spiel, wer dran ist, und zählt Punkte. Darunter wird ohne Namen gespielt.
const NAMED_MIN_PLAYERS = 2;

// Walzen: wie viele Wörter vorbeirattern und wie lange, jede Walze stoppt etwas später.
const SPIN_WORDS = 34;
const SPIN_EXTRA_WORDS = 12;
const SPIN_MS = 2600;
const SPIN_EXTRA_MS = 900;
const MELODY_STEP_MS = 115;
const MIN_CLICK_GAP_MS = 28; // so dicht dürfen die Walzen-Klicks höchstens aufeinander folgen

// Lauflichter über und unter den Walzen; so lange blinkt der Automat nach dem Stopp.
const LIGHTS = 11;
const WIN_GLOW_MS = 1800;

// Hebel: so weit (px) lässt sich der Knauf runterziehen; ab diesem Anteil löst er aus.
const LEVER_TRAVEL = 96;
const LEVER_TRIGGER = 0.55;

const URGENT_SECONDS = 10;

const ICON = `
  <svg viewBox="0 0 64 64">
    <rect x="6" y="14" width="44" height="38" rx="7" fill="currentColor"/>
    <rect x="11" y="23" width="10" height="20" rx="2.5" fill="#fff"/>
    <rect x="23" y="23" width="10" height="20" rx="2.5" fill="#fff"/>
    <rect x="35" y="23" width="10" height="20" rx="2.5" fill="#fff"/>
    <path d="M55 46V20" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="55" cy="15" r="5" fill="#f5b72e"/>
  </svg>`;

// Startbild: kleiner Spielautomat – der Hebel geht runter, die Walzen drehen und halten nacheinander an.
// Jede Walze zeigt ihre Emojis fünfmal hintereinander; nach vier Drehungen steht wieder das erste da (nahtlose Schleife).
const HERO_REELS = [['🧙', '🦖', '👽', '🤖'], ['🏰', '🌋', '🚀', '🏝️'], ['🗝️', '🍕', '💎', '🎸']];
const HERO = `
  <div class="sc-hero" aria-hidden="true">
    <div class="sc-hero-machine">
      <span class="sc-hero-lights">${'<i></i>'.repeat(7)}</span>
      <div class="sc-hero-window">
        ${HERO_REELS.map((items, i) => `
          <span class="sc-hero-reel" style="--i: ${i}">
            <span class="sc-hero-strip">${[...Array(5).fill(items).flat(), items[0]].map((emoji) => `<i>${emoji}</i>`).join('')}</span>
          </span>`).join('')}
      </div>
    </div>
    <span class="sc-hero-lever"><i></i></span>
  </div>`;

export default {
  id: 'storychaos',
  title: 'Storychaos³',
  tagline: 'Hebel ziehen, drei Wörter – und daraus sofort eine Geschichte erfinden.',
  tags: ['ab 2 Spielern', 'Namen optional'],
  accent: '#d7263d',
  icon: ICON,
  styles: new URL('./storychaos.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const slot = createSlotSounds(audio);

  let selected = loadPacks();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : DEFAULT_TIME;
  let players = ctx.players.get();
  let named = false;
  let points = new Map();
  let turn = 0;
  let stories = 0;     // erzählte Geschichten
  let decks = {};      // je Walze ein gemischter Stapel
  let words = REELS.map((reel) => reel.placeholder);
  let state = 'idle';  // idle → spinning → result → story → judge
  let stopTimer = null;
  let stopMelody = null;
  let stopClicks = null;

  showSetup();

  function loadPacks() {
    const stored = storage.get('packs');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in packs) : [];
    return valid.length ? valid : DEFAULT_PACKS;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endTimer();
    const options = Object.entries(packs).map(([value, pack]) => ({ value, label: pack.label, hint: pack.hint }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="sc-intro">
          ${HERO}
          <h1 class="sc-title">Story&shy;chaos<sup>3</sup></h1>
          <p class="sc-lede">Hebel ziehen, drei Wörter, eine Geschichte – alle drei müssen vorkommen!</p>
        </div>`,
      cards: [
        {
          icon: '📦',
          title: 'Wortpakete',
          count: 'packs',
          body: toggleList({ name: 'packs', label: 'Wortpakete wählen', options: options, values: selected }),
        },
        {
          icon: '⏱️',
          title: 'Erzählzeit',
          body: segmented({ name: 'time', label: 'Erzählzeit', options: TIMES.map((value) => ({ value, label: value === 'frei' ? 'Ohne Uhr' : `${value} Sek.` })), value: time }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="sc-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.sc-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? 'Reihum erzählt jeder. Alle drei Wörter eingebaut = ein Punkt, sonst wird getrunken.'
        : 'Mit Namen sagt das Spiel, wer dran ist, und zählt Punkte. Für eine schnelle Runde einfach ohne starten.';
    };

    bindToggleList(root, 'packs', (values) => {
      selected = values;
      storage.set('packs', values);
    });
    bindSegmented(root, 'time', (value) => {
      time = value;
      storage.set('time', value);
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
    points = new Map(players.map((name) => [name, 0]));
    turn = 0;
    stories = 0;
    decks = {};
    words = REELS.map((reel) => reel.placeholder);
    state = 'idle';
    showMachine();
  }

  // ---------- Wörter ----------

  function pool(key) {
    return selected.flatMap((pack) => packs[pack][key]);
  }

  function draw(key) {
    if (!decks[key]?.length) decks[key] = shuffle(pool(key));
    return decks[key].pop();
  }

  // Wort für die Walze: an den |-Stellen darf umgebrochen werden (weiches Trennzeichen).
  function reelWord(word) {
    return esc(word).replaceAll('|', '&shy;');
  }

  function filler(key) {
    const list = pool(key);
    return list[Math.floor(Math.random() * list.length)];
  }

  // ---------- Automat ----------

  function showMachine() {
    endTimer();
    root.innerHTML = `
      <section class="screen sc-game">
        <div class="sc-head"></div>
        <div class="sc-machine">
          <div class="sc-cabinet">
            <div class="sc-crown" aria-hidden="true">
              <span class="sc-neon">Storychaos<sup>3</sup></span>
            </div>
            ${lights()}
            <div class="sc-reels">
              <span class="sc-payline" aria-hidden="true"></span>
              ${REELS.map((reel, index) => `
                <div class="sc-reel">
                  <p class="sc-reel-label">${reel.label}</p>
                  <div class="sc-window">
                    <div class="sc-strip"><div class="sc-item${state === 'idle' && stories === 0 ? ' is-placeholder' : ''}">${reelWord(words[index])}</div></div>
                  </div>
                </div>`).join('')}
            </div>
            ${lights()}
            <div class="sc-tray" aria-hidden="true"><span>★ 3 Wörter · 1 Geschichte ★</span></div>
          </div>
          <button class="sc-lever" type="button" aria-label="Hebel ziehen">
            <span class="sc-lever-bracket"></span>
            <span class="sc-lever-socket"></span>
            <span class="sc-lever-stick"></span>
            <span class="sc-lever-knob"></span>
          </button>
        </div>
        <div class="sc-panel" aria-live="polite"></div>
      </section>`;

    centerStrips();
    bindLever();
    renderHead();
    renderPanel();
  }

  function lights() {
    const bulbs = Array.from({ length: LIGHTS }, (_, index) => `<span class="sc-bulb" style="--i: ${index}"></span>`).join('');
    return `<div class="sc-lights" aria-hidden="true">${bulbs}</div>`;
  }

  // Strip so verschieben, dass das aktuelle Wort mittig im Fenster steht.
  function centerStrips() {
    for (const strip of root.querySelectorAll('.sc-strip')) {
      strip.style.transform = `translateY(${stripOffset(strip)}px)`;
    }
  }

  function stripOffset(strip, index = 0) {
    const frame = strip.parentElement.getBoundingClientRect().height;
    const item = strip.firstElementChild.getBoundingClientRect().height;
    return (frame - item) / 2 - index * item;
  }

  function renderHead() {
    const head = $('.sc-head', root);
    const ranked = named && stories ? [...points.entries()].sort((a, b) => b[1] - a[1]) : [];
    head.innerHTML = `
      <p class="eyebrow">Geschichte ${stories + 1}</p>
      <p class="sc-who">${named ? `${esc(players[turn])} ist dran` : 'Wer erzählt?'}</p>
      ${ranked.length ? `<ul class="chips sc-scores">${ranked.map(([name, score]) => `<li class="chip">${esc(name)} · ${score}</li>`).join('')}</ul>` : ''}`;
  }

  function renderPanel() {
    const panel = $('.sc-panel', root);
    $('.sc-machine', root).classList.toggle('is-locked', state === 'spinning' || state === 'story' || state === 'judge');
    endTimer();

    if (state === 'idle') {
      panel.innerHTML = `
        <p class="sc-call">Zieh am Hebel!</p>
        <p class="sc-small sc-center">Runterziehen oder antippen – dann rattern die Walzen.</p>
        <div class="sc-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
          <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
        </div>`;
    } else if (state === 'spinning') {
      panel.innerHTML = '<p class="sc-call is-spinning">Rattert …</p>';
    } else if (state === 'result') {
      panel.innerHTML = `
        <p class="sc-small sc-center">Erzähl eine Geschichte – <b>alle drei Wörter</b> müssen vorkommen!</p>
        <div class="sc-actions">
          <button class="btn btn-primary" type="button" data-action="tell">${time === 'frei' ? 'Los – erzählen' : `Los – ${time} Sekunden`}</button>
          <button class="btn btn-ghost" type="button" data-action="respin">Nochmal drehen</button>
        </div>`;
    } else if (state === 'story') {
      panel.innerHTML = `
        ${time === 'frei' ? '<p class="sc-call">Erzähl los!</p>' : `
          <div class="sc-timer" role="timer">
            <div class="sc-timer-bar"><span></span></div>
            <p class="sc-timer-seconds">${time}</p>
          </div>`}
        <button class="btn btn-primary" type="button" data-action="done">Fertig erzählt</button>`;
      if (time !== 'frei') runTimer();
    } else if (state === 'judge') {
      panel.innerHTML = `
        <p class="sc-call">Alle drei Wörter drin?</p>
        <div class="sc-judge">
          <button class="btn btn-primary" type="button" data-action="yes">Ja${named ? ' – Punkt!' : '!'}</button>
          <button class="btn btn-ghost sc-no" type="button" data-action="no">Nein – 1 Schluck</button>
        </div>`;
    }

    $('[data-action="end"]', panel)?.addEventListener('click', showEnd);
    $('[data-action="setup"]', panel)?.addEventListener('click', showSetup);
    $('[data-action="respin"]', panel)?.addEventListener('click', () => pullLever());
    $('[data-action="tell"]', panel)?.addEventListener('click', () => setState('story'));
    $('[data-action="done"]', panel)?.addEventListener('click', () => setState('judge'));
    $('[data-action="yes"]', panel)?.addEventListener('click', () => judge(true));
    $('[data-action="no"]', panel)?.addEventListener('click', () => judge(false));
  }

  function setState(next) {
    state = next;
    renderPanel();
  }

  // ---------- Hebel ----------

  function canPull() {
    return state === 'idle' || state === 'result';
  }

  function setPull(lever, amount) {
    lever.style.setProperty('--pull', String(amount));
  }

  function bindLever() {
    const lever = $('.sc-lever', root);
    let startY = null;
    let amount = 0;
    let notch = 0; // Raste, an der der Hebel gerade steht – jede neue Raste klickt

    lever.addEventListener('pointerdown', (event) => {
      if (!canPull()) return;
      startY = event.clientY;
      amount = 0;
      notch = 0;
      lever.setPointerCapture(event.pointerId);
      lever.classList.add('is-dragging');
    });
    lever.addEventListener('pointermove', (event) => {
      if (startY === null) return;
      amount = Math.min(1, Math.max(0, (event.clientY - startY) / LEVER_TRAVEL));
      setPull(lever, amount);
      const next = Math.floor(amount * 6);
      if (next > notch) {
        slot.click(0.18);
        vibrate(4);
      }
      notch = next;
    });
    const release = () => {
      if (startY === null) return;
      startY = null;
      lever.classList.remove('is-dragging');
      // Kurzes Antippen zählt auch als Ziehen.
      if (amount >= LEVER_TRIGGER || amount < 0.08) pullLever();
      else setPull(lever, 0);
    };
    lever.addEventListener('pointerup', release);
    lever.addEventListener('pointercancel', () => {
      startY = null;
      lever.classList.remove('is-dragging');
      setPull(lever, 0);
    });
    // Tastatur: Enter/Leertaste lösen einen click ohne Pointer aus.
    lever.addEventListener('click', (event) => {
      if (event.detail === 0) pullLever();
    });
  }

  function pullLever() {
    if (!canPull()) return;
    const lever = $('.sc-lever', root);
    setPull(lever, 1);
    vibrate(30);
    slot.lever();
    ctx.timeout(() => setPull(lever, 0), 260);
    spin();
  }

  // ---------- Walzen drehen ----------

  function spin() {
    state = 'spinning';
    renderPanel();
    const machine = $('.sc-machine', root);
    machine.classList.remove('is-win');
    machine.classList.add('is-spinning');

    const next = REELS.map((reel) => draw(reel.key));
    const strips = [...root.querySelectorAll('.sc-strip')];
    const durations = REELS.map((_, index) => SPIN_MS + index * SPIN_EXTRA_MS);
    const started = performance.now();
    let stopped = 0;

    let step = 0;
    stopMelody = ctx.interval(() => slot.melody(step++), MELODY_STEP_MS);

    strips.forEach((strip, index) => {
      const { key } = REELS[index];
      const count = SPIN_WORDS + index * SPIN_EXTRA_WORDS;
      const items = [filler(key), words[index], ...Array.from({ length: count }, () => filler(key)), next[index], filler(key)];
      strip.innerHTML = items.map((word) => `<div class="sc-item">${reelWord(word)}</div>`).join('');
      strip.parentElement.classList.remove('is-stopped');

      const from = stripOffset(strip, 1);
      const to = stripOffset(strip, count + 2);
      strip.style.transform = `translateY(${to}px)`;

      const done = () => {
        slot.stop(index);
        vibrate(20);
        strip.parentElement.classList.add('is-stopped');
        stopped += 1;
        // Vor der letzten Walze: Spannung aufbauen
        if (stopped === REELS.length - 1 && !fx.reducedMotion()) {
          const left = (durations[REELS.length - 1] - (performance.now() - started)) / 1000;
          if (left > 0.3) slot.suspense(left);
        }
        if (stopped === REELS.length) finishSpin(next);
      };

      if (fx.reducedMotion()) {
        done();
        return;
      }
      const duration = durations[index];
      // Erst ein kleines Stück zurück (Schwung holen), dann losrattern und mit leichtem Nachfedern stoppen.
      strip.animate(
        [
          { transform: `translateY(${from}px)`, easing: 'ease-in-out' },
          { transform: `translateY(${from + 14}px)`, offset: 0.04, easing: 'cubic-bezier(.12, .5, .2, 1.03)' },
          { transform: `translateY(${to}px)` },
        ],
        { duration },
      ).finished.then(done, () => {});
      strip.animate(
        [{ filter: 'blur(0)' }, { filter: 'blur(2.5px)', offset: 0.12 }, { filter: 'blur(2px)', offset: 0.6 }, { filter: 'blur(0)', offset: 0.9 }],
        { duration },
      );
    });

    if (!fx.reducedMotion()) startClicks(strips);
  }

  // Mechanisches Klicken, sobald ein neues Wort an der Gewinnlinie vorbeiläuft – wird mit den Walzen langsamer.
  function startClicks(strips) {
    const centered = strips.map(() => null);
    let last = 0;
    stopClicks = ctx.loop((now) => {
      strips.forEach((strip, index) => {
        if (strip.parentElement.classList.contains('is-stopped')) return;
        const item = strip.firstElementChild.getBoundingClientRect().height;
        const y = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m42;
        const position = Math.round((stripOffset(strip) - y) / item);
        if (position !== centered[index]) {
          centered[index] = position;
          if (now - last >= MIN_CLICK_GAP_MS) {
            slot.click(0.16);
            last = now;
          }
        }
      });
    });
  }

  function finishSpin(next) {
    ctx.clearInterval(stopMelody);
    stopMelody = null;
    stopClicks?.();
    stopClicks = null;
    words = next;

    const machine = $('.sc-machine', root);
    machine.classList.remove('is-spinning');
    machine.classList.add('is-win');
    ctx.timeout(() => machine.classList.remove('is-win'), WIN_GLOW_MS);

    slot.win();
    vibrate([0, 40, 30, 40, 30, 80]);
    if (!fx.reducedMotion()) {
      const box = $('.sc-reels', root).getBoundingClientRect();
      const styles = getComputedStyle(root);
      fx.burst({
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        count: 60,
        colors: ['--gold', '--accent-2', '--reel-bg'].map((token) => styles.getPropertyValue(token).trim()),
      });
    }
    setState('result');
  }

  // ---------- Erzählzeit ----------

  function runTimer() {
    const bar = $('.sc-timer-bar span', root);
    const label = $('.sc-timer-seconds', root);
    const box = $('.sc-timer', root);
    const total = Number(time) * 1000;
    const end = performance.now() + total;
    let shown = Number(time);

    audio.sounds.blip();
    stopTimer = ctx.loop((now) => {
      const left = Math.max(0, end - now);
      bar.style.transform = `scaleX(${left / total})`;
      const whole = Math.ceil(left / 1000);
      if (whole !== shown) {
        shown = whole;
        label.textContent = String(whole);
        if (whole <= URGENT_SECONDS && whole > 0) {
          box.classList.add('is-urgent');
          audio.sounds.tick();
        }
      }
      if (left <= 0) {
        audio.sounds.fail();
        vibrate([0, 120, 60, 120]);
        fx.toast('Zeit um!');
        stopTimer = null;
        setState('judge');
        return false;
      }
    });
  }

  function endTimer() {
    stopTimer?.();
    stopTimer = null;
  }

  // ---------- Auswertung ----------

  function judge(success) {
    stories += 1;
    const name = named ? players[turn] : null;
    if (success) {
      if (name) points.set(name, points.get(name) + 1);
      audio.sounds.success();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--gold', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
      fx.toast(name ? `+1 Punkt für ${name}` : 'Starke Geschichte!');
    } else {
      audio.sounds.fail();
      vibrate([0, 80, 40, 80]);
      fx.toast(name ? `${name} trinkt 1 Schluck. Prost!` : 'Trinken: 1 Schluck. Prost!');
    }
    if (named) turn = (turn + 1) % players.length;
    state = 'idle';
    renderHead();
    renderPanel();
  }

  // ---------- Spielende ----------

  function showEnd() {
    endTimer();
    if (!named || !stories) {
      showSetup();
      return;
    }
    const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0][1];
    const winners = ranked.filter(([, score]) => score === best && best > 0).map(([name]) => name);
    if (winners.length) {
      audio.sounds.success();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--gold', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
    }

    root.innerHTML = `
      <section class="screen sc-end" data-leave-free>
        <p class="eyebrow">${stories} ${stories === 1 ? 'Geschichte' : 'Geschichten'} erzählt</p>
        <p class="sc-end-title">${winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden'}</p>
        ${rankingList(ranked.map(([name, value]) => ({ name, value })))}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
