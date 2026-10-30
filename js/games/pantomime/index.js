import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupScreen, splitLetters, toggleList } from '../../core/ui.js';
import categories from './terms.js';

const TIMES = ['30', '60', '90']; // Sekunden, als Text für den Segment-Schalter
const DEFAULT_TIME = '60';
const DEFAULT_CATEGORIES = ['tiere', 'berufe', 'alltag'];

// Ab so vielen Namen sagt das Spiel, wer dran ist, und zählt Punkte. Darunter wird ohne Namen gespielt.
const NAMED_MIN_PLAYERS = 2;

// In den letzten Sekunden tickt es und der Ring wird rot.
const URGENT_SECONDS = 10;

const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const CURTAIN_MS = 650;      // Vorhang auf/zu
const PREROLL_STEP_MS = 650; // 3 · 2 · 1 · Action!
const AWARD_DELAY_MS = 550;  // „+1“ kurz zeigen, dann weiter
const APPLAUSE_COUNT = 10;

const RESULT_ICONS = { guessed: '👏', timeout: '⏰', 'given-up': '🏳️' };

// Pantomime-Figur für den Startbildschirm: weißes Gesicht, Baskenmütze, Ringelshirt, Hände an der unsichtbaren Wand
const MIME = `
  <svg class="pm-mime" viewBox="0 0 160 150" aria-hidden="true">
    <defs>
      <pattern id="pm-stripes" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="6" fill="#16161d"/>
        <rect y="6" width="12" height="6" fill="#f5f5f7"/>
      </pattern>
    </defs>
    <path class="pm-mime-shirt" d="M40 150c2-26 18-38 40-38s38 12 40 38Z" fill="url(#pm-stripes)" stroke="#16161d" stroke-width="3"/>
    <g class="pm-mime-head">
      <path d="M71 106l9 12 9-12Z" fill="#e5372b"/>
      <ellipse cx="80" cy="72" rx="30" ry="36" fill="#fbfbfd" stroke="#16161d" stroke-width="3"/>
      <ellipse cx="73" cy="38" rx="31" ry="10" fill="#16161d" transform="rotate(-12 73 38)"/>
      <rect x="69" y="22" width="5" height="9" rx="2.5" fill="#16161d" transform="rotate(-12 71 26)"/>
      <path d="M61 57q7-9 14 0M85 57q7-9 14 0" fill="none" stroke="#16161d" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M68 58v-4M68 72v6M92 58v-4M92 72v6" stroke="#16161d" stroke-width="1.6" stroke-linecap="round"/>
      <g class="pm-mime-eyes" fill="#16161d">
        <ellipse cx="68" cy="65" rx="3.2" ry="4.6"/>
        <ellipse cx="92" cy="65" rx="3.2" ry="4.6"/>
      </g>
      <circle cx="62" cy="80" r="5" fill="#ff7a9c" opacity=".35"/>
      <circle cx="98" cy="80" r="5" fill="#ff7a9c" opacity=".35"/>
      <path d="M71 90q9 7 18 0q-9-4-18 0Z" fill="#e11d48"/>
    </g>
    <g class="pm-mime-hand pm-mime-hand-l">${glove(26, 92)}</g>
    <g class="pm-mime-hand pm-mime-hand-r">${glove(134, 80)}</g>
  </svg>`;

