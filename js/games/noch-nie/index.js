import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindToggleList, playerEditor, rankingList, setupScreen, toggleList } from '../../core/ui.js';
import statements from './statements.js';

// Ab so vielen Namen kann man nach jeder Aussage antippen, wer es schon getan hat – und Schlucke zählen
const NAMED_MIN_PLAYERS = 2;

// Kategorien: Bezeichnung, kurze Beschreibung, Schlucke pro Aussage und Farbe des Kategorie-Chips.
const CATEGORIES = {
  locker: { label: 'Locker', hint: 'Harmlos, für jede Runde', sips: 1, color: '#14a88f' },
  peinlich: { label: 'Peinlich', hint: 'Zum Fremdschämen', sips: 2, color: '#e0a43a' },
  pikant: { label: 'Pikant', hint: 'Flirts, Dates und Geheimnisse', sips: 2, color: '#e8577a' },
};

const DEFAULT_SELECTION = ['locker', 'peinlich'];

// Trennt „Ich hab noch nie“ (bzw. bin/war/hatte …) vom Rest der Aussage, um es hervorzuheben.
const PREFIX = /^(Ich (?:hab|bin|war|hatte)(?: mich| mir)? noch nie)\s+(.+)$/;

// Schutz vor Doppeltipps, die sonst eine Aussage überspringen würden.
const NEXT_COOLDOWN = 350;

// Die Karte ist ein Glas: so hoch steht die Flüssigkeit bei der ersten und letzten Aussage (Prozent).
const LEVEL_MIN = 8;
const LEVEL_MAX = 82;
const BUBBLES = 12;

