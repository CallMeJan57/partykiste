import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters, toggleList } from '../../core/ui.js';
import levels from './cards.js';

const DEFAULT_LEVELS = ['leicht', 'mittel'];
const TIMES = ['45', '60', '90'];       // Sekunden pro Zug
const ROUND_COUNTS = ['2', '3', '5'];   // Züge pro Team
const TEAM_COUNTS = ['2', '3', '4'];
const SKIP_RULES = [
  { value: 'free', label: 'Kostenlos' },
  { value: 'cost', label: '−1 Punkt' },
];

const TEAMS = [
  { name: 'Team Feuer', emoji: '🔥', color: '#ff5a36' },
  { name: 'Team Eis', emoji: '❄️', color: '#38a9f0' },
  { name: 'Team Gift', emoji: '🧪', color: '#34c46b' },
  { name: 'Team Blitz', emoji: '⚡', color: '#eab308' },
];

// Pro Team mindestens so viele Namen, damit jemand erklärt und jemand rät
const MIN_TEAM_SIZE = 2;

const URGENT_SECONDS = 10;  // ab hier tickt es und die Lunte wird rot
const LONG_WORD = 12;       // ab so vielen Zeichen wird der Begriff kleiner gesetzt
const COUNT_STEP_MS = 650;  // 3 · 2 · 1 · Los!
const EXIT_MS = 480;        // Karte fliegt weg
const STAMP_MS = 620;       // großer „Tabu!“-Stempel
const TIME_UP_MS = 1500;    // „Zeit!“ bleibt kurz stehen

const OUTCOMES = {
  right: { icon: '✓', points: 1 },
  tabu: { icon: '✕', points: -1 },
  skip: { icon: '⏭', points: 0 },
};

const ICON = `
  <svg viewBox="0 0 64 64">
    <rect x="14" y="8" width="36" height="48" rx="6" fill="#fff4e0" transform="rotate(-8 32 32)"/>
    <path d="M22 22h20M22 31h20M22 40h14" stroke="#c9b79c" stroke-width="4" stroke-linecap="round" transform="rotate(-8 32 32)"/>
    <circle cx="44" cy="44" r="15" fill="#e11d48"/>
    <path d="M34 34l20 20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </svg>`;

// Startbild: aufgefächerte Karten, gesperrte Wörter werden durchgestrichen, dann knallt der Stempel drauf
const HERO = `
  <div class="tb-hero" aria-hidden="true">
    <span class="tb-hero-card is-back-left"></span>
    <span class="tb-hero-card is-back-right"></span>
    <span class="tb-hero-card is-front">
      <b>Auto</b>
      <i>PKW</i><i>Fahren</i><i>Reifen</i><i>Straße</i><i>Motor</i>
    </span>
    <span class="tb-hero-stamp">Tabu!</span>
  </div>`;

