import { $, esc } from '../../core/dom.js';
import { pick, shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, toggleList } from '../../core/ui.js';
import { categories, twists } from './terms.js';

const TIMES = ['20', '30', '45', '60']; // Zeichenzeit in Sekunden
const DEFAULT_TIME = '30';
const DEFAULT_CATEGORIES = ['tiere', 'essen', 'dinge'];
const CHAOS_OPTIONS = [
  { value: 'aus', label: 'Normal' },
  { value: 'an', label: 'Mit Chaos-Regeln' },
];

// Ab so vielen Namen sagt das Spiel, wer zeichnet, und zählt Punkte. Darunter wird ohne Namen gespielt.
const NAMED_MIN_PLAYERS = 2;

const COUNTDOWN_STEP = 700; // 3 · 2 · 1, bevor die Zeichenzeit läuft
const URGENT_SECONDS = 5;

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M6 30Q32 8 58 30Q32 52 6 30Z" fill="#fff"/>
    <path d="M6 30Q32 8 58 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M6 30Q32 38 58 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="M16 35l-3 6M26 37.5l-1 6.5M38 37.5l1 6.5M48 35l3 6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    <path d="M14 58c8-6 14 2 22-3s12 0 16-2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

// Großes Comic-Auge; die Lider schließen sich über die Klasse .is-closed am Wrapper.
const EYE = `
  <svg class="bz-eye" viewBox="0 0 200 124" aria-hidden="true">
    <defs><clipPath id="bz-eye-clip"><path d="M8 62Q100 -12 192 62Q100 136 8 62Z"/></clipPath></defs>
    <g clip-path="url(#bz-eye-clip)">
      <rect class="bz-eye-white" width="200" height="124"/>
      <g class="bz-eye-look">
        <circle class="bz-iris" cx="100" cy="62" r="32"/>
        <circle class="bz-pupil" cx="100" cy="62" r="15"/>
        <circle class="bz-glint" cx="111" cy="51" r="6"/>
      </g>
      <rect class="bz-lid bz-lid-top" x="0" y="-4" width="200" height="67"/>
      <rect class="bz-lid bz-lid-bottom" x="0" y="61" width="200" height="67"/>
    </g>
    <path class="bz-eye-outline" d="M8 62Q100 -12 192 62Q100 136 8 62Z"/>
    <g class="bz-lashes">
      <path d="M10 62H190"/>
      <path d="M38 63l-7 15M68 63l-3 17M100 63v18M132 63l3 17M162 63l7 15"/>
    </g>
  </svg>`;

const PENCIL = `
  <svg class="bz-pencil" viewBox="0 0 40 100" aria-hidden="true">
    <rect x="10" y="0" width="20" height="11" rx="4" fill="#ff8fa3"/>
    <rect x="10" y="9" width="20" height="11" fill="#c3c8ce"/>
    <rect x="10" y="19" width="20" height="58" fill="#f5c22e"/>
    <rect x="10" y="19" width="7" height="58" fill="#ffdd6e"/>
    <path d="M10 77H30L20 99Z" fill="#f1d3a1"/>
    <path d="M16.6 91H23.4L20 99Z" fill="#2b2b2b"/>
  </svg>`;