// Weißer Handschuh, Handfläche nach vorn
function glove(x, y) {
  return `
    <g transform="translate(${x} ${y})" fill="#fbfbfd" stroke="#16161d" stroke-width="2.2" stroke-linejoin="round">
      <rect x="-11.5" y="-26" width="5.5" height="22" rx="2.75"/>
      <rect x="-5.75" y="-30" width="5.5" height="26" rx="2.75"/>
      <rect x="0" y="-28" width="5.5" height="24" rx="2.75"/>
      <rect x="5.75" y="-23" width="5.5" height="19" rx="2.75"/>
      <rect x="-12" y="-8" width="24" height="22" rx="9"/>
      <rect x="-21" y="-4" width="6" height="15" rx="3" transform="rotate(-38 -18 4)"/>
    </g>`;
}

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M14 12h36v16c0 12-8 22-18 22S14 40 14 28Z" fill="currentColor"/>
    <path d="M21 24.5c2-2.4 5-2.4 7 0M36 24.5c2-2.4 5-2.4 7 0" fill="none" stroke="#10131c" stroke-width="3" stroke-linecap="round"/>
    <path d="M23 35c5 5.5 13 5.5 18 0" fill="none" stroke="#10131c" stroke-width="3" stroke-linecap="round"/>
    <path d="M24 12h2v38h-2zM38 12h2v38h-2z" fill="#10131c" opacity=".12"/>
  </svg>`;

export default {
  id: 'pantomime',
  title: 'Pantomime',
  tagline: 'Begriff ohne Worte darstellen – die anderen raten gegen die Uhr.',
  tags: ['ab 3 Spielern', 'Namen optional'],
  accent: '#3d8bff',
  icon: ICON,
  styles: new URL('./pantomime.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let selected = loadSelection();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : DEFAULT_TIME;
  let players = ctx.players.get();
  let named = false;   // true = mit Namen, wer dran ist, und Punkten
  let scores = new Map();
  let deck = [];
  let turn = 0;        // wer gerade darstellt (Index in players)
  let played = 0;      // gespielte Begriffe
  let guessed = 0;     // davon erraten
  let current = null;  // { key, term, hint }
  let stopCountdown = null;
  let busy = false;    // Vorhang oder Countdown läuft – weitere Klicks ignorieren

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function performer() {
    return named ? players[turn] : null;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endCountdown();
    busy = false;
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${category.terms.length} Begriffe`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="pm-intro">
          ${MIME}
          <h1 class="pm-title">${letters('Panto')}&shy;${letters('mime', 5)}</h1>
          <p class="pm-lede">Begriff ohne Worte darstellen – die anderen raten gegen die Uhr.</p>
        </div>`,
      cards: [
        {
          icon: '🎭',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '⏱️',
          title: 'Zeit pro Begriff',
          body: segmented({ name: 'time', label: 'Zeit pro Begriff', options: TIMES.map((value) => ({ value, label: `${value} Sek.` })), value: time }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="pm-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.pm-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? 'Reihum stellt jeder dar. Für jeden erratenen Begriff gibt es einen Punkt für dich und für den, der ihn erraten hat.'
        : 'Mit Namen sagt das Spiel, wer dran ist, und zählt Punkte. Für eine schnelle Runde einfach ohne starten.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
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
    busy = false;
    named = players.length >= NAMED_MIN_PLAYERS;
    scores = new Map(players.map((name) => [name, 0]));
    deck = [];
    turn = 0;
    played = 0;
    guessed = 0;
    showTurn();
  }

  // ---------- Wer ist dran? ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => categories[key].terms.map(([term, hint]) => ({ key, term, hint }))));
    }
    return deck.pop();
  }

  function scoreboard() {
    if (!named || !played) return '';
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    return `<ul class="chips pm-scores">${ranked.map(([name, points]) => `<li class="chip">${esc(name)} · ${points}</li>`).join('')}</ul>`;
  }

  function showTurn() {
    endCountdown();
    const name = performer();
    const head = name
      ? `<p class="eyebrow">Begriff ${played + 1} · stellt dar</p>
         <h1 class="pm-name">${letters(name)}</h1>
         <p class="pm-lede">Gib ${esc(name)} das Handy – nur ${esc(name)} darf hinschauen.</p>`
      : `<p class="eyebrow">Begriff ${played + 1}</p>
         <h1 class="pm-name">${letters('Wer stellt dar?')}</h1>
         <p class="pm-lede">Handy nehmen – nur du darfst hinschauen.</p>`;

    root.innerHTML = `
      <section class="screen pm-turn">
        <div class="pm-turn-head">${head}</div>
        ${scoreboard()}
        <button class="pm-cover" type="button" data-action="show">
          <span class="pm-stage-spot" aria-hidden="true"></span>
          <span class="pm-curtain pm-curtain-l" aria-hidden="true"></span>
          <span class="pm-curtain pm-curtain-r" aria-hidden="true"></span>
          <span class="pm-valance" aria-hidden="true"></span>
          <span class="pm-cover-sign">
            <span class="pm-cover-eye" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>
            </span>
            <span class="pm-cover-label">Begriff ansehen</span>
          </span>
        </button>
        <div class="pm-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
          <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
        </div>
      </section>`;

    $('[data-action="show"]', root).addEventListener('click', openCurtain);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);

    // Der Vorhang schließt sich für die nächste Person
    if (!fx.reducedMotion()) {
      const cover = $('.pm-cover', root);
      cover.classList.add('is-closing');
      sound.curtain();
      ctx.timeout(() => cover.classList.remove('is-closing'), CURTAIN_MS);
    }
  }

  // Vorhang auf – dahinter wartet der Begriff im Scheinwerferlicht
  function openCurtain() {
    if (busy) return;
    current = draw();
    vibrate(15);
    if (fx.reducedMotion()) {
      showTerm();
      return;
    }
    busy = true;
    sound.curtain();
    $('.pm-cover', root).classList.add('is-open');
    ctx.timeout(() => {
      busy = false;
      showTerm();
    }, CURTAIN_MS);
  }

  // ---------- Begriff (nur für die Person, die darstellt) ----------

  // Verdeckter Text: erst verschwommen, ein Tippen deckt ihn auf (und wieder zu).
  function secret({ name, text, cover, revealed = false }) {
    return `
      <button class="pm-secret pm-secret-${name}" type="button" data-secret="${name}" aria-pressed="${revealed}">
        <span class="pm-secret-text">${esc(text)}</span>
        <span class="pm-secret-cover">${esc(cover)}</span>
      </button>`;
  }

  function bindSecrets() {
    for (const button of root.querySelectorAll('[data-secret]')) {
      button.addEventListener('click', () => {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        vibrate(10);
      });
    }
  }

  function showTerm() {
    root.innerHTML = `
      <section class="screen pm-term-screen">
        <div class="pm-card">
          <span class="pm-card-spot" aria-hidden="true"></span>
          <span class="chip pm-category">${esc(categories[current.key].label)}</span>
          <p class="pm-term" aria-label="${esc(current.term)}">${letters(current.term)}</p>
          <div class="pm-help">
            <p class="eyebrow">Keine Idee?</p>
            ${secret({ name: 'hint', text: current.hint, cover: 'Tippen für einen Tipp, wie du es darstellen kannst' })}
          </div>
        </div>
        <div class="pm-actions">
          <button class="btn btn-primary" type="button" data-action="go">Los – ${time} Sekunden</button>
          <button class="btn btn-ghost" type="button" data-action="reroll">Anderer Begriff</button>
        </div>
      </section>`;

    if (!fx.reducedMotion()) {
      $('.pm-card', root).animate(
        [
          { opacity: 0, transform: 'translateY(-40px) scale(.94)' },
          { opacity: 1, transform: 'translateY(6px) scale(1.01)', offset: 0.65 },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
      sound.spot();
    }

    bindSecrets();
    $('[data-action="go"]', root).addEventListener('click', preroll);
    $('[data-action="reroll"]', root).addEventListener('click', reroll);
  }

  // Die Karte fliegt weg, eine neue kommt
  function reroll() {
    if (busy) return;
    current = draw();
    sound.swish();
    if (fx.reducedMotion()) {
      showTerm();
      return;
    }
    busy = true;
    $('.pm-card', root).animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-120%) rotate(-12deg)' }],
      { duration: 280, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' },
    );
    ctx.timeout(() => {
      busy = false;
      showTerm();
    }, 280);
  }

  // 3 · 2 · 1 · Action! – Zeit, das Handy abzulegen, bevor die Uhr läuft
  function preroll() {
    if (busy) return;
    if (fx.reducedMotion()) {
      showRunning();
      return;
    }
    busy = true;
    const overlay = document.createElement('div');
    overlay.className = 'pm-preroll';
    overlay.setAttribute('aria-live', 'assertive');
    $('.pm-term-screen', root).append(overlay);

    const steps = ['3', '2', '1', '🎬'];
    steps.forEach((step, index) => {
      ctx.timeout(() => {
        const last = index === steps.length - 1;
        overlay.innerHTML = last
          ? '<span class="pm-preroll-step is-action"><span class="pm-preroll-clap">🎬</span>Action!</span>'
          : `<span class="pm-preroll-step">${step}</span>`;
        if (last) sound.clap();
        else sound.count(index);
        vibrate(last ? 40 : 12);
      }, index * PREROLL_STEP_MS);
    });
    ctx.timeout(() => {
      busy = false;
      showRunning();
    }, steps.length * PREROLL_STEP_MS);
  }

  // ---------- Countdown ----------

  function showRunning() {
    const seconds = Number(time);
    root.innerHTML = `
      <section class="screen pm-running">
        <span class="pm-running-light" aria-hidden="true"></span>
        <p class="eyebrow pm-center">Ohne Worte · Kategorie ${esc(categories[current.key].label)}</p>
        <div class="pm-clock" role="timer" aria-live="off">
          <svg class="pm-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle class="pm-ring-track" cx="110" cy="110" r="104"/>
            <circle class="pm-ring-progress" cx="110" cy="110" r="104" style="stroke-dasharray: ${RING_LENGTH}; stroke-dashoffset: 0"/>
            <circle class="pm-ring-tip" cx="${110 + RING_RADIUS}" cy="110" r="9"/>
          </svg>
          <span class="pm-seconds">${seconds}</span>
        </div>
        <div class="pm-peek">
          <p class="pm-running-term">${esc(current.term)}</p>
          ${secret({ name: 'hint', text: current.hint, cover: 'Tipp zur Darstellung' })}
        </div>
        <div class="pm-actions">
          <button class="btn btn-primary" type="button" data-action="guessed">Erraten!</button>
          <button class="btn btn-ghost" type="button" data-action="give-up">Aufgeben</button>
        </div>
      </section>`;

    bindSecrets();
    $('[data-action="guessed"]', root).addEventListener('click', () => finish('guessed'));
    $('[data-action="give-up"]', root).addEventListener('click', () => finish('given-up'));

    const screen = $('.pm-running', root);
    const ring = $('.pm-ring-progress', root);
    const tip = $('.pm-ring-tip', root);
    const label = $('.pm-seconds', root);
    const motion = !fx.reducedMotion();
    if (motion) {
      screen.querySelector('.pm-clock').animate(
        [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
        { duration: 480, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
    }
    const total = seconds * 1000;
    const end = performance.now() + total;
    let shown = seconds;

    stopCountdown = ctx.loop((now) => {
      const left = Math.max(0, end - now);
      ring.style.strokeDashoffset = String(RING_LENGTH * (1 - left / total));
      // Leuchtender Punkt am Ende des Rings (Kreis ist um -90° gedreht, 0° = oben)
      const angle = 2 * Math.PI * (left / total);
      tip.setAttribute('cx', String(110 + RING_RADIUS * Math.cos(angle)));
      tip.setAttribute('cy', String(110 + RING_RADIUS * Math.sin(angle)));
      const whole = Math.ceil(left / 1000);
      if (whole !== shown) {
        shown = whole;
        label.textContent = String(whole);
        const urgent = whole <= URGENT_SECONDS && whole > 0;
        if (urgent) {
          screen.classList.add('is-urgent');
          audio.sounds.tick();
        }
        if (motion) {
          label.animate(
            [{ transform: `scale(${urgent ? 1.35 : 1.15})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }],
            { duration: 320, easing: 'cubic-bezier(.2, .8, .2, 1)' },
          );
        }
      }
      if (left <= 0) {
        finish('timeout');
        return false;
      }
    });
  }

  function endCountdown() {
    stopCountdown?.();
    stopCountdown = null;
  }

  // ---------- Ergebnis ----------

  function finish(outcome) {
    endCountdown();
    played += 1;
    const name = performer();
    const others = named ? players.filter((player) => player !== name) : [];

    if (outcome === 'guessed') {
      guessed += 1;
      sound.applause();
      vibrate(30);
      celebrate();
    } else if (outcome === 'timeout') {
      sound.alarm();
      vibrate([0, 120, 60, 120]);
      fx.shake();
    } else {
      sound.sadTrombone();
      vibrate([0, 120, 60, 120]);
    }

    const title = { guessed: 'Erraten!', timeout: 'Zeit um!', 'given-up': 'Aufgegeben' }[outcome];
    const award = outcome === 'guessed' && named
      ? `<div class="pm-award">
           <p class="eyebrow">Wer hat's erraten?</p>
           <div class="pm-award-buttons">
             ${others.map((player, index) => `<button class="pm-award-btn" type="button" data-player="${esc(player)}" style="--i: ${index}">${esc(player)}</button>`).join('')}
           </div>
           <button class="btn-link" type="button" data-action="next">Ohne Punkte weiter</button>
         </div>`
      : `<button class="btn btn-primary" type="button" data-action="next">${named ? `Weiter – ${esc(players[(turn + 1) % players.length])} ist dran` : 'Nächster Begriff'}</button>`;

    root.innerHTML = `
      <section class="screen pm-result pm-is-${outcome}">
        <span class="pm-result-icon" aria-hidden="true">${RESULT_ICONS[outcome]}</span>
        <p class="pm-result-title">${letters(title)}</p>
        <div class="pm-answer">
          <p class="eyebrow">${outcome === 'guessed' ? 'Der Begriff war' : 'Gesucht war'}</p>
          <p class="pm-answer-term">${esc(current.term)}</p>
        </div>
        ${award}
      </section>`;

    if (outcome === 'guessed') applauseHands();

    $('[data-action="next"]', root).addEventListener('click', nextTurn);
    for (const button of root.querySelectorAll('[data-player]')) {
      button.addEventListener('click', () => {
        if (busy) return;
        busy = true;
        const guesser = button.dataset.player;
        scores.set(name, (scores.get(name) ?? 0) + 1);
        scores.set(guesser, (scores.get(guesser) ?? 0) + 1);
        fx.toast(`+1 Punkt für ${name} und ${guesser}`);
        audio.sounds.success();
        button.classList.add('is-picked');
        button.insertAdjacentHTML('beforeend', '<span class="pm-plus" aria-hidden="true">+1</span>');
        ctx.timeout(() => {
          busy = false;
          nextTurn();
        }, fx.reducedMotion() ? 0 : AWARD_DELAY_MS);
      });
    }
  }

  function celebrate() {
    const styles = getComputedStyle(root);
    fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
  }

  // Applaus: Hände steigen vom unteren Rand auf
  function applauseHands() {
    if (fx.reducedMotion()) return;
    const layer = document.createElement('div');
    layer.className = 'pm-applause';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < APPLAUSE_COUNT; i++) {
      const hand = document.createElement('span');
      hand.textContent = i % 4 === 0 ? '🙌' : '👏';
      hand.style.left = `${4 + Math.random() * 88}%`;
      layer.append(hand);
      const drift = -30 + Math.random() * 60;
      hand.animate(
        [
          { transform: 'translateY(0) scale(.6)', opacity: 0 },
          { transform: `translateY(-30vh) translateX(${drift / 2}px) scale(1.1)`, opacity: 1, offset: 0.35 },
          { transform: `translateY(-70vh) translateX(${drift}px) scale(.9)`, opacity: 0 },
        ],
        { duration: 1600 + Math.random() * 700, delay: Math.random() * 500, easing: 'cubic-bezier(.2, .6, .4, 1)', fill: 'both' },
      );
    }
    $('.pm-result', root).append(layer);
    ctx.timeout(() => layer.remove(), 2900);
  }

  function nextTurn() {
    if (named) turn = (turn + 1) % players.length;
    showTurn();
  }

  // ---------- Spielende ----------

  function showEnd() {
    endCountdown();
    if (!played) {
      showSetup();
      return;
    }

    let title = `${guessed} von ${played} erraten`;
    let ranking = '';
    if (named) {
      const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
      const best = ranked[0][1];
      const winners = ranked.filter(([, points]) => points === best && best > 0).map(([player]) => player);
      title = winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden';
      ranking = rankingList(ranked.map(([name, value]) => ({ name, value })));
    }
    if (guessed) {
      sound.applause();
      celebrate();
    }

    root.innerHTML = `
      <section class="screen pm-result pm-end" data-leave-free>
        <span class="pm-result-icon" aria-hidden="true">🎭</span>
        <p class="eyebrow">${played} ${played === 1 ? 'Begriff' : 'Begriffe'} gespielt${named ? ` · ${guessed} erraten` : ''}</p>
        <p class="pm-result-title">${title}</p>
        ${ranking}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
    if (guessed) applauseHands();
  }
}

// Buchstaben, die per CSS nacheinander erscheinen (Klassen .pm-word / .pm-letter)
const letters = (text, start = 0) => splitLetters(text, { prefix: 'pm', start });

// Bühnenklänge aus Ton + Rauschen
function createSounds(audio) {
  return {
    curtain: () => {
      audio.noise({ duration: 0.6, volume: 0.28, cutoff: 1400 });
      audio.noise({ duration: 0.4, volume: 0.12, cutoff: 4000, delay: 0.08 });
    },
    spot: () => {
      audio.tone({ freq: 140, duration: 0.12, type: 'square', volume: 0.08 });
      audio.tone({ freq: 880, slideTo: 1320, duration: 0.25, type: 'sine', volume: 0.1, delay: 0.05 });
    },
    swish: () => audio.noise({ duration: 0.22, volume: 0.25, cutoff: 5000 }),
    count: (index) => audio.tone({ freq: 523 + index * 130, duration: 0.14, type: 'triangle', volume: 0.2 }),
    clap: () => {
      audio.noise({ duration: 0.07, volume: 0.6, cutoff: 3200 });
      audio.tone({ freq: 784, duration: 0.12, type: 'triangle', volume: 0.18, delay: 0.02 });
      audio.tone({ freq: 1175, duration: 0.3, type: 'triangle', volume: 0.18, delay: 0.1 });
    },
    // Viele kurze Klatscher in zufälligem Abstand
    applause: () => {
      for (let i = 0; i < 34; i++) {
        audio.noise({ duration: 0.05 + Math.random() * 0.04, volume: 0.12 + Math.random() * 0.2, cutoff: 2200 + Math.random() * 3000, delay: Math.random() * 1.5 });
      }
      audio.tone({ freq: 660, duration: 0.1, type: 'triangle', volume: 0.15 });
      audio.tone({ freq: 990, duration: 0.2, type: 'triangle', volume: 0.15, delay: 0.1 });
    },
    alarm: () => {
      for (let i = 0; i < 6; i++) {
        audio.tone({ freq: i % 2 ? 740 : 988, duration: 0.11, type: 'square', volume: 0.1, delay: i * 0.12 });
      }
    },
    sadTrombone: () => {
      [[392, 370], [370, 349], [349, 330]].forEach(([from, to], index) => {
        audio.tone({ freq: from, slideTo: to, duration: 0.32, type: 'sawtooth', volume: 0.1, delay: index * 0.36 });
      });
      audio.tone({ freq: 330, slideTo: 247, duration: 0.9, type: 'sawtooth', volume: 0.1, delay: 1.08 });
    },
  };
}