// Glas als Deko auf dem Einstellungsbildschirm
const GLASS = `
  <svg class="nie-glass" viewBox="0 0 80 100" aria-hidden="true">
    <defs><clipPath id="nie-glass-clip"><path d="M14 8h52l-6 82a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4Z"/></clipPath></defs>
    <g clip-path="url(#nie-glass-clip)">
      <g class="nie-glass-liquid">
        <path class="nie-glass-wave" d="M-80 40q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0V120H-80Z"/>
      </g>
      <circle class="nie-glass-bubble" cx="32" cy="88" r="2.4"/>
      <circle class="nie-glass-bubble" cx="46" cy="90" r="1.8"/>
      <circle class="nie-glass-bubble" cx="40" cy="92" r="2.8"/>
    </g>
    <path d="M14 8h52l-6 82a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M22 16l-2 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
  </svg>`;

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M16 10h32l-4.2 46.2a4 4 0 0 1-4 3.8H24.2a4 4 0 0 1-4-3.8Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M19.6 30h24.8l-2.5 26a2 2 0 0 1-2 1.8H24.1a2 2 0 0 1-2-1.8Z" fill="currentColor"/>
    <circle cx="28" cy="41" r="2.2" fill="#fff" opacity=".35"/>
    <circle cx="36" cy="48" r="1.7" fill="#fff" opacity=".35"/>
    <circle cx="31" cy="36" r="1.3" fill="#fff" opacity=".35"/>
  </svg>`;

export default {
  id: 'noch-nie',
  title: 'Ich hab noch nie',
  tagline: 'Wer es schon getan hat, trinkt – und erzählt am besten die Geschichte dazu.',
  tags: ['ab 3 Spielern', 'so lange ihr wollt'],
  accent: '#14a88f',
  icon: ICON,
  styles: new URL('./noch-nie.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let selected = loadSelection();
  let players = ctx.players.get();
  let named = false;
  let sips = new Map(); // Name → getrunkene Schlucke
  let deck = [];        // [{ key, text, done: Set der Namen, die es schon getan haben }]
  let index = 0;
  let lastNext = -Infinity;
  let view = null; // Elemente des Spielbildschirms, solange er angezeigt wird
  let animating = false;

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in CATEGORIES) : [];
    return valid.length ? valid : DEFAULT_SELECTION;
  }

  function showSetup() {
    view = null;
    const options = Object.entries(CATEGORIES).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${statements[value].length} Aussagen`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="nie-intro">
          ${GLASS}
          <h1 class="nie-title">Ich hab<br><span>noch nie</span> …</h1>
          <p class="nie-lede">Wer es schon mal getan hat, trinkt – und erzählt am besten die Geschichte dazu.</p>
        </div>`,
      cards: [
        {
          icon: '🍻',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: options, values: selected }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="nie-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Trinken ist kein Muss – Wasser oder Saft zählen genauso.',
    });

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    const hint = $('.nie-players-hint', root);
    const updateHint = () => {
      hint.textContent = players.length >= NAMED_MIN_PLAYERS
        ? 'Nach jeder Aussage tippt ihr an, wer es schon getan hat. Am Ende seht ihr, wer am meisten erlebt hat.'
        : 'Mit Namen zählt das Spiel mit, wer wie oft trinken musste.';
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
  }

  function startGame() {
    named = players.length >= NAMED_MIN_PLAYERS;
    sips = new Map(players.map((name) => [name, 0]));
    deck = shuffle(selected.flatMap((key) => statements[key].map((text) => ({ key, text, done: new Set() }))));
    index = 0;
    showPlay();
    renderCard(0);
  }

  function showPlay() {
    const bubbles = Array.from({ length: BUBBLES }, () => {
      const size = 4 + Math.random() * 9;
      return `<i style="left: ${Math.random() * 96}%; width: ${size}px; height: ${size}px; animation-duration: ${3.5 + Math.random() * 4}s; animation-delay: ${-Math.random() * 7}s"></i>`;
    }).join('');

    root.innerHTML = `
      <section class="screen nie-play">
        <div class="nie-status">
          <span class="chip nie-chip"></span>
          <span class="nie-progress"></span>
        </div>

        <button class="nie-card" type="button" data-action="next" aria-live="polite">
          <span class="nie-liquid" aria-hidden="true">
            <svg class="nie-wave" viewBox="0 0 400 20" preserveAspectRatio="none"><path d="M0 10q25-10 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0V20H0Z"/></svg>
          </span>
          <span class="nie-bubbles" aria-hidden="true">${bubbles}</span>
          <span class="nie-prefix"></span>
          <span class="nie-text"></span>
          <span class="nie-cheers-stage" aria-hidden="true"></span>
        </button>

        <div class="nie-under">
          <p class="nie-rule"></p>
          <button class="nie-cheers" type="button" data-action="cheers">🍻 Prost!</button>
        </div>

        ${named ? `
          <div class="nie-who">
            <p class="eyebrow">Wer hat's schon getan?</p>
            <div class="nie-who-list">
              ${players.map((name, i) => `
                <button class="nie-who-btn" type="button" data-name="${esc(name)}" aria-pressed="false" style="--i: ${i}">
                  <span>${esc(name)}</span><b class="nie-who-count">0</b>
                </button>`).join('')}
            </div>
          </div>` : ''}

        <div class="nie-nav">
          <button class="btn btn-ghost" type="button" data-action="prev">Zurück</button>
          <button class="btn btn-primary" type="button" data-action="next">Nächste</button>
        </div>
        <button class="btn-link" type="button" data-action="${named ? 'end' : 'setup'}">${named ? 'Spiel beenden & Auswertung' : 'Kategorien ändern'}</button>
      </section>`;

    view = {
      section: $('.nie-play', root),
      card: $('.nie-card', root),
      prefix: $('.nie-prefix', root),
      text: $('.nie-text', root),
      chip: $('.nie-chip', root),
      progress: $('.nie-progress', root),
      rule: $('.nie-rule', root),
      prev: $('[data-action="prev"]', root),
      stage: $('.nie-cheers-stage', root),
    };

    for (const button of root.querySelectorAll('[data-action="next"]')) {
      button.addEventListener('click', next);
    }
    view.prev.addEventListener('click', prev);
    $('[data-action="cheers"]', root).addEventListener('click', cheers);
    $('[data-action="setup"]', root)?.addEventListener('click', showSetup);
    $('[data-action="end"]', root)?.addEventListener('click', () => showEnd(true));
    for (const button of root.querySelectorAll('.nie-who-btn')) {
      button.addEventListener('click', () => toggleDone(button));
    }
  }

  // Name antippen = hat es schon getan und trinkt; nochmal tippen nimmt es zurück
  function toggleDone(button) {
    const name = button.dataset.name;
    const item = deck[index];
    const amount = CATEGORIES[item.key].sips;
    const adding = !item.done.has(name);
    if (adding) item.done.add(name);
    else item.done.delete(name);
    sips.set(name, Math.max(0, (sips.get(name) ?? 0) + (adding ? amount : -amount)));
    updateWho();
    vibrate(adding ? 15 : 8);
    if (!adding) {
      audio.noise({ duration: 0.08, volume: 0.1, cutoff: 1200 });
      return;
    }
    // Gluck-gluck und ein Bierglas, das aus dem Knopf aufsteigt
    audio.tone({ freq: 300, slideTo: 520, duration: 0.09, type: 'sine', volume: 0.18 });
    audio.tone({ freq: 340, slideTo: 600, duration: 0.09, type: 'sine', volume: 0.15, delay: 0.11 });
    if (fx.reducedMotion()) return;
    const mug = document.createElement('span');
    mug.className = 'nie-who-mug';
    mug.textContent = amount > 1 ? `🍺×${amount}` : '🍺';
    button.append(mug);
    mug.animate(
      [{ opacity: 0, transform: 'translate(-50%, 0) scale(.5)' }, { opacity: 1, transform: 'translate(-50%, -26px) scale(1.15)', offset: 0.35 }, { opacity: 0, transform: 'translate(-50%, -52px) scale(1)' }],
      { duration: 800, easing: 'ease-out', fill: 'forwards' },
    ).onfinish = () => mug.remove();
    button.querySelector('.nie-who-count').animate(
      [{ transform: 'scale(1.6)' }, { transform: 'none' }],
      { duration: 350, easing: 'cubic-bezier(.3, .8, .3, 1.4)' },
    );
  }

  function updateWho() {
    if (!named || !view) return;
    const item = deck[index];
    for (const button of root.querySelectorAll('.nie-who-btn')) {
      const name = button.dataset.name;
      button.setAttribute('aria-pressed', String(item.done.has(name)));
      button.querySelector('.nie-who-count').textContent = String(sips.get(name) ?? 0);
    }
  }

  // Text in einzelne Teile zerlegen, die nacheinander hereinhüpfen
  function pieces(text, by, className) {
    const parts = by === 'letter' ? [...text] : text.split(' ');
    return parts
      .map((part, i) => `<span class="${className}" style="--i: ${i}">${part === ' ' ? '&nbsp;' : esc(part)}</span>`)
      .join(by === 'letter' ? '' : ' ');
  }

  function fillCard() {
    const { key, text } = deck[index];
    const category = CATEGORIES[key];
    const match = text.match(PREFIX);

    view.prefix.innerHTML = match ? pieces(match[1], 'letter', 'nie-letter') : '';
    view.text.innerHTML = pieces(match ? match[2] : text, 'word', 'nie-word');
    view.chip.textContent = category.label;
    view.section.style.setProperty('--nie-color', category.color);
    view.progress.textContent = `${index + 1} / ${deck.length}`;
    view.rule.innerHTML = `Wer es schon getan hat, trinkt <b>${category.sips === 1 ? '1 Schluck' : `${category.sips} Schlucke`}</b>.`;
    view.prev.disabled = index === 0;
    // Das Glas füllt sich mit jeder Aussage ein Stück weiter
    const progress = deck.length > 1 ? index / (deck.length - 1) : 1;
    view.card.style.setProperty('--level', `${LEVEL_MIN + progress * (LEVEL_MAX - LEVEL_MIN)}%`);
    updateWho();
  }

  // direction: 1 = vorwärts, -1 = zurück, 0 = ohne Animation
  function renderCard(direction) {
    if (!direction || fx.reducedMotion()) {
      fillCard();
      return;
    }
    animating = true;
    const card = view.card;
    card.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-direction * 115}%) rotate(${-direction * 16}deg)`, opacity: 0 }],
      { duration: 190, easing: 'cubic-bezier(.5, 0, .9, .5)' },
    ).finished.then(() => {
      if (!view) return;
      fillCard();
      card.animate(
        [
          { transform: `perspective(900px) translateX(${direction * 40}%) rotateY(${-direction * 60}deg) scale(.9)`, opacity: 0 },
          { transform: 'perspective(900px) rotateY(0) scale(1.02)', opacity: 1, offset: 0.7 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      ).finished.then(() => { animating = false; }, () => { animating = false; });
    }, () => { animating = false; });
  }

  function next() {
    const now = performance.now();
    if (animating || now - lastNext < NEXT_COOLDOWN) return;
    lastNext = now;

    if (index >= deck.length - 1) {
      showEnd();
      return;
    }
    index += 1;
    audio.sounds.blip();
    audio.noise({ duration: 0.16, volume: 0.12, cutoff: 1800 });
    vibrate(10);
    renderCard(1);
  }

  function prev() {
    if (animating || index === 0) return;
    index -= 1;
    audio.noise({ duration: 0.16, volume: 0.1, cutoff: 1400 });
    renderCard(-1);
  }

  // Zwei Gläser fliegen in der Karte aufeinander zu und stoßen an
  function cheers() {
    audio.tone({ freq: 2093, duration: 0.3, type: 'triangle', volume: 0.12, delay: 0.32 });
    audio.tone({ freq: 3136, duration: 0.22, type: 'triangle', volume: 0.08, delay: 0.33 });
    audio.noise({ duration: 0.05, volume: 0.2, cutoff: 6000, delay: 0.32 });
    vibrate([0, 0, 320, 40]);
    if (fx.reducedMotion()) {
      fx.toast('🍻 Prost!');
      return;
    }

    const stage = view.stage;
    stage.innerHTML = '<span class="nie-mug nie-mug-left">🍺</span><span class="nie-mug nie-mug-right"><span>🍺</span></span><span class="nie-prost">Prost!</span>';
    const [left, right, label] = stage.children;
    const fly = (element, side) => element.animate(
      [
        { transform: `translateX(${side * 160}%) rotate(${side * 30}deg) scale(.6)`, opacity: 0 },
        { transform: `translateX(${side * 20}%) rotate(${side * -18}deg) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translateX(${side * 28}%) rotate(${side * -8}deg) scale(1.1)`, opacity: 1, offset: 0.6 },
        { transform: `translateX(${side * 40}%) rotate(${side * 10}deg) scale(1)`, opacity: 0 },
      ],
      { duration: 1100, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' },
    );
    fly(left, -1);
    fly(right, 1);
    label.animate(
      [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(.3)', opacity: 0, offset: 0.35 }, { transform: 'scale(1.2) rotate(-6deg)', opacity: 1, offset: 0.55 }, { transform: 'scale(1) rotate(-6deg)', opacity: 0 }],
      { duration: 1300, easing: 'ease-out', fill: 'forwards' },
    );
    ctx.timeout(() => {
      if (!view) return;
      const box = stage.getBoundingClientRect();
      const color = getComputedStyle(view.section).getPropertyValue('--nie-color').trim();
      fx.burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, count: 40, colors: [color, '#ffd76a', '#ffffff'] });
    }, 330);
    ctx.timeout(() => {
      if (view) stage.innerHTML = '';
    }, 1400);
  }

  // early: über „Spiel beenden“ statt nach der letzten Aussage
  function showEnd(early = false) {
    view = null;
    animating = false;
    audio.sounds.success();
    audio.tone({ freq: 2093, duration: 0.3, type: 'triangle', volume: 0.12, delay: 0.25 });
    fx.burst({ colors: ['#14a88f', '#e0a43a', '#e8577a', '#ffffff'] });

    const played = early ? index + 1 : deck.length;
    const ranked = [...sips.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0]?.[1] ?? 0;
    const leaders = ranked.filter(([, count]) => count === best && best > 0).map(([name]) => name);
    const ranking = named ? `
      ${leaders.length ? `<p class="nie-end-sub"><b>${leaders.map(esc).join(' & ')}</b> ${leaders.length > 1 ? 'haben' : 'hat'} am meisten erlebt!</p>` : ''}
      ${rankingList(ranked.map(([name, count]) => ({ name, value: `${count} ${count === 1 ? 'Schluck' : 'Schlucke'}` })))}` : '';

    root.innerHTML = `
      <section class="screen nie-end" data-leave-free>
        <p class="nie-end-mugs" aria-hidden="true"><span>🍺</span><span>🍺</span></p>
        <p class="nie-end-title">${early ? 'Prost!' : 'Alle durch!'}</p>
        <p class="nie-end-sub">${early ? `${played} ${played === 1 ? 'Aussage' : 'Aussagen'} gespielt.` : `Ihr habt alle ${deck.length} Aussagen gespielt.`}</p>
        ${ranking}
        <div class="nie-end-actions">
          <button class="btn btn-primary" type="button" data-action="restart">Neu mischen</button>
          <button class="btn btn-ghost" type="button" data-action="setup">Kategorien ändern</button>
        </div>
      </section>`;

    $('[data-action="restart"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
