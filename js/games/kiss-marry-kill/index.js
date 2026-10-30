import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, segmented, setupScreen, toggleList } from '../../core/ui.js';
import categories from './characters.js';
import images from './images.js';

const GENDERS = {
  female: { label: 'Weiblich' },
  male: { label: 'Männlich' },
  mixed: { label: 'Gemischt' },
};

const ACTIONS = ['kiss', 'marry', 'kill'];
const ACTION_LABELS = { kiss: 'Kiss', marry: 'Marry', kill: 'Kill' };

const MARKS = { kiss: '💋', marry: '💍', kill: '💀' };

// Ab so vielen Namen sagt das Spiel reihum, wer entscheiden muss
const NAMED_MIN_PLAYERS = 2;

const DEFAULT_CATEGORIES = ['hollywood', 'musik', 'disney', 'marvel'];
const NAMES_PER_ROUND = 3;

const DEAL_STAGGER = 110; // ms zwischen zwei ausgeteilten Karten
const EXIT_MS = 420;
const EXIT_STAGGER = 60;
const FLIP_MS = 200;
const VERDICT_DELAY = 450; // erst die Wahl-Animation, dann das „Urteil“

// Wohin eine Karte beim Rundenwechsel verschwindet – je nach Schicksal.
const EXIT_FRAMES = {
  kiss: { transform: 'translateY(-90px) rotate(-6deg) scale(.9)', opacity: 0 },
  marry: { transform: 'translateX(115%) rotate(5deg)', opacity: 0 },
  kill: { transform: 'translateY(160px) rotate(16deg)', opacity: 0 },
  none: { transform: 'translateX(-115%) rotate(-4deg)', opacity: 0 },
};