export default {
  id: 'blind-zeichnen',
  title: 'Blind zeichnen',
  tagline: 'Begriff merken, Augen zu und los kritzeln – die anderen raten.',
  tags: ['ab 2 Spielern', 'Papier & Stift'],
  accent: '#eab308',
  icon: ICON,
  styles: new URL('./blind-zeichnen.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let selected = loadSelection();
  let time = TIMES.includes(storage.get('time')) ? storage.get('time') : DEFAULT_TIME;
  let chaos = storage.get('chaos') === 'an' ? 'an' : 'aus';
  let players = ctx.players.get();
  let named = false;
  let points = new Map();
  let deck = [];
  let turn = 0;
  let round = 0;     // gezeichnete Begriffe
  let guessed = 0;
  let current = null; // { key, term, twist }
  let stopLoop = null;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function drawer() {
    return named ? players[turn] : null;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endLoop();
    const options = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${category.terms.length} Begriffe`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="bz-intro">
          <div class="bz-eye-wrap is-idle">${EYE}</div>
          <h1 class="bz-title">Blind zeichnen</h1>
          <p class="bz-lede">Begriff merken, Augen zu, zeichnen – die anderen raten, was das sein soll.</p>
        </div>`,
      cards: [
        {
          icon: '✏️',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '⚙️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Zeichenzeit',
              control: segmented({ name: 'time', label: 'Zeichenzeit', options: TIMES.map((value) => ({ value, label: `${value} Sek.` })), value: time }),
            })}
            ${setupRow({
              label: 'Regeln',
              control: segmented({ name: 'chaos', label: 'Regeln', options: CHAOS_OPTIONS, value: chaos }),
              hint: '<p class="setup-note">Chaos-Regeln: Jede Runde kommt eine Extra-Erschwernis dazu, z. B. „mit der schwachen Hand“.</p>',
            })}`,
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="bz-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Legt Papier und Stifte bereit.',
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.bz-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? 'Reihum zeichnet jeder. Wird der Begriff erraten, gibt es einen Punkt für dich und für den, der ihn erraten hat.'
        : 'Mit Namen sagt das Spiel, wer zeichnet, und zählt Punkte. Für eine schnelle Runde einfach ohne starten.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'time', (value) => {
      time = value;
      storage.set('time', value);
    });
    bindSegmented(root, 'chaos', (value) => {
      chaos = value;
      storage.set('chaos', value);
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
    deck = [];
    turn = 0;
    round = 0;
    guessed = 0;
    showTurn();
  }

  // ---------- Wer zeichnet? ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => categories[key].terms.map((term) => ({ key, term }))));
    }
    const next = deck.pop();
    return { ...next, twist: chaos === 'an' ? pick(twists) : null };
  }

  function scoreboard() {
    if (!named || !round) return '';
    const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
    return `<ul class="chips bz-scores">${ranked.map(([name, score]) => `<li class="chip">${esc(name)} · ${score}</li>`).join('')}</ul>`;
  }

  function showTurn() {
    endLoop();
    const name = drawer();
    root.innerHTML = `
      <section class="screen bz-turn">
        <div class="bz-head">
          <p class="eyebrow">Runde ${round + 1}${name ? ' · zeichnet' : ''}</p>
          <h1 class="bz-who">${name ? esc(name) : 'Wer zeichnet?'}</h1>
        </div>
        ${scoreboard()}
        <div class="bz-eye-wrap is-idle">${EYE}</div>
        <p class="bz-call">Alle anderen: wegschauen!</p>
        <p class="bz-small bz-center">${name ? `Nur ${esc(name)} schaut aufs Handy.` : 'Nur wer zeichnet, schaut aufs Handy.'} Papier und Stift bereit?</p>
        <div class="bz-actions">
          <button class="btn btn-primary" type="button" data-action="show">Begriff ansehen</button>
        </div>
        <div class="bz-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
          <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
        </div>
      </section>`;

    $('[data-action="show"]', root).addEventListener('click', () => {
      current = draw();
      showTerm();
    });
    $('[data-action="end"]', root).addEventListener('click', showEnd);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }

  // ---------- Begriff (nur für den, der zeichnet) ----------

  function paper(term) {
    return `
      <div class="bz-paper">
        <span class="chip bz-category">${esc(categories[current.key].label)}</span>
        <div class="bz-writing">
          <span class="bz-word">${esc(term)}</span>
          ${PENCIL}
        </div>
        <svg class="bz-underline" viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 10C40 3 70 14 104 8S170 4 196 9" pathLength="1"/>
        </svg>
      </div>`;
  }

  // Bleistift schreibt das Wort von links nach rechts, danach wird es unterstrichen.
  function writeIn(container) {
    const word = $('.bz-word', container);
    const pencil = $('.bz-pencil', container);
    const underline = $('.bz-underline path', container);
    if (fx.reducedMotion()) {
      pencil.style.display = 'none';
      return;
    }

    const width = word.offsetWidth;
    const duration = Math.min(1800, Math.max(700, 380 + word.textContent.length * 95));
    word.animate(
      [{ clipPath: 'inset(-30% 100% -30% -5%)' }, { clipPath: 'inset(-30% -5% -30% -5%)' }],
      { duration, easing: 'linear', fill: 'backwards' },
    );
    const wiggle = Array.from({ length: 13 }, (_, i) => ({
      transform: `translate(${(width * i) / 12}px, ${i % 2 ? -7 : 3}px) rotate(32deg)`,
    }));
    pencil.animate(wiggle, { duration, easing: 'linear', fill: 'forwards' }).finished.then(() => {
      pencil.animate(
        [{ transform: `translate(${width}px, 3px) rotate(32deg)`, opacity: 1 }, { transform: `translate(${width + 30}px, -30px) rotate(50deg)`, opacity: 0 }],
        { duration: 380, easing: 'ease-in', fill: 'forwards' },
      );
    }, () => {});
    underline.animate(
      [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0.98, opacity: 1, offset: 0.02 }, { strokeDashoffset: 0, opacity: 1 }],
      { duration: 420, delay: duration, easing: 'ease-out', fill: 'backwards' },
    );

    // Kratzgeräusch des Bleistifts
    const scratch = ctx.interval(() => audio.noise({ duration: 0.06, volume: 0.09, cutoff: 2600 + Math.random() * 2400 }), 75);
    ctx.timeout(() => ctx.clearInterval(scratch), duration);
  }

  function showTerm() {
    root.innerHTML = `
      <section class="screen bz-term">
        <p class="eyebrow bz-center">Merk dir den Begriff!</p>
        ${paper(current.term)}
        ${current.twist ? `<p class="bz-twist"><span>Chaos-Regel</span>${esc(current.twist)}</p>` : ''}
        <div class="bz-actions">
          <button class="btn btn-primary" type="button" data-action="go">Augen zu – los!</button>
          <button class="btn btn-ghost" type="button" data-action="reroll">Anderer Begriff</button>
        </div>
      </section>`;

    writeIn($('.bz-paper', root));
    $('[data-action="go"]', root).addEventListener('click', startDrawing);
    $('[data-action="reroll"]', root).addEventListener('click', () => {
      current = draw();
      showTerm();
    });
  }

  // ---------- Augen zu und zeichnen ----------

  function startDrawing() {
    root.innerHTML = `
      <section class="screen bz-drawing">
        <div class="bz-eye-wrap">${EYE}<span class="bz-zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span></div>
        <p class="bz-call">Augen zu!</p>
        <div class="bz-clock" role="timer">
          <p class="bz-seconds">3</p>
          <div class="bz-bar"><span></span></div>
        </div>
        ${current.twist ? `<p class="bz-twist is-small"><span>Chaos-Regel</span>${esc(current.twist)}</p>` : ''}
        <div class="bz-actions">
          <button class="btn btn-primary" type="button" data-action="done">Fertig gezeichnet</button>
        </div>
      </section>`;

    const eye = $('.bz-eye-wrap', root);
    const seconds = $('.bz-seconds', root);
    const call = $('.bz-call', root);
    $('[data-action="done"]', root).addEventListener('click', () => finishDrawing(false));

    // Lider schließen sich
    requestAnimationFrame(() => eye.classList.add('is-closed'));
    audio.tone({ freq: 520, slideTo: 260, duration: 0.25, type: 'sine', volume: 0.15 });
    vibrate(40);

    const steps = ['3', '2', '1'];
    const countdown = (index) => {
      if (index < steps.length) {
        seconds.textContent = steps[index];
        audio.tone({ freq: 660, duration: 0.12, type: 'triangle', volume: 0.2 });
        ctx.timeout(() => countdown(index + 1), COUNTDOWN_STEP);
        return;
      }
      call.textContent = 'Zeichnen!';
      eye.classList.add('is-sleeping');
      audio.tone({ freq: 990, duration: 0.3, type: 'triangle', volume: 0.22 });
      vibrate(80);
      runClock();
    };
    ctx.timeout(() => countdown(0), 450);
  }

  function runClock() {
    const box = $('.bz-clock', root);
    const label = $('.bz-seconds', root);
    const bar = $('.bz-bar span', root);
    const total = Number(time) * 1000;
    const end = performance.now() + total;
    let shown = null;

    stopLoop = ctx.loop((now) => {
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
        stopLoop = null;
        finishDrawing(true);
        return false;
      }
    });
  }

  function endLoop() {
    stopLoop?.();
    stopLoop = null;
  }

  function finishDrawing(timeUp) {
    endLoop();
    if (timeUp) {
      // Wecker-Klingeln
      for (let i = 0; i < 6; i++) audio.tone({ freq: i % 2 ? 1320 : 1760, duration: 0.07, type: 'square', volume: 0.08, delay: i * 0.08 });
      vibrate([0, 120, 60, 120]);
    }
    showGuess(timeUp);
  }

  // ---------- Raten und auflösen ----------

  function showGuess(timeUp) {
    root.innerHTML = `
      <section class="screen bz-guess">
        <div class="bz-eye-wrap is-closed">${EYE}</div>
        <p class="bz-call">${timeUp ? 'Zeit um – Augen auf!' : 'Augen auf!'}</p>
        <p class="bz-small bz-center">Zeigt das Kunstwerk herum. Was soll das sein? Ratet!</p>
        <div class="bz-reveal-slot"></div>
        <div class="bz-actions">
          <button class="btn btn-primary" type="button" data-action="reveal">Auflösen</button>
        </div>
      </section>`;

    const eye = $('.bz-eye-wrap', root);
    ctx.timeout(() => {
      eye.classList.remove('is-closed');
      eye.classList.add('is-surprised');
      audio.tone({ freq: 300, slideTo: 900, duration: 0.2, type: 'sine', volume: 0.15 });
    }, 250);
    $('[data-action="reveal"]', root).addEventListener('click', reveal);
  }

  function reveal() {
    const name = drawer();
    const others = named ? players.filter((player) => player !== name) : [];
    $('.bz-reveal-slot', root).innerHTML = paper(current.term);
    $('.bz-call', root).textContent = 'Gesucht war …';
    $('.bz-small', root).remove();
    $('.bz-eye-wrap', root).remove();
    writeIn($('.bz-paper', root));
    audio.sounds.blip();

    const actions = $('.bz-actions', root);
    actions.innerHTML = named
      ? `<div class="bz-award">
           <p class="eyebrow">Wer hat's erraten?</p>
           <div class="bz-award-buttons">
             ${others.map((player) => `<button class="bz-award-btn" type="button" data-player="${esc(player)}">${esc(player)}</button>`).join('')}
             <button class="bz-award-btn bz-award-none" type="button" data-player="">Keiner</button>
           </div>
         </div>`
      : `<button class="btn btn-primary" type="button" data-action="guessed">Erraten!</button>
         <button class="btn btn-ghost" type="button" data-action="missed">Nicht erraten</button>`;

    const next = (guesser) => {
      round += 1;
      if (guesser !== null) {
        guessed += 1;
        audio.sounds.success();
        const styles = getComputedStyle(root);
        fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
        if (name && guesser) {
          points.set(name, points.get(name) + 1);
          points.set(guesser, points.get(guesser) + 1);
          fx.toast(`+1 Punkt für ${name} und ${guesser}`);
        }
      } else {
        audio.sounds.fail();
      }
      if (named) turn = (turn + 1) % players.length;
      showTurn();
    };

    for (const button of actions.querySelectorAll('[data-player]')) {
      button.addEventListener('click', () => next(button.dataset.player || null));
    }
    $('[data-action="guessed"]', actions)?.addEventListener('click', () => next(''));
    $('[data-action="missed"]', actions)?.addEventListener('click', () => next(null));
  }

  // ---------- Spielende ----------

  function showEnd() {
    endLoop();
    if (!round) {
      showSetup();
      return;
    }

    let title = `${guessed} von ${round} erraten`;
    let ranking = '';
    if (named) {
      const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
      const best = ranked[0][1];
      const winners = ranked.filter(([, score]) => score === best && best > 0).map(([player]) => player);
      title = winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden';
      ranking = rankingList(ranked.map(([name, value]) => ({ name, value })));
    }
    if (guessed) {
      audio.sounds.success();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
    }

    root.innerHTML = `
      <section class="screen bz-end" data-leave-free>
        <p class="eyebrow">${round} ${round === 1 ? 'Kunstwerk' : 'Kunstwerke'} gezeichnet${named ? ` · ${guessed} erraten` : ''}</p>
        <p class="bz-end-title">${title}</p>
        ${ranking}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
