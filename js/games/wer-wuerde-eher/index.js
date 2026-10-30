import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindToggleList, playerEditor, rankingList, setupScreen, toggleList } from '../../core/ui.js';
import questions from './questions.js';

// Kategorien: Bezeichnung, kurze Beschreibung und Schlucke für den, auf den die meisten zeigen.
const CATEGORIES = {
  locker: { label: 'Locker', hint: 'Harmlos, für jede Runde', sips: 1 },
  frech: { label: 'Frech', hint: 'Ehrlich und ein bisschen gemein', sips: 2 },
  pikant: { label: 'Pikant', hint: 'Flirts, Dates und Liebesleben', sips: 2 },
};

const DEFAULT_SELECTION = ['locker', 'frech'];

// Ab so vielen Namen kann man antippen, wer trinkt, und das Spiel zählt mit. Darunter ohne Namen.
const NAMED_MIN_PLAYERS = 2;

// Dauer pro Zahl beim Runterzählen 3 · 2 · 1, danach bleibt „Zeigt!“ so lange stehen
const COUNT_STEP = 800;
const SHOW_MS = 1300;
const COUNT_TONES = [440, 587, 784];

// Finger, die bei „Zeigt!“ von allen Seiten zur Mitte fliegen
const HAND_COUNT = 10;
// Bierregen, wenn jemand trinken muss
const BEER_COUNT = 16;

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="14" cy="44" r="7" fill="currentColor" opacity=".45"/>
    <circle cx="50" cy="44" r="7" fill="currentColor" opacity=".45"/>
    <circle cx="32" cy="42" r="10" fill="currentColor"/>
    <path d="M32 8v16M24.5 17 32 24.5 39.5 17" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// Startbild: Finger zeigen von allen Seiten auf das Gesicht in der Mitte – erst grübelt es, dann erschrickt es
const HERO_HANDS = 7;
const HERO = `
  <div class="wwe-hero" aria-hidden="true">
    <span class="wwe-hero-face"><i>🤔</i><i>😳</i></span>
    ${Array.from({ length: HERO_HANDS }, (_, i) => `<span class="wwe-hero-hand" style="--a: ${(360 / HERO_HANDS) * i + 90}deg; --i: ${i}"><i>👉</i></span>`).join('')}
  </div>`;