// X über dem Foto (viewBox 72×72); Länge einer Linie ≈ 62, Strichmuster 64 zum Einzeichnen
const SLASH = `
  <svg class="kmk-slash" viewBox="0 0 72 72" aria-hidden="true">
    <line x1="14" y1="14" x2="58" y2="58"/>
    <line x1="58" y1="14" x2="14" y2="58"/>
  </svg>`;

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="40" r="17" fill="none" stroke="currentColor" stroke-width="5"/>
    <path d="M32 25.5C21 18.5 22.5 6.5 32 11c9.5-4.5 11 7.5 0 14.5Z" style="fill: #ff5fa2"/>
  </svg>`;

const ICON_SWAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';

export default {
  id: 'kiss-marry-kill',
  title: 'Kiss, Marry, Kill',
  tagline: 'Drei Namen, drei Schicksale – wen küsst du, wen heiratest du, wen schickst du ins Aus?',
  tags: ['ab 2 Spielern', 'Promis & Figuren'],
  accent: '#f2b84b',
  icon: ICON,
  styles: new URL('./kiss-marry-kill.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx } = ctx;
  const sound = createSounds(audio);

  let gender = GENDERS[storage.get('gender')] ? storage.get('gender') : 'mixed';
  let selected = loadSelection();
  let deck = [];
  let round = 0;
  let players = ctx.players.get();
  let turnOffset = 0; // wer in Runde 1 entscheidet (zufällig)
  let names = []; // [{ name, category, action }]
  let busy = false; // Karten fliegen gerade raus oder drehen sich – Klicks ignorieren

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  function namesIn(key) {
    const category = categories[key];
    return gender === 'mixed' ? [...category.female, ...category.male] : category[gender];
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    const genderOptions = Object.entries(GENDERS).map(([value, { label }]) => ({ value, label }));
    const categoryOptions = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: categoryHint(value),
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="kmk-intro">
          <span class="kmk-deco" aria-hidden="true"><i>💋</i><i>💍</i><i>💀</i></span>
          <h1 class="kmk-title"><span class="kmk-kiss">Kiss</span>, <span class="kmk-marry">Marry</span>,<br><span class="kmk-kill">Kill</span></h1>
          <p class="kmk-lede">Drei Namen, drei Schicksale – Begründung ist Pflicht.</p>
        </div>`,
      cards: [
        {
          icon: '🎭',
          title: 'Wer kommt vor?',
          body: segmented({ name: 'gender', label: 'Geschlecht wählen', options: genderOptions, value: gender }),
        },
        {
          icon: '⭐',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: categoryOptions, values: selected }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="kmk-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
    });

    bindSegmented(root, 'gender', (value) => {
      gender = value;
      storage.set('gender', value);
      for (const row of root.querySelectorAll('.toggle-row')) {
        $('.toggle-hint', row).textContent = categoryHint(row.dataset.value);
      }
    });
    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    const playersHint = $('.kmk-players-hint', root);
    const updateHint = () => {
      playersHint.textContent = players.length >= NAMED_MIN_PLAYERS
        ? 'Reihum ist jede Runde jemand anderes dran und muss sich entscheiden.'
        : 'Mit Namen sagt das Spiel, wer gerade entscheiden muss.';
    };
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        updateHint();
      },
    });
    updateHint();
    $('[data-action="start"]', root).addEventListener('click', startGame);

    if (!fx.reducedMotion()) {
      root.querySelectorAll('.kmk-title span').forEach((word, index) => {
        word.animate(
          [
            { opacity: 0, transform: 'translateY(34px) rotate(-10deg) scale(.5)' },
            { opacity: 1, transform: 'translateY(-4px) rotate(3deg) scale(1.08)', offset: 0.65 },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 560, delay: 80 + index * 140, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' },
        );
      });
    }
  }

  function categoryHint(key) {
    return `${categories[key].hint} · ${namesIn(key).length} Namen`;
  }

  function startGame() {
    deck = [];
    round = 0;
    turnOffset = Math.floor(Math.random() * Math.max(1, players.length));
    busy = false;
    newRound();
  }

  // ---------- Ziehen ----------

  // Alle Namen der gewählten Kategorien; doppelte (z. B. in zwei Kategorien) nur einmal.
  function buildPool() {
    const seen = new Set();
    const pool = [];
    for (const key of selected) {
      for (const name of namesIn(key)) {
        if (seen.has(name)) continue;
        seen.add(name);
        pool.push({ name, category: key });
      }
    }
    return pool;
  }

  // Zieht einen Namen, der gerade nicht auf dem Bildschirm steht. Ist der Stapel leer, wird neu gemischt.
  function drawOne(exclude) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const index = deck.findIndex((entry) => !exclude.has(entry.name));
      if (index !== -1) return deck.splice(index, 1)[0];
      deck = shuffle(buildPool());
    }
    return null;
  }

  function newRound() {
    const exclude = new Set();
    names = [];
    for (let i = 0; i < NAMES_PER_ROUND; i += 1) {
      const entry = drawOne(exclude);
      exclude.add(entry.name);
      names.push({ ...entry, action: null });
    }
    round += 1;
    renderRound('all');
    preloadNext();
  }

  // Alte Karten verabschieden sich passend zu ihrem Schicksal, danach kommt die nächste Runde.
  function leaveRound() {
    if (busy) return;
    const cards = [...root.querySelectorAll('.kmk-card')];
    if (fx.reducedMotion()) {
      newRound();
      return;
    }
    busy = true;
    sound.whoosh();
    cards.forEach((card, index) => {
      card.animate(
        [{ transform: 'none', opacity: 1 }, EXIT_FRAMES[card.dataset.assigned ?? 'none']],
        { duration: EXIT_MS, delay: index * EXIT_STAGGER, easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards' },
      );
    });
    ctx.timeout(() => {
      busy = false;
      newRound();
    }, EXIT_MS + EXIT_STAGGER * (cards.length - 1) + 30);
  }

  // Bilder der nächsten Runde schon im Hintergrund laden, damit sie sofort da sind.
  function preloadNext() {
    for (const entry of deck.slice(0, NAMES_PER_ROUND)) {
      if (images[entry.name]) new Image().src = images[entry.name];
    }
  }

  // Die Karte dreht sich um, auf der Rückseite steht der neue Name.
  function swap(index) {
    if (busy) return;
    const entry = drawOne(new Set(names.map((item) => item.name)));
    names[index] = { ...entry, action: null };
    sound.flip();
    if (fx.reducedMotion()) {
      renderRound(null);
      return;
    }
    busy = true;
    const card = root.querySelectorAll('.kmk-card')[index];
    $('.kmk-swap svg', card).animate([{ transform: 'none' }, { transform: 'rotate(360deg)' }], { duration: FLIP_MS * 2, easing: 'ease-out' });
    card.animate(
      [{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(90deg)' }],
      { duration: FLIP_MS, easing: 'ease-in', fill: 'forwards' },
    );
    ctx.timeout(() => {
      busy = false;
      renderRound(index);
    }, FLIP_MS);
  }

  // Jede Wahl gibt es pro Runde nur einmal: Wird sie woanders vergeben, wandert sie dorthin.
  function assign(index, action) {
    if (busy) return;
    const item = names[index];
    const wasComplete = names.every((entry) => entry.action);
    const changed = [index];
    if (item.action === action) {
      item.action = null;
    } else {
      names.forEach((other, otherIndex) => {
        if (other === item || other.action !== action) return;
        other.action = null;
        changed.push(otherIndex);
      });
      item.action = action;
    }

    for (const cardIndex of changed) updateCard(cardIndex);
    const complete = names.every((entry) => entry.action);
    updateHead(complete);

    if (item.action) playChoice(index, action);
    else audio.sounds.blip();
    if (complete && !wasComplete) ctx.timeout(verdict, VERDICT_DELAY);
  }

  // ---------- Effekte ----------

  // Setzt Zustand und Markierung einer Karte, ohne die Runde neu zu zeichnen (laufende Animationen bleiben).
  function updateCard(index) {
    const card = root.querySelectorAll('.kmk-card')[index];
    const { action } = names[index];
    if (action) card.dataset.assigned = action;
    else delete card.dataset.assigned;
    for (const button of card.querySelectorAll('.kmk-action')) {
      button.setAttribute('aria-pressed', String(button.dataset.action === action));
    }

    const portrait = $('.kmk-portrait', card);
    const old = $('.kmk-mark:not(.is-leaving)', portrait);
    if (old?.dataset.mark === action) return;
    if (old) {
      old.classList.add('is-leaving');
      if (fx.reducedMotion()) old.remove();
      else {
        old.animate(
          [{ opacity: 1 }, { opacity: 0, transform: 'scale(.3) rotate(-40deg)' }],
          { duration: 220, easing: 'ease-in', fill: 'forwards' },
        ).onfinish = () => old.remove();
      }
    }
    if (action) portrait.insertAdjacentHTML('beforeend', mark(action));
  }

  function updateHead(complete) {
    const section = $('.kmk-round', root);
    section.classList.toggle('is-complete', complete);
    $('.kmk-instruction', root).innerHTML = instructionText(complete);
  }

  function playChoice(index, action) {
    sound[action]();
    if (fx.reducedMotion()) return;

    const card = root.querySelectorAll('.kmk-card')[index];
    const portrait = $('.kmk-portrait', card);
    const markEl = $('.kmk-mark:not(.is-leaving)', portrait);
    card.classList.add('is-acting');
    ctx.timeout(() => card.classList.remove('is-acting'), 1500);

    $(`.kmk-action[data-action="${action}"]`, card).animate(
      [{ transform: 'scale(.86)' }, { transform: 'scale(1.1)', offset: 0.5 }, { transform: 'none' }],
      { duration: 320, easing: 'ease-out' },
    );

    if (action === 'kiss') {
      markEl.animate(
        [
          { opacity: 0, transform: 'scale(2.8) rotate(-34deg)' },
          { opacity: 1, transform: 'scale(.85) rotate(-12deg)', offset: 0.6 },
          { opacity: 1, transform: 'rotate(-12deg)' },
        ],
        { duration: 440, easing: 'cubic-bezier(.3, .7, .3, 1)', fill: 'backwards' },
      );
      card.animate(
        [{ transform: 'none' }, { transform: 'scale(1.035)', offset: 0.35 }, { transform: 'none' }],
        { duration: 420, easing: 'ease-out' },
      );
      particles(portrait, ['💗', '💕', '💖', '❤️'], 10, 'rise');
    }

    if (action === 'marry') {
      markEl.animate(
        [
          { opacity: 0, transform: 'translateY(-80px) rotate(-50deg)' },
          { opacity: 1, transform: 'translateY(0) rotate(-12deg)', offset: 0.55 },
          { opacity: 1, transform: 'translateY(-14px) rotate(-16deg)', offset: 0.75 },
          { opacity: 1, transform: 'rotate(-12deg)' },
        ],
        { duration: 620, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'backwards' },
      );
      const sheen = document.createElement('span');
      sheen.className = 'kmk-sheen';
      $('.kmk-card-fx', card).append(sheen);
      sheen.animate(
        [{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(330%) skewX(-18deg)' }],
        { duration: 900, delay: 200, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both' },
      ).onfinish = () => sheen.remove();
      particles(portrait, ['✨', '✨', '💛', '⭐'], 10, 'burst', 260);
    }

    if (action === 'kill') {
      const flash = document.createElement('span');
      flash.className = 'kmk-flash';
      $('.kmk-card-fx', card).append(flash);
      flash.animate([{ opacity: 0.45 }, { opacity: 0 }], { duration: 600, delay: 160, easing: 'ease-out', fill: 'both' })
        .onfinish = () => flash.remove();
      card.animate(
        [
          { transform: 'none' },
          { transform: 'translateX(-9px) rotate(-1.5deg)' },
          { transform: 'translateX(8px) rotate(1.2deg)' },
          { transform: 'translateX(-5px) rotate(-.6deg)' },
          { transform: 'translateX(3px)' },
          { transform: 'none' },
        ],
        { duration: 420, delay: 160, easing: 'ease-out' },
      );
      markEl.animate(
        [
          { opacity: 0, transform: 'scale(3.2) rotate(20deg)' },
          { opacity: 1, transform: 'scale(.8) rotate(-14deg)', offset: 0.7 },
          { opacity: 1, transform: 'rotate(-12deg)' },
        ],
        { duration: 380, delay: 300, easing: 'cubic-bezier(.5, 0, .5, 1)', fill: 'backwards' },
      );
      particles(portrait, ['💥'], 1, 'pop', 150);
    }
  }

  // Kleine Emojis, die vom Foto aufsteigen ('rise'), rundherum aufblitzen ('burst') oder einmal aufploppen ('pop').
  function particles(anchor, glyphs, count, mode, delay = 0) {
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'kmk-particle';
      particle.textContent = glyphs[i % glyphs.length];
      anchor.append(particle);

      let frames;
      let duration;
      if (mode === 'rise') {
        const dx = -46 + Math.random() * 92;
        const dy = -70 - Math.random() * 80;
        const turn = -30 + Math.random() * 60;
        frames = [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.3)' },
          { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.3}px), calc(-50% + ${dy * 0.3}px)) scale(1.1)`, offset: 0.25 },
          { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${turn}deg) scale(.8)` },
        ];
        duration = 900 + Math.random() * 500;
      } else if (mode === 'burst') {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 48 + Math.random() * 34;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        frames = [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(0)' },
          { opacity: 1, transform: `translate(calc(-50% + ${x * 0.7}px), calc(-50% + ${y * 0.7}px)) scale(1.2) rotate(40deg)`, offset: 0.45 },
          { opacity: 0, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(.4) rotate(90deg)` },
        ];
        duration = 760 + Math.random() * 260;
      } else {
        frames = [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
          { opacity: 1, transform: 'translate(-50%, -50%) scale(2.2)', offset: 0.35 },
          { opacity: 0, transform: 'translate(-50%, -50%) scale(2.8)' },
        ];
        duration = 520;
      }
      particle.animate(frames, { duration, delay: delay + Math.random() * 120, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'both' })
        .onfinish = () => particle.remove();
    }
  }

  // Alle drei vergeben: Hammerschlag, Konfetti in den drei Farben, die Karten nicken nacheinander.
  function verdict() {
    if (!names.every((entry) => entry.action)) return;
    sound.verdict();
    if (fx.reducedMotion()) return;

    const instruction = $('.kmk-instruction', root);
    instruction.animate(
      [
        { opacity: 0, transform: 'scale(.5) rotate(-4deg)' },
        { opacity: 1, transform: 'scale(1.12) rotate(1deg)', offset: 0.6 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 480, easing: 'cubic-bezier(.3, .7, .3, 1)' },
    );
    root.querySelectorAll('.kmk-card').forEach((card, index) => {
      card.animate(
        [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.03)', offset: 0.4 }, { transform: 'none' }],
        { duration: 420, delay: 120 + index * 100, easing: 'ease-out' },
      );
    });
    const box = instruction.getBoundingClientRect();
    const style = getComputedStyle(root);
    fx.burst({
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      count: 60,
      colors: ['--kiss', '--marry', '--kill'].map((name) => style.getPropertyValue(name).trim()),
    });
  }

  // ---------- Runde ----------

  function instructionText(complete) {
    return complete
      ? 'Urteil gefällt – jetzt bitte begründen!'
      : 'Verteile <b class="kmk-kiss">Kiss</b>, <b class="kmk-marry">Marry</b> und <b class="kmk-kill">Kill</b> – jedes genau einmal.';
  }

  // animate: 'all' = Karten austeilen, Zahl = nur diese Karte dreht sich herein, null = ohne Animation
  function renderRound(animate) {
    const complete = names.every((entry) => entry.action);

    root.innerHTML = `
      <section class="screen kmk-round${complete ? ' is-complete' : ''}" data-leave-free>
        <div class="kmk-head">
          <p class="eyebrow">Runde ${round} · ${GENDERS[gender].label}</p>
          ${players.length >= NAMED_MIN_PLAYERS ? `<p class="kmk-turn${animate === 'all' ? ' is-new' : ''}"><b>${esc(players[(turnOffset + round - 1) % players.length])}</b> entscheidet</p>` : ''}
          <p class="kmk-instruction" aria-live="polite">${instructionText(complete)}</p>
        </div>

        <ul class="kmk-names">
          ${names.map((item, index) => `
            <li class="kmk-card"${item.action ? ` data-assigned="${item.action}"` : ''}>
              <span class="kmk-card-fx" aria-hidden="true"></span>
              <div class="kmk-card-top">
                <span class="kmk-portrait">
                  ${avatar(item.name)}
                  ${SLASH}
                  ${item.action ? mark(item.action) : ''}
                </span>
                <div class="kmk-card-text">
                  <p class="kmk-name">${esc(item.name)}</p>
                  <p class="kmk-category">${esc(categories[item.category].label)}</p>
                </div>
                <button class="kmk-swap" type="button" data-swap="${index}" aria-label="${esc(item.name)} austauschen">${ICON_SWAP}</button>
              </div>
              <div class="kmk-actions" role="group" aria-label="Entscheidung für ${esc(item.name)}">
                ${ACTIONS.map((action) => `
                  <button class="kmk-action" type="button" data-index="${index}" data-action="${action}" aria-pressed="${item.action === action}">${ACTION_LABELS[action]}</button>`).join('')}
              </div>
            </li>`).join('')}
        </ul>

        <button class="btn btn-primary" type="button" data-next>Nächste Runde</button>
        <button class="btn-link" type="button" data-setup>Einstellungen ändern</button>
        <p class="kmk-credit">Bilder: Wikipedia / Wikimedia Commons</p>
      </section>`;

    // Lädt ein Bild nicht (offline, gelöscht), erscheinen stattdessen die Initialen.
    for (const img of root.querySelectorAll('.kmk-photo img')) {
      img.addEventListener('error', () => {
        img.parentElement.classList.add('is-fallback');
        img.remove();
      }, { once: true });
    }

    if (animate === 'all') deal();
    else if (animate !== null) flipIn(animate);

    for (const button of root.querySelectorAll('.kmk-action')) {
      button.addEventListener('click', () => assign(Number(button.dataset.index), button.dataset.action));
    }
    for (const button of root.querySelectorAll('[data-swap]')) {
      button.addEventListener('click', () => swap(Number(button.dataset.swap)));
    }
    $('[data-next]', root).addEventListener('click', leaveRound);
    $('[data-setup]', root).addEventListener('click', showSetup);
  }

  // Karten fliegen wie ausgeteilt herein; Foto wird scharf, Name und Knöpfe folgen.
  function deal() {
    root.querySelectorAll('.kmk-card').forEach((card, index) => {
      sound.deal(index * DEAL_STAGGER / 1000);
      if (fx.reducedMotion()) return;
      const delay = index * DEAL_STAGGER;
      card.animate(
        [
          { opacity: 0, transform: 'translate(50px, -70px) rotate(10deg) scale(.9)' },
          { opacity: 1, transform: 'translate(-3px, 4px) rotate(-1deg)', offset: 0.7 },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 540, delay, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'backwards' },
      );
      revealContent(card, delay + 160);
    });
  }

  function flipIn(index) {
    const card = root.querySelectorAll('.kmk-card')[index];
    if (!card || fx.reducedMotion()) return;
    card.animate(
      [{ transform: 'perspective(900px) rotateY(-90deg)' }, { transform: 'perspective(900px) rotateY(0deg)' }],
      { duration: FLIP_MS * 1.4, easing: 'cubic-bezier(.2, .8, .3, 1.2)', fill: 'backwards' },
    );
    revealContent(card, 60);
  }

  function revealContent(card, delay) {
    $('.kmk-photo img', card)?.animate(
      [{ filter: 'blur(8px)', transform: 'scale(1.4)' }, { filter: 'blur(0)', transform: 'none' }],
      { duration: 650, delay, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' },
    );
    $('.kmk-card-text', card).animate(
      [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, delay: delay + 60, easing: 'ease-out', fill: 'backwards' },
    );
    card.querySelectorAll('.kmk-action').forEach((button, index) => {
      button.animate(
        [{ opacity: 0, transform: 'translateY(8px) scale(.85)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, delay: delay + 140 + index * 60, easing: 'cubic-bezier(.3, .8, .3, 1.3)', fill: 'backwards' },
      );
    });
  }
}

function mark(action) {
  return `<span class="kmk-mark" data-mark="${action}" aria-hidden="true">${MARKS[action]}</span>`;
}

// Kurze Klänge aus Ton + Rauschen: Schmatzer, Hochzeitsglocken, Klingenhieb.
function createSounds(audio) {
  return {
    deal: (delay = 0) => audio.noise({ duration: 0.09, volume: 0.22, cutoff: 5200, delay }),
    flip: () => {
      audio.noise({ duration: 0.12, volume: 0.25, cutoff: 4200 });
      audio.tone({ freq: 520, slideTo: 880, duration: 0.14, type: 'triangle', volume: 0.12, delay: 0.1 });
    },
    whoosh: () => audio.noise({ duration: 0.35, volume: 0.3, cutoff: 2600 }),
    kiss: () => {
      audio.noise({ duration: 0.06, volume: 0.35, cutoff: 3500 });
      audio.tone({ freq: 480, slideTo: 1500, duration: 0.11, type: 'sine', volume: 0.22, delay: 0.03 });
      audio.tone({ freq: 1250, slideTo: 1700, duration: 0.09, type: 'sine', volume: 0.14, delay: 0.17 });
    },
    marry: () => {
      [1568, 2093, 1760, 2637].forEach((freq, index) => {
        audio.tone({ freq, duration: 0.7, type: 'triangle', volume: 0.12, delay: index * 0.14 });
        audio.tone({ freq: freq * 2.01, duration: 0.4, type: 'sine', volume: 0.04, delay: index * 0.14 });
      });
    },
    kill: () => {
      audio.noise({ duration: 0.16, volume: 0.45, cutoff: 7000 });
      audio.noise({ duration: 0.16, volume: 0.4, cutoff: 7000, delay: 0.12 });
      audio.tone({ freq: 170, slideTo: 42, duration: 0.45, type: 'sine', volume: 0.45, delay: 0.16 });
    },
    verdict: () => {
      for (const delay of [0, 0.2]) {
        audio.noise({ duration: 0.09, volume: 0.55, cutoff: 900, delay });
        audio.tone({ freq: 200, slideTo: 90, duration: 0.12, type: 'sine', volume: 0.35, delay });
      }
      [523, 659, 784, 1047].forEach((freq, index) => {
        audio.tone({ freq, duration: 0.55, type: 'triangle', volume: 0.12, delay: 0.42 + index * 0.06 });
      });
    },
  };
}

// Foto von Wikipedia, darunter liegen immer die Initialen als Ersatz.
function avatar(name) {
  const initials = name
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase());
  const monogram = initials.length > 1 ? initials[0] + initials[initials.length - 1] : (initials[0] ?? '?');
  const src = images[name];
  return `
    <span class="kmk-photo${src ? '' : ' is-fallback'}" aria-hidden="true">
      <span class="kmk-initials">${esc(monogram)}</span>
      ${src ? `<img src="${esc(src)}" alt="" decoding="async" referrerpolicy="no-referrer">` : ''}
    </span>`;
}
