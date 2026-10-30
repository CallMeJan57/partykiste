import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters, toggleList } from '../../core/ui.js';
import categories from './words.js';

const MIN_PLAYERS = 3;
const TWO_IMPOSTERS_FROM = 5; // ab so vielen Namen lassen sich zwei Imposter einstellen
const DEFAULT_CATEGORIES = ['essen', 'tiere', 'orte', 'alltag'];
const COUNTS = ['1', '2'];
const HELP = { none: 'Nichts', category: 'Kategorie', hint: 'Tipp-Wort' };
const TIMERS = ['aus', '2', '3', '5']; // Minuten Diskussion

const POINTS_GROUP = 1;    // jede unschuldige Person, wenn die Gruppe gewinnt
const POINTS_IMPOSTER = 2; // jeder Imposter, wenn er durchkommt

const FLIP_MS = 600;
const ROULETTE_STEPS = 18;
const SUSPENSE_MS = 2600;
const URGENT_SECONDS = 10;
const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M32 6C17 6 9 19 9 34v24h46V34C55 19 47 6 32 6Z" fill="currentColor"/>
    <ellipse cx="32" cy="35" rx="15" ry="16" fill="#0b0c12"/>
    <path d="M22 31l8 3M42 31l-8 3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="26" cy="37" r="3" fill="#fff"/>
    <circle cx="38" cy="37" r="3" fill="#fff"/>
  </svg>`;

// Kapuzenfigur für den Startbildschirm: misstrauische Augen schauen hin und her
const HOOD = `
  <svg class="ip-hood" viewBox="0 0 120 120" aria-hidden="true">
    <path class="ip-hood-cloak" d="M60 8C30 8 15 34 15 62v52h90V62C105 34 90 8 60 8Z"/>
    <path class="ip-hood-fold" d="M60 8c-6 14-6 30 0 46M60 8c6 14 6 30 0 46" fill="none"/>
    <ellipse cx="60" cy="64" rx="29" ry="31" fill="#07080d"/>
    <path class="ip-hood-brow" d="M40 52l14 5M80 52l-14 5"/>
    <g class="ip-hood-eyes">
      <ellipse cx="48" cy="66" rx="7.5" ry="5.5" fill="#fff"/>
      <ellipse cx="72" cy="66" rx="7.5" ry="5.5" fill="#fff"/>
      <g class="ip-hood-pupils" fill="#07080d">
        <circle cx="48" cy="66" r="3.2"/>
        <circle cx="72" cy="66" r="3.2"/>
      </g>
    </g>
  </svg>`;

export default {
  id: 'imposter',
  title: 'Imposter',
  tagline: 'Alle kennen das geheime Wort – nur einer nicht. Findet den Imposter, bevor er sich durchblufft.',
  tags: ['ab 3 Spielern', 'Namen nötig'],
  accent: '#ff3b4e',
  icon: ICON,
  styles: new URL('./imposter.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let selected = loadSelection();
  let count = COUNTS.includes(storage.get('count')) ? storage.get('count') : '1';
  let help = storage.get('help') in HELP ? storage.get('help') : 'category';
  let timer = TIMERS.includes(storage.get('timer')) ? storage.get('timer') : 'aus';
  let players = ctx.players.get();

  let scores = new Map();
  let deck = [];
  let round = 0;
  let secret = null;        // { key, word, hint }
  let imposters = new Set();
  let starter = null;
  let accused = [];
  let busy = false;         // Animation läuft – Klicks ignorieren
  let stopTimer = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function imposterCount() {
    return count === '2' && players.length >= TWO_IMPOSTERS_FROM ? 2 : 1;
  }

  function endTimer() {
    stopTimer?.();
    stopTimer = null;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endTimer();
    busy = false;
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${category.words.length} Wörter`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="ip-intro">
          ${HOOD}
          <h1 class="ip-title" data-text="Imposter">Imposter</h1>
          <p class="ip-lede">Alle kennen das geheime Wort – nur der Imposter nicht. Wer blufft?</p>
        </div>`,
      cards: [
        {
          icon: '👥',
          title: 'Mitspieler',
          body: playerEditor({ name: 'players' }),
        },
        {
          icon: '🗂️',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '⚙️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Anzahl Imposter',
              control: segmented({ name: 'count', label: 'Anzahl Imposter', options: COUNTS.map((value) => ({ value, label: value === '1' ? '1 Imposter' : '2 Imposter' })), value: count }),
              hint: '<p class="setup-note ip-count-hint"></p>',
            })}
            ${setupRow({
              label: 'Hilfe für den Imposter',
              control: segmented({ name: 'help', label: 'Hilfe für den Imposter', options: Object.entries(HELP).map(([value, label]) => ({ value, label })), value: help }),
              hint: '<p class="setup-note ip-help-hint"></p>',
            })}
            ${setupRow({
              label: 'Zeit zum Diskutieren',
              control: segmented({ name: 'timer', label: 'Zeit zum Diskutieren', options: TIMERS.map((value) => ({ value, label: value === 'aus' ? 'Ohne' : `${value} Min.` })), value: timer }),
            })}`,
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    const startButton = $('[data-action="start"]', root);
    const countHint = $('.ip-count-hint', root);
    const helpHint = $('.ip-help-hint', root);
    const update = () => {
      startButton.disabled = players.length < MIN_PLAYERS;
      countHint.textContent = count === '2' && players.length < TWO_IMPOSTERS_FROM
        ? `Zwei Imposter gibt es erst ab ${TWO_IMPOSTERS_FROM} Personen – bis dahin spielt ihr mit einem.`
        : 'Die Imposter wissen nicht voneinander.';
      helpHint.textContent = {
        none: 'Der Imposter weiß gar nichts – richtig schwer.',
        category: 'Der Imposter sieht die Kategorie, z. B. „Tiere“.',
        hint: 'Der Imposter bekommt ein Wort, das grob in die Richtung zeigt.',
      }[help];
    };

    players = bindPlayerEditor(root, 'players', {
      min: MIN_PLAYERS,
      onChange: (list) => {
        players = list;
        update();
      },
    });
    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'count', (value) => {
      count = value;
      storage.set('count', value);
      update();
    });
    bindSegmented(root, 'help', (value) => {
      help = value;
      storage.set('help', value);
      update();
    });
    bindSegmented(root, 'timer', (value) => {
      timer = value;
      storage.set('timer', value);
    });
    startButton.addEventListener('click', startGame);
    update();
  }

  function startGame() {
    scores = new Map(players.map((name) => [name, 0]));
    deck = [];
    round = 0;
    newRound();
  }

  // ---------- Neue Runde: Wort und Imposter auslosen ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => categories[key].words.map(([word, hint]) => ({ key, word, hint }))));
    }
    return deck.pop();
  }

  function newRound() {
    round += 1;
    secret = draw();
    imposters = new Set(shuffle(players).slice(0, imposterCount()));
    starter = null;
    accused = [];
    showPass(0);
  }

  // ---------- Handy reihum weitergeben ----------

  function showPass(index) {
    endTimer();
    busy = false;
    const name = players[index];
    const isImposter = imposters.has(name);

    root.innerHTML = `
      <section class="screen ip-pass">
        <div class="ip-pass-head">
          <p class="eyebrow">Runde ${round} · ${index + 1} von ${players.length}</p>
          <h1 class="ip-name">${letters(name)}</h1>
          <p class="ip-lede">Handy an ${esc(name)} – alle anderen schauen weg.</p>
        </div>
        <button class="ip-card" type="button" data-action="flip" aria-pressed="false" aria-label="Karte von ${esc(name)} aufdecken">
          <span class="ip-card-inner">
            <span class="ip-card-face ip-card-back" aria-hidden="true">
              <span class="ip-card-mark">?</span>
              <span class="ip-card-tap">Tippen zum Aufdecken</span>
            </span>
            <span class="ip-card-face ip-card-front">${isImposter ? imposterFace() : wordFace()}</span>
          </span>
        </button>
        <button class="btn btn-primary ip-pass-next" type="button" data-action="next" disabled>Erst Karte aufdecken</button>
      </section>`;

    const card = $('.ip-card', root);
    const next = $('[data-action="next"]', root);
    const last = index === players.length - 1;

    if (!fx.reducedMotion()) {
      card.animate(
        [{ opacity: 0, transform: 'translateY(60px) rotate(4deg) scale(.92)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: 120, easing: 'cubic-bezier(.2, .8, .3, 1.1)', fill: 'backwards' },
      );
    }

    // Klang und Vibration sind für alle gleich – sonst hört der Tisch, wer der Imposter ist
    card.addEventListener('click', () => {
      if (card.getAttribute('aria-pressed') === 'true') return;
      card.setAttribute('aria-pressed', 'true');
      sound.flip();
      vibrate(20);
      next.disabled = false;
      next.textContent = last ? 'Verstanden – los geht’s' : 'Verstanden – weiter';
    });

    next.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      card.setAttribute('aria-pressed', 'false');
      sound.swish();
      const go = () => (last ? showTalk() : showPass(index + 1));
      if (fx.reducedMotion()) {
        go();
        return;
      }
      // Karte dreht sich zurück und fliegt weg
      ctx.timeout(() => {
        card.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-80px) rotate(-8deg) scale(.9)' }],
          { duration: 320, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' },
        );
      }, FLIP_MS * 0.6);
      ctx.timeout(go, FLIP_MS * 0.6 + 320);
    });
  }

  function wordFace() {
    return `
      <span class="ip-face-label">Das geheime Wort</span>
      <span class="ip-face-word">${letters(secret.word)}</span>
      <span class="chip ip-face-chip">${esc(categories[secret.key].label)}</span>
      <span class="ip-face-note">Verrate es nicht zu deutlich – der Imposter hört mit.</span>`;
  }

  function imposterFace() {
    const helpLine = {
      none: '',
      category: `<span class="ip-face-help">Kategorie: <b>${esc(categories[secret.key].label)}</b></span>`,
      hint: `<span class="ip-face-help">Tipp: <b>${esc(secret.hint)}</b></span>`,
    }[help];
    return `
      <span class="ip-face-label">Du bist der</span>
      <span class="ip-face-imposter" data-text="Imposter">Imposter</span>
      ${helpLine}
      <span class="ip-face-note">Du kennst das Wort nicht. Hör gut zu und bluffe dich durch!</span>`;
  }

  // ---------- Reihum Wörter sagen und diskutieren ----------

  function showTalk() {
    busy = false;
    const minutes = timer === 'aus' ? 0 : Number(timer);
    root.innerHTML = `
      <section class="screen ip-talk">
        <div class="ip-talk-head">
          <p class="eyebrow">Wer fängt an?</p>
          <ul class="ip-roulette">${players.map((name) => `<li>${esc(name)}</li>`).join('')}</ul>
          <p class="ip-starter" aria-live="polite">&nbsp;</p>
        </div>
        <ol class="ip-rules">
          <li>Reihum sagt jeder <b>ein Wort</b>, das zum geheimen Wort passt.</li>
          <li>Nicht zu deutlich – sonst errät der Imposter es.</li>
          <li>Danach diskutieren: Wer hat geblufft?</li>
        </ol>
        ${minutes ? `
          <div class="ip-clock" role="timer">
            <svg class="ip-ring" viewBox="0 0 220 220" aria-hidden="true">
              <circle class="ip-ring-track" cx="110" cy="110" r="${RING_RADIUS}"/>
              <circle class="ip-ring-progress" cx="110" cy="110" r="${RING_RADIUS}" style="stroke-dasharray: ${RING_LENGTH}; stroke-dashoffset: 0"/>
            </svg>
            <span class="ip-time">${formatTime(minutes * 60)}</span>
          </div>` : ''}
        <button class="btn btn-primary" type="button" data-action="vote">Zur Abstimmung</button>
      </section>`;

    $('[data-action="vote"]', root).addEventListener('click', showVote);
    roulette(() => {
      if (minutes) runTimer(minutes * 60);
    });
  }

  // Ein Licht springt über die Namen, wird langsamer und bleibt stehen
  function roulette(done) {
    const items = [...root.querySelectorAll('.ip-roulette li')];
    const result = $('.ip-starter', root);
    const target = Math.floor(Math.random() * items.length);
    starter = players[target];
    const finish = () => {
      items.forEach((item, index) => item.classList.toggle('is-picked', index === target));
      result.innerHTML = `<b>${esc(starter)}</b> fängt an!`;
      sound.pick();
      vibrate(30);
      if (!fx.reducedMotion()) {
        result.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.1)', offset: 0.6 }, { opacity: 1, transform: 'none' }], { duration: 420 });
      }
      done();
    };
    if (fx.reducedMotion()) {
      finish();
      return;
    }
    // Rückwärts rechnen, damit der letzte Schritt genau beim Ziel landet
    const steps = ROULETTE_STEPS + ((target - ROULETTE_STEPS) % items.length + items.length) % items.length;
    let elapsed = 0;
    for (let step = 0; step <= steps; step++) {
      elapsed += 50 + (step / steps) ** 3 * 260;
      ctx.timeout(() => {
        items.forEach((item, index) => item.classList.toggle('is-lit', index === step % items.length));
        if (step === steps) finish();
        else sound.tick();
      }, elapsed);
    }
  }

  function runTimer(totalSeconds) {
    const screen = $('.ip-talk', root);
    const ring = $('.ip-ring-progress', root);
    const label = $('.ip-time', root);
    const total = totalSeconds * 1000;
    const end = performance.now() + total;
    let shown = totalSeconds;
    stopTimer = ctx.loop((now) => {
      const left = Math.max(0, end - now);
      ring.style.strokeDashoffset = String(RING_LENGTH * (1 - left / total));
      const whole = Math.ceil(left / 1000);
      if (whole !== shown) {
        shown = whole;
        label.textContent = formatTime(whole);
        if (whole <= URGENT_SECONDS && whole > 0) {
          screen.classList.add('is-urgent');
          audio.sounds.tick();
        }
      }
      if (left <= 0) {
        label.textContent = 'Abstimmen!';
        sound.alarm();
        vibrate([0, 200, 80, 200]);
        fx.shake();
        stopTimer = null;
        return false;
      }
    });
  }

  // ---------- Abstimmung ----------

  function showVote() {
    endTimer();
    const needed = imposters.size;
    accused = [];
    root.innerHTML = `
      <section class="screen ip-vote">
        <div class="ip-vote-head">
          <p class="eyebrow">Abstimmung</p>
          <h1 class="ip-vote-title">${needed > 1 ? 'Wer sind die Imposter?' : 'Wer ist der Imposter?'}</h1>
          <p class="ip-lede">Einigt euch und tippt ${needed > 1 ? `${needed} Namen` : 'einen Namen'} an.</p>
        </div>
        <div class="ip-suspects">
          ${players.map((name, index) => `
            <button class="ip-suspect" type="button" data-name="${esc(name)}" aria-pressed="false" style="--i: ${index}">
              <span class="ip-target" aria-hidden="true"></span>
              <span class="ip-suspect-name">${esc(name)}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn-primary" type="button" data-action="reveal" disabled>Enthüllen</button>
      </section>`;

    const revealButton = $('[data-action="reveal"]', root);
    for (const button of root.querySelectorAll('.ip-suspect')) {
      button.addEventListener('click', () => {
        const name = button.dataset.name;
        if (accused.includes(name)) {
          accused = accused.filter((other) => other !== name);
        } else {
          accused.push(name);
          if (accused.length > needed) accused.shift(); // bei einem Imposter springt die Wahl einfach um
          sound.lock();
          vibrate(12);
        }
        for (const other of root.querySelectorAll('.ip-suspect')) {
          other.setAttribute('aria-pressed', String(accused.includes(other.dataset.name)));
        }
        revealButton.disabled = accused.length !== needed;
      });
    }
    revealButton.addEventListener('click', suspense);
  }

  // Trommelwirbel, Scheinwerfer, dann die Wahrheit
  function suspense() {
    if (busy) return;
    busy = true;
    const overlay = document.createElement('div');
    overlay.className = 'ip-suspense';
    overlay.innerHTML = `
      <span class="ip-suspense-beam" aria-hidden="true"></span>
      <p class="ip-suspense-text">${letters(imposters.size > 1 ? 'Und die Imposter sind …' : 'Und der Imposter ist …')}</p>`;
    $('.ip-vote', root).append(overlay);
    sound.drumroll(SUSPENSE_MS / 1000);
    ctx.timeout(() => {
      busy = false;
      showReveal();
    }, fx.reducedMotion() ? 0 : SUSPENSE_MS);
  }

  // ---------- Auflösung ----------

  function showReveal() {
    const caught = accused.every((name) => imposters.has(name));
    const imposterNames = [...imposters];
    const names = imposterNames.map((name) => `<b>${esc(name)}</b>`).join(' und ');

    root.innerHTML = `
      <section class="screen ip-reveal ${caught ? 'is-caught' : 'is-missed'}">
        <div class="ip-verdicts">
          ${accused.map((name) => `
            <div class="ip-verdict ${imposters.has(name) ? 'is-imposter' : 'is-innocent'}">
              <span class="ip-verdict-name">${esc(name)}</span>
              <span class="ip-stamp">${imposters.has(name) ? 'Imposter' : 'Unschuldig'}</span>
            </div>`).join('')}
        </div>
        <p class="ip-reveal-title">${letters(caught ? 'Erwischt!' : 'Daneben!')}</p>
        ${caught
          ? `<div class="ip-last-chance">
               <p class="ip-lede">Letzte Chance: ${names} ${imposterNames.length > 1 ? 'dürfen' : 'darf'} das geheime Wort raten.</p>
               <div class="ip-guess-buttons">
                 <button class="btn btn-primary" type="button" data-guess="wrong">Falsch geraten – Gruppe gewinnt</button>
                 <button class="btn btn-ghost" type="button" data-guess="right">Richtig geraten – Imposter gewinnt</button>
               </div>
             </div>`
          : `<p class="ip-lede ip-real">${imposterNames.length > 1 ? 'Die Imposter waren' : 'Der Imposter war'} ${names}.</p>
             <button class="btn btn-primary" type="button" data-action="result">Weiter</button>`}
      </section>`;

    if (caught) {
      sound.caught();
      vibrate([0, 80, 40, 80]);
      celebrate(['--good', '--accent-2', '--text']);
      for (const button of root.querySelectorAll('[data-guess]')) {
        button.addEventListener('click', () => showResult(button.dataset.guess === 'right' ? 'imposter' : 'group'));
      }
    } else {
      sound.evilLaugh();
      vibrate([0, 120, 60, 120]);
      fx.shake();
      $('[data-action="result"]', root).addEventListener('click', () => showResult('imposter'));
    }
  }

  function celebrate(tokens) {
    const styles = getComputedStyle(root);
    fx.burst({ colors: tokens.map((token) => styles.getPropertyValue(token).trim()) });
  }

  // ---------- Punkte ----------

  function showResult(winner) {
    const gained = new Map();
    for (const name of players) {
      const points = winner === 'imposter'
        ? (imposters.has(name) ? POINTS_IMPOSTER : 0)
        : (imposters.has(name) ? 0 : POINTS_GROUP);
      if (points) {
        gained.set(name, points);
        scores.set(name, (scores.get(name) ?? 0) + points);
      }
    }
    if (winner === 'imposter') sound.imposterWins();
    else {
      sound.groupWins();
      celebrate(['--good', '--accent-2', '--text']);
    }

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const imposterNames = [...imposters].map(esc).join(' & ');
    root.innerHTML = `
      <section class="screen ip-result ${winner === 'imposter' ? 'is-imposter-win' : 'is-group-win'}">
        <span class="ip-result-icon" aria-hidden="true">${winner === 'imposter' ? '🕵️' : '🎉'}</span>
        <p class="ip-result-title">${letters(winner === 'imposter' ? (imposters.size > 1 ? 'Die Imposter gewinnen!' : 'Der Imposter gewinnt!') : 'Die Gruppe gewinnt!')}</p>
        <div class="ip-solution">
          <p class="eyebrow">Das geheime Wort</p>
          <p class="ip-solution-word">${esc(secret.word)}</p>
          <p class="ip-small">Imposter: ${imposterNames}</p>
        </div>
        ${rankingList(ranked.map(([name, value]) => ({ name, value, gain: gained.get(name) })), { crown: false })}
        <button class="btn btn-primary" type="button" data-action="again">Nächste Runde</button>
        <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', newRound);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
  }

  function showEnd() {
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0]?.[1] ?? 0;
    const winners = ranked.filter(([, points]) => points === best && best > 0).map(([name]) => name);
    if (winners.length) {
      sound.groupWins();
      celebrate(['--accent', '--accent-2', '--good']);
    }
    root.innerHTML = `
      <section class="screen ip-result ip-end" data-leave-free>
        <span class="ip-result-icon" aria-hidden="true">🏆</span>
        <p class="eyebrow">${round} ${round === 1 ? 'Runde' : 'Runden'} gespielt</p>
        <p class="ip-result-title">${winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden'}</p>
        ${rankingList(ranked.map(([name, value]) => ({ name, value })))}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Buchstaben, die per CSS nacheinander erscheinen (Klassen .ip-word / .ip-letter)
const letters = (text, start = 0) => splitLetters(text, { prefix: 'ip', start });

// Klänge: Karte, Glücksrad-Ticks, Trommelwirbel, Fanfare – und ein fieses Lachen
function createSounds(audio) {
  return {
    flip: () => {
      audio.noise({ duration: 0.12, volume: 0.25, cutoff: 4500 });
      audio.tone({ freq: 440, slideTo: 660, duration: 0.15, type: 'triangle', volume: 0.12, delay: 0.08 });
    },
    swish: () => audio.noise({ duration: 0.25, volume: 0.2, cutoff: 3000 }),
    tick: () => audio.tone({ freq: 1100, duration: 0.04, type: 'square', volume: 0.08 }),
    pick: () => {
      audio.tone({ freq: 660, duration: 0.1, type: 'triangle', volume: 0.18 });
      audio.tone({ freq: 990, duration: 0.25, type: 'triangle', volume: 0.18, delay: 0.1 });
    },
    lock: () => audio.tone({ freq: 220, slideTo: 330, duration: 0.1, type: 'square', volume: 0.08 }),
    alarm: () => {
      for (let i = 0; i < 6; i++) audio.tone({ freq: i % 2 ? 740 : 988, duration: 0.11, type: 'square', volume: 0.1, delay: i * 0.12 });
    },
    // Immer schnellere Schläge, am Ende ein Beckenschlag
    drumroll: (seconds) => {
      let time = 0;
      let gap = 0.09;
      while (time < seconds - 0.2) {
        audio.noise({ duration: 0.06, volume: 0.18 + (time / seconds) * 0.25, cutoff: 1400, delay: time });
        time += gap;
        gap = Math.max(0.03, gap * 0.96);
      }
      audio.noise({ duration: 1.4, volume: 0.45, cutoff: 9000, delay: seconds });
      audio.tone({ freq: 110, slideTo: 55, duration: 0.5, type: 'sine', volume: 0.4, delay: seconds });
    },
    caught: () => {
      [523, 659, 784, 1047].forEach((freq, index) => audio.tone({ freq, duration: 0.25, type: 'triangle', volume: 0.16, delay: index * 0.09 }));
    },
    // „Ha-ha-ha“ in absteigenden, kratzigen Tönen
    evilLaugh: () => {
      [330, 300, 270, 240, 200].forEach((freq, index) => {
        audio.tone({ freq, slideTo: freq * 0.85, duration: 0.13, type: 'sawtooth', volume: 0.12, delay: index * 0.16 });
      });
    },
    imposterWins: () => {
      [392, 370, 349, 311].forEach((freq, index) => audio.tone({ freq, duration: 0.3, type: 'square', volume: 0.08, delay: index * 0.18 }));
    },
    groupWins: () => {
      [523, 784, 1047].forEach((freq, index) => audio.tone({ freq, duration: 0.5, type: 'triangle', volume: 0.14, delay: index * 0.12 }));
      audio.tone({ freq: 1319, duration: 0.6, type: 'triangle', volume: 0.12, delay: 0.42 });
    },
  };
}