export default {
  id: 'wer-wuerde-eher',
  title: 'Wer würde eher\u00a0…?',
  tagline: 'Auf 3 zeigen alle auf jemanden – wer die meisten Finger abbekommt, trinkt.',
  tags: ['ab 3 Spielern', 'Namen optional'],
  accent: '#84cc16',
  icon: ICON,
  styles: new URL('./wer-wuerde-eher.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let players = ctx.players.get();
  let selected = loadSelection();
  let named = false;
  let deck = [];
  let number = 0;      // gespielte Fragen
  let current = null;  // { key, text }
  let votes = new Map(); // wie oft jemand die meisten Finger abbekommen hat
  let sips = new Map();
  const effects = new Set(); // Bierregen liegt außerhalb von root und wird beim Verlassen entfernt

  ctx.onCleanup(() => {
    for (const element of effects) element.remove();
  });

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
    const options = Object.entries(CATEGORIES).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${sipsLabel(category.sips)}`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="wwe-intro">
          ${HERO}
          <h1 class="wwe-title">Wer würde<br><span>eher …?</span></h1>
          <p class="wwe-lede">Countdown – auf 1 zeigen alle auf eine Person. Wer die meisten Finger abbekommt, trinkt.</p>
        </div>`,
      cards: [
        {
          icon: '👉',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="wwe-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Trinken ist kein Muss – Wasser oder Saft zählen genauso.',
    });

    const startButton = $('[data-action="start"]', root);
    const playersHint = $('.wwe-players-hint', root);
    const updateStart = () => {
      const withNames = players.length >= NAMED_MIN_PLAYERS;
      startButton.textContent = withNames ? "Los geht's" : 'Ohne Namen starten';
      playersHint.textContent = withNames
        ? 'Nach jeder Frage tippst du an, wer die meisten Finger abbekommen hat – am Ende gibt es eine Auswertung.'
        : 'Mit Namen zählt das Spiel mit, wer wie oft gewählt wurde. Für eine schnelle Runde einfach ohne starten.';
    };

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
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
    deck = [];
    number = 0;
    votes = new Map(players.map((name) => [name, 0]));
    sips = new Map(players.map((name) => [name, 0]));
    nextQuestion();
  }

  // ---------- Frage ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(selected.flatMap((key) => questions[key].map((text) => ({ key, text }))));
    }
    return deck.pop();
  }

  function nextQuestion() {
    current = draw();
    number += 1;
    showQuestion();
  }

  function tally() {
    const drunk = named ? players.filter((name) => sips.get(name) > 0) : [];
    if (!drunk.length) return '';
    const ranked = drunk.sort((a, b) => sips.get(b) - sips.get(a));
    return `
      <div class="wwe-tally">
        <p class="eyebrow">Getrunken</p>
        <ul class="chips">${ranked.map((name) => `<li class="chip">${esc(name)} · ${sips.get(name)}</li>`).join('')}</ul>
      </div>`;
  }

  function card() {
    const category = CATEGORIES[current.key];
    return `
      <div class="wwe-card">
        ${floaters()}
        <div class="wwe-card-head">
          <span class="chip wwe-category">${category.label}</span>
          <span class="eyebrow">Frage ${number}</span>
        </div>
        <p class="wwe-lead">Wer würde eher …</p>
        <p class="wwe-text">${`… ${current.text}?`.split(' ').map((word, index) => `<span class="wwe-word" style="--i: ${index}">${esc(word)}</span>`).join(' ')}</p>
      </div>`;
  }

  // Ein paar zeigende Finger schweben dekorativ im Hintergrund
  function floaters() {
    const hands = ['👉', '👈', '👆', '👇', '🫵', '👉'];
    return `<div class="wwe-floaters" aria-hidden="true">${hands.map((hand, index) => `<span style="--i: ${index}">${hand}</span>`).join('')}</div>`;
  }

  function showQuestion() {
    root.innerHTML = `
      <section class="screen wwe-question">
        ${card()}
        <button class="btn btn-primary wwe-go" type="button" data-action="count">3 · 2 · 1 – zeigen!</button>
        ${tally()}
        <div class="wwe-links">
          <button class="btn-link" type="button" data-action="skip">Andere Frage</button>
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    if (!fx.reducedMotion()) {
      $('.wwe-card', root).animate(
        [{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
    }

    $('[data-action="count"]', root).addEventListener('click', countdown);
    $('[data-action="skip"]', root).addEventListener('click', () => {
      number -= 1;
      nextQuestion();
    });
    $('[data-action="end"]', root).addEventListener('click', showEnd);
  }

  // ---------- 3 · 2 · 1 ----------

  function countdown() {
    $('[data-action="count"]', root).disabled = true;
    for (const link of root.querySelectorAll('.wwe-links button')) link.disabled = true;

    const overlay = document.createElement('div');
    overlay.className = 'wwe-overlay';
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div class="wwe-ov-rays" aria-hidden="true"></div>
      <div class="wwe-ov-ring" aria-hidden="true"></div>
      <p class="wwe-ov-num"></p>
      <p class="wwe-ov-sub">Gleich zeigen alle …</p>
      <div class="wwe-hands" aria-hidden="true"></div>`;
    $('.wwe-question', root).append(overlay);

    const digit = $('.wwe-ov-num', overlay);
    const ring = $('.wwe-ov-ring', overlay);
    const motion = !fx.reducedMotion();
    if (motion) overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });

    const steps = ['3', '2', '1'];
    const show = (index) => {
      if (index < steps.length) {
        overlay.dataset.step = steps[index];
        digit.textContent = steps[index];
        audio.tone({ freq: COUNT_TONES[index], duration: 0.16, type: 'square', volume: 0.12 });
        audio.noise({ duration: 0.12, volume: 0.25, cutoff: 900 });
        vibrate(30);
        if (motion) {
          digit.animate(
            [
              { transform: 'scale(2.8)', opacity: 0, filter: 'blur(10px)' },
              { transform: 'scale(.92)', opacity: 1, filter: 'blur(0)', offset: 0.3 },
              { transform: 'scale(1)', opacity: 1, offset: 0.45 },
              { transform: 'scale(.85)', opacity: 0.85 },
            ],
            { duration: COUNT_STEP, easing: 'cubic-bezier(.2, .8, .2, 1)' },
          );
          ring.animate(
            [{ transform: 'scale(.2)', opacity: 0.9 }, { transform: 'scale(2.4)', opacity: 0 }],
            { duration: COUNT_STEP, easing: 'cubic-bezier(.1, .7, .3, 1)' },
          );
          overlay.animate(
            [{ transform: 'translate(0, 0)' }, { transform: 'translate(-6px, 4px)' }, { transform: 'translate(5px, -3px)' }, { transform: 'translate(0, 0)' }],
            { duration: 180 },
          );
        }
        ctx.timeout(() => show(index + 1), COUNT_STEP);
        return;
      }
      reveal(overlay);
    };
    show(0);
  }

  // „Zeigt!“: Finger fliegen von allen Seiten auf die Mitte zu, Blitz und Konfetti
  function reveal(overlay) {
    const digit = $('.wwe-ov-num', overlay);
    overlay.dataset.step = 'go';
    digit.textContent = 'Zeigt!';
    $('.wwe-ov-sub', overlay).textContent = 'Auf wen zeigen die meisten?';

    audio.sounds.success();
    audio.tone({ freq: 1175, duration: 0.35, type: 'triangle', volume: 0.12, delay: 0.12 });
    audio.noise({ duration: 0.4, volume: 0.35, cutoff: 3000 });
    vibrate([0, 80, 40, 120]);
    fx.flash('#ffffff');

    if (!fx.reducedMotion()) {
      digit.animate(
        [{ transform: 'scale(3) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1) rotate(-4deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(1.06) rotate(-4deg)', opacity: 1 }],
        { duration: 520, easing: 'cubic-bezier(.3, 1.6, .5, 1)', fill: 'forwards' },
      );
      $('.wwe-ov-ring', overlay).animate(
        [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(3.2)', opacity: 0 }],
        { duration: 700, easing: 'cubic-bezier(.1, .7, .3, 1)' },
      );

      const hands = $('.wwe-hands', overlay);
      for (let i = 0; i < HAND_COUNT; i++) {
        const angle = (360 / HAND_COUNT) * i + (Math.random() - 0.5) * 16;
        const rad = (angle * Math.PI) / 180;
        const hand = document.createElement('span');
        hand.textContent = '👉';
        hands.append(hand);
        // 👉 zeigt nach rechts – so drehen, dass der Finger zur Mitte zeigt
        const turn = `rotate(${angle + 180}deg)`;
        const at = (radius) => `translate(${Math.cos(rad) * radius}vmin, ${Math.sin(rad) * radius}vmin) ${turn}`;
        hand.animate(
          [{ transform: `${at(80)} scale(.6)`, opacity: 0 }, { transform: `${at(30)} scale(1.1)`, opacity: 1, offset: 0.7 }, { transform: `${at(34)} scale(1)`, opacity: 1 }],
          { duration: 520, delay: i * 25, easing: 'cubic-bezier(.2, .9, .3, 1.2)', fill: 'both' },
        );
      }

      const box = digit.getBoundingClientRect();
      const styles = getComputedStyle(root);
      fx.burst({
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        count: 70,
        colors: ['--accent', '--accent-2', '--hot', '--warm'].map((token) => styles.getPropertyValue(token).trim()),
      });
    }

    ctx.timeout(() => {
      if (fx.reducedMotion()) {
        showVote();
        return;
      }
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(showVote, () => {});
    }, SHOW_MS);
  }

  // Bierregen über den ganzen Bildschirm
  function beerRain() {
    if (fx.reducedMotion()) return;
    const layer = document.createElement('div');
    layer.className = 'wwe-beer-rain';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < BEER_COUNT; i++) {
      const beer = document.createElement('span');
      beer.textContent = i % 5 === 0 ? '🍻' : '🍺';
      beer.style.left = `${Math.random() * 100}%`;
      layer.append(beer);
      beer.animate(
        [
          { transform: `translateY(-12vh) rotate(${-30 + Math.random() * 60}deg)`, opacity: 1 },
          { transform: `translateY(112vh) rotate(${-180 + Math.random() * 360}deg)`, opacity: 1 },
        ],
        { duration: 1300 + Math.random() * 900, delay: Math.random() * 350, easing: 'cubic-bezier(.4, 0, .9, .6)', fill: 'both' },
      );
    }
    document.body.append(layer);
    effects.add(layer);
    ctx.timeout(() => {
      layer.remove();
      effects.delete(layer);
    }, 2800);
  }

  // ---------- Wer trinkt? ----------

  function showVote() {
    const category = CATEGORIES[current.key];
    const pick = named
      ? `<div class="wwe-vote">
           <p class="eyebrow">Wer hat die meisten Finger abbekommen?</p>
           <div class="wwe-vote-buttons">
             ${players.map((name, index) => `<button class="wwe-vote-btn" type="button" data-player="${index}" aria-pressed="false" style="--i: ${index}">${esc(name)}</button>`).join('')}
           </div>
           <p class="wwe-small wwe-center">Gleichstand? Einfach mehrere antippen.</p>
         </div>
         <button class="btn btn-primary" type="button" data-action="next" disabled>Wer trinkt?</button>
         <button class="btn-link" type="button" data-action="skip-drink">Ohne Trinken weiter</button>`
      : `<p class="wwe-rule">Wer die meisten Finger abbekommt, trinkt <b>${sipsLabel(category.sips)}</b>.<br>Gleichstand? Dann trinken alle mit den meisten.</p>
         <button class="btn btn-primary" type="button" data-action="next">Nächste Frage</button>`;

    root.innerHTML = `
      <section class="screen wwe-question wwe-is-vote">
        ${card()}
        ${pick}
      </section>`;

    const nextButton = $('[data-action="next"]', root);
    const chosen = () => [...root.querySelectorAll('.wwe-vote-btn[aria-pressed="true"]')].map((button) => players[Number(button.dataset.player)]);

    for (const button of root.querySelectorAll('.wwe-vote-btn')) {
      button.addEventListener('click', () => {
        const on = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(on));
        vibrate(10);
        if (on) audio.tone({ freq: 660, slideTo: 990, duration: 0.12, type: 'triangle', volume: 0.12 });
        const names = chosen();
        nextButton.disabled = !names.length;
        nextButton.textContent = !names.length
          ? 'Wer trinkt?'
          : names.length === 1
            ? `${names[0]} trinkt ${sipsLabel(category.sips)}`
            : `${names.length > 3 ? `${names.length} Leute` : names.join(' & ')} trinken je ${sipsLabel(category.sips)}`;
      });
    }

    nextButton.addEventListener('click', () => {
      if (named) {
        const names = chosen();
        for (const name of names) {
          votes.set(name, votes.get(name) + 1);
          sips.set(name, sips.get(name) + category.sips);
        }
        audio.sounds.fail();
        beerRain();
        fx.toast(`🍺 ${names.join(' & ')} ${names.length > 1 ? 'trinken' : 'trinkt'}. Prost!`);
      }
      nextQuestion();
    });
    $('[data-action="skip-drink"]', root)?.addEventListener('click', nextQuestion);
  }

  // ---------- Spielende ----------

  function showEnd() {
    const played = number - 1; // die gerade offene Frage zählt nicht
    if (!named || !played) {
      showSetup();
      return;
    }

    const ranked = [...players].sort((a, b) => votes.get(b) - votes.get(a) || sips.get(b) - sips.get(a));
    const best = votes.get(ranked[0]);
    const leaders = ranked.filter((name) => votes.get(name) === best && best > 0);
    if (leaders.length) {
      audio.sounds.success();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
    }

    root.innerHTML = `
      <section class="screen wwe-end" data-leave-free>
        <p class="eyebrow">${played} ${played === 1 ? 'Frage' : 'Fragen'} gespielt</p>
        ${leaders.length
          ? `<p class="wwe-lead">Am ehesten würde …</p>
             <p class="wwe-end-title">${leaders.map(esc).join(' & ')}</p>`
          : '<p class="wwe-end-title">Keiner gewählt</p>'}
        ${rankingList(ranked.map((name) => ({ name, note: sipsLabel(sips.get(name)), value: `${votes.get(name)}×` })))}
        <button class="btn btn-primary" type="button" data-action="again">Neue Runde</button>
        <button class="btn-link" type="button" data-action="setup">Mitspieler &amp; Kategorien ändern</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