export default {
  id: 'tabu',
  title: 'Tabu',
  tagline: 'Begriffe erklären, ohne die fünf gesperrten Wörter zu sagen. Team gegen Team.',
  tags: ['ab 4 Spielern', 'Teams'],
  accent: '#e11d48',
  icon: ICON,
  styles: new URL('./tabu.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let selected = loadSelection();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : '60';
  let rounds = ROUND_COUNTS.includes(storage.get('rounds')) ? storage.get('rounds') : '3';
  let teamCount = TEAM_COUNTS.includes(storage.get('teams')) ? storage.get('teams') : '2';
  let skipRule = SKIP_RULES.some((rule) => rule.value === storage.get('skip')) ? storage.get('skip') : 'free';
  let players = ctx.players.get();
  let assignment = storage.get('assignment', {}); // Name → Nummer des Teams, bleibt gespeichert

  let sides = [];      // { name, emoji, color, members, score }
  let turn = 0;        // laufender Zug über alle Teams
  let deck = [];
  let current = null;  // { word, taboo, level }
  let log = [];        // { word, outcome, points } des laufenden Zugs
  let gained = 0;
  let running = false;
  let stopClock = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('levels');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in levels) : [];
    return valid.length ? valid : DEFAULT_LEVELS;
  }

  function side() {
    return sides[turn % sides.length];
  }

  function roundNumber() {
    return Math.floor(turn / sides.length) + 1;
  }

  function explainer(team) {
    return team.members.length ? team.members[(roundNumber() - 1) % team.members.length] : null;
  }

  function teamSize(index) {
    return players.filter((name) => assignment[name] === index).length;
  }

  // Neue Namen kommen ins kleinste Team, und jedes Team behält genug Leute
  function syncAssignment(count) {
    const next = {};
    for (const name of players) {
      if (assignment[name] < count) next[name] = assignment[name];
    }
    assignment = next;
    const sizes = () => Array.from({ length: count }, (_, index) => teamSize(index));
    for (const name of shuffle(players).filter((entry) => !(entry in assignment))) {
      assignment[name] = sizes().indexOf(Math.min(...sizes()));
    }
    while (Math.min(...sizes()) < MIN_TEAM_SIZE) {
      const largest = sizes().indexOf(Math.max(...sizes()));
      const moved = players.findLast((name) => assignment[name] === largest);
      assignment[moved] = sizes().indexOf(Math.min(...sizes()));
    }
    storage.set('assignment', assignment);
  }

  // Reichen die Namen nicht für alle Teams, spielen die Teams ohne Namen
  function buildSides() {
    const count = Number(teamCount);
    const enough = players.length >= count * MIN_TEAM_SIZE;
    if (enough) syncAssignment(count);
    return TEAMS.slice(0, count).map((team, index) => ({
      ...team,
      score: 0,
      members: enough ? players.filter((name) => assignment[name] === index) : [],
    }));
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    const options = Object.entries(levels).map(([value, level]) => ({
      value,
      label: `${level.emoji} ${level.label}`,
      hint: `${level.hint} · ${level.cards.length} Karten`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="tb-intro">
          ${HERO}
          <h1 class="tb-title">Tabu</h1>
          <p class="tb-lede">Erkläre den Begriff. Sag bloß keins der fünf gesperrten Wörter.</p>
        </div>`,
      cards: [
        {
          icon: '🎚️',
          title: 'Schwierigkeit',
          count: 'levels',
          body: toggleList({ name: 'levels', label: 'Schwierigkeit wählen', options, values: selected }),
        },
        {
          icon: '⏱️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Zeit pro Zug',
              control: segmented({ name: 'time', label: 'Zeit pro Zug', options: TIMES.map((value) => ({ value, label: `${value} s` })), value: time }),
            })}
            ${setupRow({
              label: 'Züge pro Team',
              control: segmented({ name: 'rounds', label: 'Züge pro Team', options: ROUND_COUNTS.map((value) => ({ value, label: value })), value: rounds }),
            })}
            ${setupRow({
              label: 'Karte überspringen',
              control: segmented({ name: 'skip', label: 'Karte überspringen', options: SKIP_RULES, value: skipRule }),
            })}`,
          note: 'Richtig +1, Tabu-Wort gesagt −1.',
        },
        {
          icon: '👥',
          title: 'Teams',
          body: `
            ${setupRow({
              label: 'Anzahl Teams',
              control: segmented({ name: 'teams', label: 'Anzahl Teams', options: TEAM_COUNTS.map((value) => ({ value, label: value })), value: teamCount }),
            })}
            ${playerEditor({ name: 'players' })}
            <div class="tb-teams"></div>`,
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">Los geht\'s</button>',
    });

    const teamsBox = $('.tb-teams', root);
    let picked = null; // angetippter Name, der das Team wechseln soll

    const renderTeams = () => {
      const preview = buildSides();
      if (!preview[0].members.length) {
        picked = null;
        teamsBox.innerHTML = `<p class="tb-small">Ab ${Number(teamCount) * MIN_TEAM_SIZE} Namen teilt das Spiel die Teams ein und sagt, wer erklärt. Sonst einigt ihr euch selbst.</p>`;
        return;
      }
      if (!players.includes(picked)) picked = null;
      teamsBox.innerHTML = `
        <ul class="tb-team-list">
          ${preview.map((team, index) => `
            <li class="${picked && assignment[picked] !== index ? 'is-target' : ''}" style="--team: ${team.color}" data-team="${index}">
              <b>${team.emoji} ${team.name}</b>
              <div class="tb-members">
                ${team.members.map((name) => `<button class="tb-member" type="button" data-name="${esc(name)}" aria-pressed="${name === picked}">${esc(name)}</button>`).join('')}
              </div>
            </li>`).join('')}
        </ul>
        <p class="tb-small">${picked ? `Wohin soll ${esc(picked)}? Team oder Namen zum Tauschen antippen.` : 'Name antippen, um das Team zu wechseln.'}</p>
        <button class="btn-link" type="button" data-action="mix">Teams neu mischen</button>`;
    };

    const changeTeams = () => {
      picked = null;
      storage.set('assignment', assignment);
      sound.deal();
      vibrate(10);
      renderTeams();
    };

    teamsBox.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="mix"]')) {
        assignment = {};
        changeTeams();
        return;
      }
      const name = event.target.closest('[data-name]')?.dataset.name;
      const team = event.target.closest('[data-team]');
      if (name && (!picked || assignment[name] === assignment[picked])) {
        picked = name === picked ? null : name;
        renderTeams();
      } else if (name) {
        [assignment[name], assignment[picked]] = [assignment[picked], assignment[name]];
        changeTeams();
      } else if (team && picked && Number(team.dataset.team) !== assignment[picked]) {
        if (teamSize(assignment[picked]) <= MIN_TEAM_SIZE) {
          fx.toast(`Jedes Team braucht mindestens ${MIN_TEAM_SIZE} Personen`);
          return;
        }
        assignment[picked] = Number(team.dataset.team);
        changeTeams();
      }
    });

    bindToggleList(root, 'levels', (values) => {
      selected = values;
      storage.set('levels', values);
    });
    bindSegmented(root, 'time', (value) => {
      time = value;
      storage.set('time', value);
    });
    bindSegmented(root, 'rounds', (value) => {
      rounds = value;
      storage.set('rounds', value);
    });
    bindSegmented(root, 'skip', (value) => {
      skipRule = value;
      storage.set('skip', value);
    });
    bindSegmented(root, 'teams', (value) => {
      teamCount = value;
      storage.set('teams', value);
      renderTeams();
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        renderTeams();
      },
    });
    renderTeams();
    $('[data-action="start"]', root).addEventListener('click', startGame);
  }

  function startGame() {
    sides = buildSides();
    turn = 0;
    deck = [];
    showHandover();
  }

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((level) => levels[level].cards.map(([word, ...taboo]) => ({ word, taboo, level }))));
    }
    return deck.pop();
  }

  // ---------- Übergabe an das nächste Team ----------

  function showHandover() {
    const team = side();
    const name = explainer(team);
    root.innerHTML = `
      <section class="screen tb-handover" style="--team: ${team.color}">
        <span class="tb-wipe" aria-hidden="true"></span>
        <p class="eyebrow">Zug ${roundNumber()} von ${rounds}</p>
        <span class="tb-badge" aria-hidden="true">${team.emoji}</span>
        <h1 class="tb-team-name" aria-label="${team.name}">${splitLetters(team.name, { prefix: 'tb' })}</h1>
        <p class="tb-explainer">${name ? `<b>${esc(name)}</b> erklärt` : 'Eine Person aus dem Team erklärt'}</p>
        <p class="tb-small">Die anderen Teams schauen mit aufs Handy und rufen „Tabu!“, sobald ein gesperrtes Wort fällt.</p>
        <button class="btn btn-primary" type="button" data-action="ready">Bereit</button>
      </section>`;
    sound.whoosh();
    $('[data-action="ready"]', root).addEventListener('click', countdown, { once: true });
  }

  function countdown() {
    if (fx.reducedMotion()) {
      showRunning();
      return;
    }
    root.innerHTML = `<section class="screen tb-count" style="--team: ${side().color}"><span class="tb-count-number" aria-live="polite"></span></section>`;
    const number = $('.tb-count-number', root);
    const steps = ['3', '2', '1', 'Los!'];
    steps.forEach((step, index) => {
      ctx.timeout(() => {
        number.textContent = step;
        number.classList.remove('is-pop');
        void number.offsetWidth; // Animation neu starten
        number.classList.add('is-pop');
        sound.count(index === steps.length - 1);
      }, index * COUNT_STEP_MS);
    });
    ctx.timeout(showRunning, steps.length * COUNT_STEP_MS);
  }

  // ---------- Der Zug: Karten erklären, gegen die Zeit ----------

  function skipPoints() {
    return skipRule === 'cost' ? -1 : OUTCOMES.skip.points;
  }

  function showRunning() {
    const team = side();
    const name = explainer(team);
    log = [];
    gained = 0;
    running = true;

    root.innerHTML = `
      <section class="screen tb-run" style="--team: ${team.color}">
        <div class="tb-bar">
          <span class="tb-chip">${team.emoji} ${name ? esc(name) : team.name}</span>
          <span class="tb-time" role="timer">${time}</span>
          <span class="tb-chip tb-gain"><b data-gained>0</b> Pkt.</span>
        </div>
        <div class="tb-fuse" aria-hidden="true"><i></i></div>
        <div class="tb-table">
          <span class="tb-deck is-far" aria-hidden="true"></span>
          <span class="tb-deck is-near" aria-hidden="true"></span>
        </div>
        <div class="tb-buttons">
          <button class="tb-btn is-tabu" type="button" data-outcome="tabu"><b>Tabu!</b><small>−1</small></button>
          <button class="tb-btn is-skip" type="button" data-outcome="skip"><b>Weiter</b><small>${skipPoints() ? '−1' : 'frei'}</small></button>
          <button class="tb-btn is-right" type="button" data-outcome="right"><b>Richtig</b><small>+1</small></button>
        </div>
      </section>`;

    for (const button of root.querySelectorAll('[data-outcome]')) {
      button.addEventListener('click', () => resolve(button.dataset.outcome));
    }
    dealCard();
    startClock();
  }

  function startClock() {
    const total = Number(time) * 1000;
    const started = performance.now();
    const label = $('.tb-time', root);
    const fuse = $('.tb-fuse', root);
    const flame = $('.tb-fuse i', root);
    let shown = Number(time);

    stopClock = ctx.loop((now) => {
      const left = Math.max(0, total - (now - started));
      flame.style.transform = `scaleX(${left / total})`;
      const seconds = Math.ceil(left / 1000);
      if (seconds !== shown) {
        shown = seconds;
        label.textContent = String(seconds);
        if (seconds <= URGENT_SECONDS && seconds > 0) {
          fuse.classList.add('is-urgent');
          label.classList.add('is-urgent');
          sound.tick();
          if (!fx.reducedMotion()) label.animate([{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
        }
      }
      if (left > 0) return true;
      timeUp();
      return false;
    });
  }

  function dealCard() {
    current = draw();
    const level = levels[current.level];
    const card = document.createElement('article');
    card.className = 'tb-card is-live';
    card.innerHTML = `
      <span class="tb-level">${level.emoji} ${level.label}</span>
      <h2 class="tb-word${current.word.length >= LONG_WORD ? ' is-long' : ''}" lang="de">${esc(current.word)}</h2>
      <p class="tb-rule">Nicht sagen</p>
      <ul class="tb-taboo">
        ${current.taboo.map((word, index) => `<li style="--i: ${index}">${esc(word)}</li>`).join('')}
      </ul>
      <span class="tb-tick" aria-hidden="true">✓</span>`;
    $('.tb-table', root).append(card);
    sound.deal();
  }

  function resolve(outcome) {
    if (!running) return;
    const points = outcome === 'skip' ? skipPoints() : OUTCOMES[outcome].points;
    log.push({ word: current.word, outcome, points });
    side().score += points;
    gained += points;
    $('[data-gained]', root).textContent = formatPoints(gained);

    const card = $('.tb-card.is-live', root);
    if (outcome === 'tabu') tearCard(card);
    else flyOff(card, outcome);
    if (points) popPoints(points);
    feedback(outcome);
    dealCard();
  }

  function flyOff(card, outcome) {
    card.classList.remove('is-live');
    card.classList.add(`is-${outcome}`);
    ctx.timeout(() => card.remove(), EXIT_MS);
  }

  // Tabu: Die Karte reißt mittendurch, die Fetzen fallen herunter, der Stempel knallt drauf
  function tearCard(card) {
    const table = $('.tb-table', root);
    for (const half of ['left', 'right']) {
      const piece = card.cloneNode(true);
      piece.className = `tb-card tb-tear-${half}`;
      table.append(piece);
      ctx.timeout(() => piece.remove(), EXIT_MS * 1.5);
    }
    card.remove();

    const stamp = document.createElement('span');
    stamp.className = 'tb-big-stamp';
    stamp.textContent = 'Tabu!';
    table.append(stamp);
    ctx.timeout(() => stamp.remove(), STAMP_MS);
  }

  function popPoints(points) {
    const pop = document.createElement('span');
    pop.className = `tb-pop ${points > 0 ? 'is-plus' : 'is-minus'}`;
    pop.textContent = formatPoints(points);
    $('.tb-table', root).append(pop);
    ctx.timeout(() => pop.remove(), EXIT_MS * 1.5);
  }

  function feedback(outcome) {
    if (outcome === 'right') {
      sound.right();
      vibrate(15);
      const box = $('.tb-table', root).getBoundingClientRect();
      fx.burst({ x: box.left + box.width / 2, y: box.top + box.height * 0.3, count: 14, colors: ['#34c46b', '#a7f3c1', '#ffffff'] });
    } else if (outcome === 'tabu') {
      sound.tabu();
      vibrate([0, 80, 40, 120]);
      fx.flash('#ff2d3f');
      fx.shake();
    } else {
      sound.skip();
    }
  }

  function timeUp() {
    running = false;
    stopClock = null;
    sound.timeUp();
    vibrate([0, 120, 60, 200]);
    for (const button of root.querySelectorAll('[data-outcome]')) button.disabled = true;
    const banner = document.createElement('div');
    banner.className = 'tb-timeup';
    banner.innerHTML = `<span>Zeit!</span>`;
    $('.tb-run', root).append(banner);
    ctx.timeout(showSummary, TIME_UP_MS);
  }

  // ---------- Auswertung des Zugs ----------

  function showSummary() {
    const team = side();
    const last = turn + 1 >= sides.length * Number(rounds);
    const nextTeam = sides[(turn + 1) % sides.length];
    const best = Math.max(1, ...sides.map((entry) => Math.abs(entry.score)));

    root.innerHTML = `
      <section class="screen tb-summary" style="--team: ${team.color}">
        <p class="eyebrow">${team.emoji} ${team.name} · Zug ${roundNumber()} von ${rounds}</p>
        <h1 class="tb-delta">${formatPoints(gained)} ${Math.abs(gained) === 1 ? 'Punkt' : 'Punkte'}</h1>
        ${log.length ? `
          <ul class="tb-log">
            ${log.map((entry, index) => `<li class="is-${entry.outcome}" style="--i: ${Math.min(index, 14)}"><span aria-hidden="true">${OUTCOMES[entry.outcome].icon}</span> ${esc(entry.word)}</li>`).join('')}
          </ul>` : '<p class="tb-small">Keine einzige Karte. Das geht besser.</p>'}
        <ul class="tb-board">
          ${[...sides].sort((a, b) => b.score - a.score).map((entry, index) => `
            <li class="${entry === team ? 'is-current' : ''}" style="--team: ${entry.color}; --share: ${Math.max(0, entry.score) / best}; --i: ${index}">
              <span>${entry.emoji} ${entry.name}</span>
              <b>${String(entry.score).replace('-', '−')}</b>
              <i></i>
            </li>`).join('')}
        </ul>
        <button class="btn btn-primary" type="button" data-action="next">${last ? 'Zum Ergebnis' : `Weiter: ${nextTeam.name}`}</button>
        <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
      </section>`;

    $('[data-action="next"]', root).addEventListener('click', advance);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
    if (gained > 0) sound.summary();
  }

  function advance() {
    turn += 1;
    if (turn >= sides.length * Number(rounds)) showEnd();
    else showHandover();
  }

  // ---------- Spielende ----------

  function showEnd() {
    const ranked = [...sides].sort((a, b) => b.score - a.score);
    const winners = ranked.filter((team) => team.score === ranked[0].score);
    const tie = winners.length > 1;
    const title = tie ? 'Unentschieden!' : `${winners[0].name} gewinnt!`;

    root.innerHTML = `
      <section class="screen tb-end" data-leave-free style="--team: ${tie ? 'var(--accent)' : winners[0].color}">
        <span class="tb-badge" aria-hidden="true">${tie ? '🤝' : winners[0].emoji}</span>
        <h1 class="tb-end-title" aria-label="${esc(title)}">${splitLetters(title, { prefix: 'tb' })}</h1>
        ${rankingList(ranked.map((team) => ({ name: `${team.emoji} ${team.name}`, value: String(team.score).replace('-', '−'), note: team.members.join(', ') })))}
        <button class="btn btn-primary" type="button" data-action="again">Nochmal</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;

    sound.win();
    fx.burst({ colors: winners.map((team) => team.color).concat('#ffffff', '#ffd166') });
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

function formatPoints(points) {
  if (points > 0) return `+${points}`;
  return String(points).replace('-', '−');
}

function createSounds(audio) {
  return {
    deal: () => audio.noise({ duration: 0.07, volume: 0.12, cutoff: 3200 }),
    whoosh: () => audio.noise({ duration: 0.35, volume: 0.2, cutoff: 1800 }),
    count: (go) => audio.tone({ freq: go ? 1047 : 523, duration: go ? 0.3 : 0.12, type: 'triangle', volume: 0.2 }),
    tick: () => audio.tone({ freq: 1320, duration: 0.05, type: 'square', volume: 0.08 }),
    right: () => {
      [659, 988].forEach((freq, index) => audio.tone({ freq, duration: 0.14, type: 'triangle', volume: 0.18, delay: index * 0.07 }));
    },
    tabu: () => {
      audio.tone({ freq: 150, duration: 0.42, type: 'sawtooth', volume: 0.24 });
      audio.tone({ freq: 156, duration: 0.42, type: 'square', volume: 0.1 });
      audio.noise({ duration: 0.14, volume: 0.32, cutoff: 900 });
    },
    skip: () => audio.tone({ freq: 500, slideTo: 300, duration: 0.12, type: 'sine', volume: 0.14 }),
    timeUp: () => {
      [880, 880, 880].forEach((freq, index) => audio.tone({ freq, duration: 0.22, type: 'square', volume: 0.12, delay: index * 0.26 }));
    },
    summary: () => {
      [523, 659, 784].forEach((freq, index) => audio.tone({ freq, duration: 0.2, type: 'triangle', volume: 0.14, delay: index * 0.08 }));
    },
    win: () => {
      [523, 659, 784, 1047, 1319].forEach((freq, index) => audio.tone({ freq, duration: 0.34, type: 'triangle', volume: 0.15, delay: index * 0.1 }));
    },
  };
}
