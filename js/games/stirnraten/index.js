import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { getTeams, teamLabel, teamMember } from '../../core/teams.js';
import { bindPlayerEditor, bindSegmented, bindTeamMode, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters, teamModeControl, toggleList } from '../../core/ui.js';
import categories from './terms.js';

const DEFAULT_CATEGORIES = ['tiere', 'filme', 'figuren', 'promis'];
const TIMES = ['60', '90', '120'];        // Sekunden pro Zug
const ROUND_COUNTS = ['1', '2', '3'];      // wie oft jede Person bzw. jedes Team dran ist
const CONTROLS = [
  { value: 'tilt', label: '📲 Kippen' },
  { value: 'tap', label: '👆 Tippen' },
];

// Ab so vielen Namen sagt das Spiel, wer dran ist, und zählt Punkte
const NAMED_MIN_PLAYERS = 2;

// Kippen: Das Handy liegt quer an der Stirn (gamma nahe ±90°). Kippt es um mehr als ~45°,
// zählt es – Bildschirm Richtung Boden = richtig, Richtung Himmel = weiter.
const NEUTRAL_GAMMA = 62;   // ab hier gilt das Handy wieder als aufrecht
const TILT_GAMMA = 40;      // darunter ist es weit genug gekippt
const SENSOR_WAIT_MS = 1600; // kommen bis dahin keine Sensordaten, wird auf Tippen umgeschaltet
const COOLDOWN_MS = 650;
const URGENT_SECONDS = 10;
const COUNT_STEP_MS = 800;
const FEEDBACK_MS = 520;
const TIME_UP_MS = 1500;

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="40" r="18" fill="#f7c59f"/>
    <path d="M14 36c0-12 8-20 18-20s18 8 18 20c-4-5-10-8-18-8s-14 3-18 8Z" fill="#5b3a29"/>
    <rect x="17" y="10" width="30" height="18" rx="4" fill="#1f2a44" transform="rotate(-4 32 19)"/>
    <rect x="20" y="13" width="24" height="12" rx="2" fill="#ffd34d" transform="rotate(-4 32 19)"/>
    <text x="32" y="22.5" text-anchor="middle" font-size="8" font-weight="800" fill="#1f2a44" transform="rotate(-4 32 19)">?!</text>
  </svg>`;

// Startbild: Ein Handy klebt an der Stirn, darüber wechseln die Begriffe, die Freunde gestikulieren
const HERO = `
  <div class="st-hero" aria-hidden="true">
    <span class="st-hero-face">🤔</span>
    <span class="st-hero-phone">
      <span class="st-hero-word">Pinguin</span>
      <span class="st-hero-word">Pizza</span>
      <span class="st-hero-word">Yoda</span>
    </span>
    <span class="st-hero-hand st-hero-hand-l">🙌</span>
    <span class="st-hero-hand st-hero-hand-r">👉</span>
  </div>`;

export default {
  id: 'stirnraten',
  title: 'Stirnraten',
  tagline: 'Handy an die Stirn, die anderen erklären. Kippen für richtig, zurück für weiter.',
  tags: ['ab 2 Spielern', 'Bewegungssensor'],
  accent: '#f59e0b',
  icon: ICON,
  styles: new URL('./stirnraten.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let selected = loadSelection();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : '60';
  let rounds = ROUND_COUNTS.includes(storage.get('rounds')) ? storage.get('rounds') : '1';
  let control = CONTROLS.some((option) => option.value === storage.get('control')) ? storage.get('control') : 'tilt';
  let playAs = storage.get('playAs') === 'teams' ? 'teams' : 'solo';
  let players = ctx.players.get();

  let sides = [];       // im Teammodus: Teams aus core/teams.js
  let named = false;
  let scores = new Map();
  let turn = 0;
  let deck = [];
  let current = null;   // { term, key }
  let log = [];         // { term, right } des laufenden Zugs
  let running = false;
  let answering = false; // Rückmeldung „Richtig!“/„Weiter“ läuft – kein zweites Werten
  let tapMode = false;  // läuft der Zug mit Tippen statt Kippen?
  let stopSensor = null;
  let turnSign = 1;     // Drehrichtung des Begriffs, wenn der Bildschirm hochkant bleibt

  ctx.listen(window, 'resize', updateSideways);
  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  // Wer reihum dran ist: Teams, Namen oder niemand Bestimmtes
  function lineup() {
    if (sides.length) return sides.map((team) => team.name);
    return named ? players : [];
  }

  function totalTurns() {
    return lineup().length ? lineup().length * Number(rounds) : Infinity;
  }

  function currentKey() {
    return lineup().length ? lineup()[turn % lineup().length] : null;
  }

  // Wer das Handy an die Stirn hält
  function guesser() {
    if (sides.length) {
      const team = sides[turn % sides.length];
      return teamMember(team, Math.floor(turn / sides.length)) ?? team.name;
    }
    return currentKey();
  }

  function teamOf(name) {
    return sides.find((team) => team.name === name);
  }

  function label(name) {
    const team = teamOf(name);
    return team ? teamLabel(team) : name;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endSensor();
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: `${category.emoji} ${category.label}`,
      hint: `${category.hint} · ${category.terms.length}`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="st-intro">
          ${HERO}
          <h1 class="st-title" aria-label="Stirnraten">${splitLetters('Stirnraten', { prefix: 'st' })}</h1>
          <p class="st-lede">Du siehst den Begriff nicht – alle anderen schon. Sie erklären, du rätst.</p>
        </div>`,
      cards: [
        {
          icon: '🗂️',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options, values: selected }),
        },
        {
          icon: '⏱️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Steuerung',
              control: segmented({ name: 'control', label: 'Steuerung', options: CONTROLS, value: control }),
            })}
            ${setupRow({
              label: 'Zeit pro Zug',
              control: segmented({ name: 'time', label: 'Zeit pro Zug', options: TIMES.map((value) => ({ value, label: `${value} s` })), value: time }),
            })}
            ${setupRow({
              label: 'Runden',
              control: segmented({ name: 'rounds', label: 'Runden', options: ROUND_COUNTS.map((value) => ({ value, label: value })), value: rounds }),
            })}`,
          note: 'Kippen: Handy quer an die Stirn, Bildschirm zu den anderen. Nach vorn kippen = richtig, nach hinten = weiter. Tippen: rechte Hälfte = richtig, linke = weiter.',
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: `${playerEditor({ name: 'players' })}${teamModeControl({ value: playAs })}`,
          note: '<span class="st-players-hint"></span>',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">Los geht\'s</button>',
    });

    const hint = $('.st-players-hint', root);
    const update = () => {
      if (playAs === 'teams') hint.textContent = 'Die Teams sind reihum dran, im Team wechselt, wer rät. Jeder erratene Begriff = 1 Punkt fürs Team.';
      else if (players.length >= NAMED_MIN_PLAYERS) hint.textContent = 'Reihum hat jeder das Handy an der Stirn. Jeder erratene Begriff = 1 Punkt.';
      else hint.textContent = 'Mit Namen sagt das Spiel, wer dran ist, und zählt Punkte.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'control', (value) => {
      control = value;
      storage.set('control', value);
    });
    bindSegmented(root, 'time', (value) => {
      time = value;
      storage.set('time', value);
    });
    bindSegmented(root, 'rounds', (value) => {
      rounds = value;
      storage.set('rounds', value);
    });
    const teams = bindTeamMode(root, {
      onChange: (value) => {
        playAs = value;
        storage.set('playAs', value);
        update();
      },
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        teams.refresh(list);
        update();
      },
    });
    update();
    $('[data-action="start"]', root).addEventListener('click', startGame);
  }

  function startGame() {
    sides = playAs === 'teams' ? getTeams(players) : [];
    named = sides.length > 0 || players.length >= NAMED_MIN_PLAYERS;
    scores = new Map(lineup().map((name) => [name, 0]));
    turn = 0;
    deck = [];
    showTurn();
  }

  function draw() {
    if (!deck.length) {
      // Kommt ein Begriff in zwei gewählten Kategorien vor (z. B. „Schwimmen“), nur einmal ins Spiel nehmen
      const seen = new Set();
      deck = shuffle(selected.flatMap((key) => categories[key].terms.map((term) => ({ term, key })))
        .filter(({ term }) => !seen.has(term.toLowerCase()) && seen.add(term.toLowerCase())));
    }
    return deck.pop();
  }

  // ---------- Wer ist dran? ----------

  function showTurn() {
    endSensor();
    const name = guesser();
    const team = sides.length ? sides[turn % sides.length] : null;
    root.innerHTML = `
      <section class="screen st-turn"${team ? ` style="--team: ${team.color}"` : ''}>
        <p class="eyebrow">${lineup().length ? `Runde ${Math.floor(turn / lineup().length) + 1} von ${rounds}` : `Zug ${turn + 1}`}${team ? ` · ${esc(teamLabel(team))}` : ''}</p>
        <h1 class="st-who">${name ? `${esc(name)} rät` : 'Wer rät?'}</h1>
        <div class="st-howto" aria-hidden="true">
          <span class="st-howto-phone"></span>
          <span class="st-howto-arrow is-down">✓</span>
          <span class="st-howto-arrow is-up">↻</span>
        </div>
        <p class="st-lede">${control === 'tilt'
          ? 'Handy <b>quer</b> an die Stirn, Bildschirm zu den anderen. <b>Nach vorn kippen</b> = richtig, <b>nach hinten</b> = weiter.'
          : 'Handy an die Stirn. <b>Rechte Hälfte</b> antippen = richtig, <b>linke Hälfte</b> = weiter.'}</p>
        ${scoreboard()}
        <button class="btn btn-primary" type="button" data-action="ready">Bereit – ${time} Sekunden</button>
        ${turn > 0 ? '<button class="btn-link" type="button" data-action="end">Spiel beenden</button>' : ''}
      </section>`;
    $('[data-action="ready"]', root).addEventListener('click', ready, { once: true });
    $('[data-action="end"]', root)?.addEventListener('click', showEnd);
  }

  function scoreboard() {
    if (!named || !turn) return '';
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    return `<ul class="chips st-scores">${ranked.map(([name, points]) => `<li class="chip">${esc(label(name))} · ${points}</li>`).join('')}</ul>`;
  }

  // Bewegungssensor freischalten (am iPhone fragt das System einmal nach), dann Countdown
  async function ready() {
    audio.unlock();
    tapMode = control === 'tap';
    if (!tapMode && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const answer = await DeviceOrientationEvent.requestPermission();
        if (answer !== 'granted') {
          tapMode = true;
          fx.toast('Ohne Bewegungssensor – tippen statt kippen');
        }
      } catch {
        tapMode = true;
      }
    }
    if (typeof DeviceOrientationEvent === 'undefined') tapMode = true;
    if (!tapMode) startSensor();
    countdown();
  }

  function countdown() {
    root.innerHTML = `
      <section class="screen st-play st-count">
        <div class="st-card ${sidewaysClass()}" style="--turn: ${turnSign * 90}deg">
          <p class="st-card-cat">Ans Handy an die Stirn!</p>
          <span class="st-count-number" aria-live="polite"></span>
        </div>
      </section>`;
    const number = $('.st-count-number', root);
    ['3', '2', '1'].forEach((step, index) => {
      ctx.timeout(() => {
        number.textContent = step;
        number.classList.remove('is-pop');
        void number.offsetWidth; // Animation neu starten
        number.classList.add('is-pop');
        sound.count();
        updateSideways();
      }, index * COUNT_STEP_MS);
    });
    ctx.timeout(play, 3 * COUNT_STEP_MS);
  }

  // ---------- Bewegungssensor ----------

  function startSensor() {
    let armed = false;
    let seen = false;
    let blockedUntil = 0;
    const onTilt = (event) => {
      if (event.beta === null || event.gamma === null) return;
      seen = true;
      const { beta, gamma } = event;
      if (Math.abs(gamma) > NEUTRAL_GAMMA) {
        turnSign = gamma < 0 ? 1 : -1; // Begriff so drehen, dass er für die anderen aufrecht steht
        updateSideways();
        armed = true;
        return;
      }
      if (!running || !armed || performance.now() < blockedUntil || Math.abs(gamma) > TILT_GAMMA) return;
      armed = false;
      blockedUntil = performance.now() + COOLDOWN_MS;
      // Bildschirm zeigt Richtung Boden (beta nahe ±180) = nach vorn gekippt = richtig
      resolve(Math.abs(beta) > 90 ? 'right' : 'skip');
    };
    window.addEventListener('deviceorientation', onTilt);
    stopSensor = () => window.removeEventListener('deviceorientation', onTilt);
    ctx.onCleanup(endSensor);
    ctx.timeout(() => {
      if (seen || tapMode) return;
      tapMode = true;
      enableTapZones();
      fx.toast('Kein Bewegungssensor gefunden – tippen statt kippen');
    }, SENSOR_WAIT_MS);
  }

  function endSensor() {
    stopSensor?.();
    stopSensor = null;
  }

  // Bleibt der Bildschirm hochkant, wird der Begriff gedreht – sonst stünde er für die anderen auf der Seite
  function sidewaysClass() {
    return window.innerHeight > window.innerWidth ? 'is-sideways' : '';
  }

  function updateSideways() {
    const card = $('.st-card', root);
    if (!card) return;
    card.classList.toggle('is-sideways', window.innerHeight > window.innerWidth);
    card.style.setProperty('--turn', `${turnSign * 90}deg`);
  }

  // ---------- Der Zug ----------

  function play() {
    log = [];
    running = true;
    answering = false;
    root.innerHTML = `
      <section class="screen st-play">
        <div class="st-card ${sidewaysClass()}" style="--turn: ${turnSign * 90}deg">
          <span class="st-time" role="timer">${time}</span>
          <p class="st-card-cat"></p>
          <p class="st-word" lang="de"></p>
          <span class="st-feedback" aria-hidden="true"></span>
          <div class="st-fuse" aria-hidden="true"><i></i></div>
          <button class="st-zone is-skip" type="button" data-zone="skip" aria-label="Weiter"></button>
          <button class="st-zone is-right" type="button" data-zone="right" aria-label="Richtig"></button>
        </div>
      </section>`;
    for (const zone of root.querySelectorAll('[data-zone]')) {
      zone.addEventListener('click', () => resolve(zone.dataset.zone));
    }
    if (tapMode) enableTapZones();
    showCard();
    startClock();
  }

  function enableTapZones() {
    root.querySelector('.st-card')?.classList.add('is-tap');
  }

  function showCard() {
    current = draw();
    const category = categories[current.key];
    $('.st-card-cat', root).textContent = `${category.emoji} ${category.label}`;
    const word = $('.st-word', root);
    word.textContent = current.term;
    word.classList.toggle('is-long', current.term.length > 14);
    word.classList.remove('is-in');
    void word.offsetWidth;
    word.classList.add('is-in');
  }

  function startClock() {
    const total = Number(time) * 1000;
    const started = performance.now();
    const label = $('.st-time', root);
    const fuse = $('.st-fuse i', root);
    let shown = Number(time);
    ctx.loop((now) => {
      if (!running) return false;
      const left = Math.max(0, total - (now - started));
      fuse.style.transform = `scaleX(${left / total})`;
      const seconds = Math.ceil(left / 1000);
      if (seconds !== shown) {
        shown = seconds;
        label.textContent = String(seconds);
        if (seconds <= URGENT_SECONDS && seconds > 0) {
          $('.st-card', root).classList.add('is-urgent');
          sound.tick();
        }
      }
      if (left > 0) return true;
      timeUp();
      return false;
    });
  }

  function resolve(outcome) {
    if (!running || answering) return;
    answering = true;
    const right = outcome === 'right';
    log.push({ term: current.term, right });
    const card = $('.st-card', root);
    const feedback = $('.st-feedback', root);
    card.classList.remove('is-right', 'is-skip');
    void card.offsetWidth;
    card.classList.add(right ? 'is-right' : 'is-skip');
    feedback.textContent = right ? 'Richtig!' : 'Weiter';
    if (right) {
      sound.right();
      vibrate(40);
    } else {
      sound.skip();
      vibrate([0, 20, 40, 20]);
    }
    ctx.timeout(() => {
      answering = false;
      if (!running) return;
      card.classList.remove('is-right', 'is-skip');
      showCard();
    }, fx.reducedMotion() ? 0 : FEEDBACK_MS);
  }

  function timeUp() {
    running = false;
    endSensor();
    sound.timeUp();
    vibrate([0, 200, 80, 200]);
    const card = $('.st-card', root);
    card.classList.add('is-over');
    $('.st-word', root).textContent = 'Zeit!';
    $('.st-card-cat', root).textContent = 'Handy runter';
    ctx.timeout(showSummary, TIME_UP_MS);
  }

  // ---------- Auswertung ----------

  function showSummary() {
    const key = currentKey();
    const name = guesser();
    const last = turn + 1 >= totalTurns();

    const render = () => {
      const points = log.filter((entry) => entry.right).length;
      root.innerHTML = `
        <section class="screen st-summary">
          <p class="eyebrow">${name ? esc(name) : 'Dein Zug'}${key && teamOf(key) ? ` · ${esc(teamLabel(teamOf(key)))}` : ''}</p>
          <h1 class="st-points"><b>${points}</b> ${points === 1 ? 'Begriff' : 'Begriffe'} erraten</h1>
          ${log.length ? `
            <ul class="st-log">
              ${log.map((entry, index) => `<li><button type="button" class="${entry.right ? 'is-right' : 'is-skip'}" data-index="${index}" style="--i: ${Math.min(index, 20)}">${entry.right ? '✓' : '↻'} ${esc(entry.term)}</button></li>`).join('')}
            </ul>
            <p class="st-small">Falsch erkannt? Begriff antippen zum Umschalten.</p>` : '<p class="st-small">Kein einziger Begriff – nächstes Mal wird’s besser!</p>'}
          <button class="btn btn-primary" type="button" data-action="next">${last ? 'Zum Ergebnis' : lineup().length ? `Weiter: ${esc(nextLabel())}` : 'Nächster Zug'}</button>
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </section>`;
      for (const button of root.querySelectorAll('[data-index]')) {
        button.addEventListener('click', () => {
          const entry = log[Number(button.dataset.index)];
          entry.right = !entry.right;
          sound.tap();
          render();
        });
      }
      $('[data-action="next"]', root).addEventListener('click', () => {
        if (key) scores.set(key, scores.get(key) + log.filter((entry) => entry.right).length);
        advance();
      });
      $('[data-action="end"]', root).addEventListener('click', () => {
        if (key) scores.set(key, scores.get(key) + log.filter((entry) => entry.right).length);
        showEnd();
      });
    };
    render();
    if (log.some((entry) => entry.right)) sound.summary();
  }

  function nextLabel() {
    const order = lineup();
    if (sides.length) {
      const next = turn + 1;
      const team = sides[next % sides.length];
      return teamMember(team, Math.floor(next / sides.length)) ?? team.name;
    }
    return order[(turn + 1) % order.length];
  }

  function advance() {
    turn += 1;
    if (turn >= totalTurns()) showEnd();
    else showTurn();
  }

  // ---------- Spielende ----------

  function showEnd() {
    endSensor();
    running = false;
    if (!named) {
      showSetup();
      return;
    }
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0]?.[1] ?? 0;
    const winners = ranked.filter(([, points]) => points === best && best > 0).map(([name]) => name);
    const title = winners.length ? `${winners.map(label).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden';
    root.innerHTML = `
      <section class="screen st-end" data-leave-free>
        <span class="st-end-emoji" aria-hidden="true">🏆</span>
        <h1 class="st-end-title" aria-label="${esc(title)}">${splitLetters(title, { prefix: 'st' })}</h1>
        ${rankingList(ranked.map(([name, value]) => ({ name: label(name), value, note: teamOf(name)?.members.join(', ') })))}
        <button class="btn btn-primary" type="button" data-action="again">Nochmal</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    if (winners.length) {
      sound.win();
      fx.burst();
    }
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

function createSounds(audio) {
  return {
    tap: () => audio.tone({ freq: 880, duration: 0.04, type: 'sine', volume: 0.06 }),
    count: () => audio.tone({ freq: 660, duration: 0.12, type: 'triangle', volume: 0.18 }),
    tick: () => audio.tone({ freq: 1320, duration: 0.05, type: 'square', volume: 0.08 }),
    right: () => {
      [784, 1175].forEach((freq, index) => audio.tone({ freq, duration: 0.14, type: 'triangle', volume: 0.2, delay: index * 0.07 }));
    },
    skip: () => audio.tone({ freq: 420, slideTo: 260, duration: 0.18, type: 'sine', volume: 0.16 }),
    timeUp: () => {
      audio.tone({ freq: 196, duration: 0.7, type: 'sawtooth', volume: 0.14 });
      audio.tone({ freq: 185, duration: 0.7, type: 'square', volume: 0.06 });
    },
    summary: () => {
      [523, 659, 784].forEach((freq, index) => audio.tone({ freq, duration: 0.2, type: 'triangle', volume: 0.14, delay: index * 0.08 }));
    },
    win: () => {
      [523, 659, 784, 1047, 1319].forEach((freq, index) => audio.tone({ freq, duration: 0.32, type: 'triangle', volume: 0.15, delay: index * 0.1 }));
    },
  };
}
