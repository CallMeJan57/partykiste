import { $, esc } from '../../core/dom.js';
import { between, pick, pickOther } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, playerEditor, segmented, setupScreen } from '../../core/ui.js';
import categories from './categories.js';

// Ab so vielen Namen fragt das Spiel nach jedem Knall, wer die Bombe hatte, und zählt mit
const NAMED_MIN_PLAYERS = 2;

// Zündzeit-Stufen: Die Bombe explodiert nach zufälliger Zeit zwischen min und max Sekunden.
const FUSES = {
  kurz: { label: 'Kurz', min: 8, max: 18 },
  mittel: { label: 'Mittel', min: 15, max: 35 },
  lang: { label: 'Lang', min: 25, max: 55 },
  chaos: { label: 'Chaos', min: 5, max: 60 },
};

// Länge der Zeitleiste in der Zündzeit-Vorschau (Sekunden) – reicht bis zur längsten Stufe.
const FUSE_SCALE = Math.max(...Object.values(FUSES).map((fuse) => fuse.max));

// Abstand zwischen zwei Ticks in ms: gemächlich zu Beginn, hektisch kurz vor der Explosion.
const TICK_SLOW = 850;
const TICK_FAST = 110;

// Mindestabstand zwischen zwei Weitergaben, damit ein Doppeltipp nicht doppelt zählt.
const PASS_COOLDOWN = 400;

// Nach der Explosion kurz keine Klicks annehmen, damit niemand aus Versehen sofort neu startet.
const BOOM_INPUT_DELAY = 900;

// Funken an der Zündschnur: so oft entsteht einer (ms), mit der Zeit immer öfter
const SPARK_SLOW = 70;
const SPARK_FAST = 18;
// Ab diesem Fortschritt schlägt zusätzlich ein Herz mit
const HEARTBEAT_FROM = 0.5;

const FIRE_COLORS = ['#ffd76a', '#ff9b3d', '#ff5a2e', '#e8352b', '#fff3c4'];

const ICON = `
  <svg viewBox="0 0 64 64">
    <path d="M32 17 C 37 8, 45 5, 53 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
    <rect x="26" y="15" width="12" height="8" rx="2.5" fill="currentColor"/>
    <circle cx="32" cy="40" r="19" fill="currentColor"/>
    <circle cx="25" cy="33" r="5" fill="#fff" opacity=".22"/>
    <circle cx="54" cy="8" r="4" style="fill: var(--accent-2)"/>
  </svg>`;

// Startbild: tickende Bombe, an der Zündschnur sprüht ein Funke
const HERO_EMBERS = [[-14, -18], [16, -14], [-6, 16], [18, 10], [2, -24]];
const HERO = `
  <div class="bombe-hero" aria-hidden="true">
    <svg viewBox="0 0 150 140">
      <defs>
        <radialGradient id="bombe-hero-fill" cx="38%" cy="32%" r="75%">
          <stop offset="0" stop-color="#5d6371"/>
          <stop offset=".55" stop-color="#252932"/>
          <stop offset="1" stop-color="#0c0e13"/>
        </radialGradient>
      </defs>
      <ellipse class="bombe-hero-floor" cx="66" cy="130" rx="36" ry="6"/>
      <g class="bombe-hero-body">
        <path class="bombe-hero-fuse" d="M70 46 C 94 26, 90 8, 112 12"/>
        <circle cx="66" cy="86" r="41" fill="url(#bombe-hero-fill)"/>
        <ellipse cx="51" cy="68" rx="12" ry="7" transform="rotate(-35 51 68)" fill="#fff" opacity=".3"/>
        <rect x="56" y="40" width="20" height="13" rx="3" fill="#9aa0a8"/>
      </g>
      <g transform="translate(112 12)">
        ${HERO_EMBERS.map(([x, y], i) => `<circle class="bombe-hero-ember" r="2.2" style="--x: ${x}px; --y: ${y}px; --i: ${i}"/>`).join('')}
        <g class="bombe-hero-spark">
          <path d="M0 -13V13M-13 0H13M-9 -9 9 9M-9 9 9 -9"/>
          <circle r="6"/>
          <circle r="3" fill="#fff"/>
        </g>
      </g>
    </svg>
  </div>`;

export default {
  id: 'bombe',
  title: 'Bombenstafette',
  tagline: 'Begriff zur Kategorie nennen, Handy weitergeben – bevor es knallt.',
  tags: ['ab 3 Spielern', 'ca. 1 Min. pro Runde'],
  accent: '#ff5a2e',
  icon: ICON,
  styles: new URL('./bombe.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  // ---------- Klänge ----------

  const sound = {
    // Streichholz anreißen und Zündschnur fängt Feuer
    ignite() {
      audio.noise({ duration: 0.22, volume: 0.35, cutoff: 6000 });
      audio.noise({ duration: 0.5, volume: 0.25, cutoff: 1800, delay: 0.18 });
      audio.tone({ freq: 140, slideTo: 60, duration: 0.25, type: 'sine', volume: 0.35, delay: 0.02 });
    },
    // Tick-Tack: abwechselnd hell und dunkel
    tick(odd, progress) {
      audio.tone({ freq: odd ? 1250 : 1750, duration: 0.045, type: 'square', volume: 0.1 + progress * 0.1 });
      audio.noise({ duration: 0.02, volume: 0.15, cutoff: 7000 });
    },
    // Herzschlag: zwei dumpfe Schläge
    heartbeat(progress) {
      const volume = 0.25 + progress * 0.35;
      audio.tone({ freq: 62, slideTo: 40, duration: 0.14, type: 'sine', volume });
      audio.tone({ freq: 58, slideTo: 38, duration: 0.12, type: 'sine', volume: volume * 0.7, delay: 0.16 });
    },
    // Knistern der Zündschnur
    crackle(progress) {
      audio.noise({ duration: 0.02 + Math.random() * 0.03, volume: 0.04 + progress * 0.1, cutoff: 4000 + Math.random() * 5000 });
    },
    // Wusch beim Weitergeben
    pass() {
      audio.noise({ duration: 0.22, volume: 0.22, cutoff: 1400 });
      audio.tone({ freq: 320, slideTo: 1100, duration: 0.18, type: 'sine', volume: 0.12 });
    },
    // Detonation mit Nachhall, prasselnden Trümmern und Ohrenpfeifen
    boom() {
      audio.tone({ freq: 150, slideTo: 28, duration: 1.4, type: 'sine', volume: 0.7 });
      audio.tone({ freq: 90, slideTo: 30, duration: 0.9, type: 'sawtooth', volume: 0.25 });
      audio.noise({ duration: 1.8, volume: 0.9, cutoff: 900 });
      audio.noise({ duration: 0.5, volume: 0.6, cutoff: 5000 });
      for (let i = 0; i < 12; i++) {
        audio.noise({ duration: 0.03 + Math.random() * 0.05, volume: 0.08 + Math.random() * 0.15, cutoff: 2500 + Math.random() * 4000, delay: 0.35 + Math.random() * 1.3 });
      }
      audio.tone({ freq: 3400, duration: 1.6, type: 'sine', volume: 0.025, delay: 0.5 });
    },
  };

  let fuse = FUSES[storage.get('fuse')] ? storage.get('fuse') : 'mittel';
  let lastCategory = null;
  let round = null;
  let players = ctx.players.get();
  let booms = new Map(); // Name → wie oft die Bombe bei ihm explodiert ist
  let starter = null;    // wer die nächste Runde beginnt (zuletzt erwischt)

  const named = () => players.length >= NAMED_MIN_PLAYERS;

  showSetup();

  function showSetup() {
    stopRound();
    const options = Object.entries(FUSES).map(([value, { label }]) => ({ value, label }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="bombe-intro">
          ${HERO}
          <h1 class="bombe-title">Gib die<br><span>Bombe</span> weiter</h1>
          <p class="bombe-lede">Begriff nennen, Handy weiterreichen – irgendwann knallt's. Niemand weiß, wann.</p>
        </div>`,
      cards: [
        {
          icon: '⏱️',
          title: 'Zündzeit',
          body: `
            ${segmented({ name: 'fuse', label: 'Zündzeit wählen', options, value: fuse })}
            <div class="bombe-fuse-preview">
              <p class="bombe-fuse-text" aria-live="polite"></p>
              <div class="bombe-track" aria-hidden="true">
                <div class="bombe-track-range"></div>
              </div>
              <div class="bombe-track-scale" aria-hidden="true">
                <span>0 s</span><span>${FUSE_SCALE / 2} s</span><span>${FUSE_SCALE} s</span>
              </div>
            </div>`,
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: '<span class="bombe-players-hint"></span>',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Bombe scharf machen</button>`,
    });

    const playersHint = $('.bombe-players-hint', root);
    const updateHint = () => {
      playersHint.textContent = named()
        ? 'Nach dem Knall tippt ihr an, wer die Bombe hatte. Wer erwischt wird, fängt die nächste Runde an.'
        : 'Mit Namen zählt das Spiel, bei wem die Bombe wie oft hochgeht.';
    };
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        booms = new Map([...booms].filter(([name]) => list.includes(name)));
        if (!list.includes(starter)) starter = null;
        updateHint();
      },
    });
    updateHint();

    renderFusePreview();
    bindSegmented(root, 'fuse', (value) => {
      fuse = value;
      storage.set('fuse', value);
      renderFusePreview();
    });
    $('[data-action="start"]', root).addEventListener('click', startRound);
  }

  function renderFusePreview() {
    const { min, max } = FUSES[fuse];
    $('.bombe-fuse-text', root).innerHTML = `Explodiert nach <b>${min}–${max}</b> Sekunden`;
    const range = $('.bombe-track-range', root);
    range.style.left = `${(min / FUSE_SCALE) * 100}%`;
    range.style.width = `${((max - min) / FUSE_SCALE) * 100}%`;
  }

  function startRound() {
    audio.unlock();
    const { min, max } = FUSES[fuse];
    lastCategory = pickOther(categories, lastCategory);
    if (named() && !starter) starter = pick(players);

    root.innerHTML = `
      <section class="screen bombe-round">
        ${named() ? `<p class="bombe-starter"><span aria-hidden="true">👉</span> <b>${esc(starter)}</b> fängt an</p>` : ''}
        <div class="bombe-category">
          <p class="eyebrow">Kategorie</p>
          <div class="bombe-card">
            <p class="bombe-category-text">${esc(lastCategory)}</p>
          </div>
        </div>

        <button class="bombe-field" type="button" data-action="pass">
          <span class="bombe-danger" aria-hidden="true"></span>
          <span class="bombe-stage">
            <svg class="bombe-svg" viewBox="0 0 220 220" aria-hidden="true">
              <defs>
                <radialGradient id="bombe-body-fill" cx="38%" cy="32%" r="75%">
                  <stop offset="0" class="bombe-stop-light"/>
                  <stop offset=".55" class="bombe-stop-mid"/>
                  <stop offset="1" class="bombe-stop-dark"/>
                </radialGradient>
                <linearGradient id="bombe-cap-fill" x1="0" x2="1">
                  <stop offset="0" stop-color="#6b7078"/>
                  <stop offset=".45" stop-color="#d9dde2"/>
                  <stop offset="1" stop-color="#5a5f66"/>
                </linearGradient>
              </defs>
              <ellipse class="bombe-floor" cx="110" cy="196" rx="54" ry="9"/>
              <path class="bombe-fuse" d="M 110 70 C 150 40, 140 10, 175 12"/>
              <path class="bombe-fuse-core" d="M 110 70 C 150 40, 140 10, 175 12"/>
              <circle class="bombe-glow" cx="110" cy="130" r="58"/>
              <circle class="bombe-body" cx="110" cy="130" r="58" fill="url(#bombe-body-fill)"/>
              <ellipse class="bombe-shine" cx="88" cy="106" rx="18" ry="11" transform="rotate(-35 88 106)"/>
              <rect class="bombe-cap" x="98" y="58" width="24" height="17" rx="4" fill="url(#bombe-cap-fill)"/>
              <g class="bombe-sparks"></g>
              <circle class="bombe-spark" r="6"/>
            </svg>
          </span>
          <span class="bombe-field-hint">Irgendwo hier tippen zum Weitergeben</span>
          <span class="bombe-pass-count">0 Weitergaben</span>
        </button>
        <button class="btn-link" type="button" data-action="cancel">Runde abbrechen</button>
      </section>`;

    const fusePath = $('.bombe-fuse', root);
    round = {
      fuseCore: $('.bombe-fuse-core', root),
      svg: $('.bombe-svg', root),
      sparks: $('.bombe-sparks', root),
      danger: $('.bombe-danger', root),
      lastSpark: 0,
      lastCrackle: 0,
      ticks: 0,
      category: lastCategory,
      duration: between(min, max) * 1000,
      start: performance.now(),
      passes: 0,
      lastPass: -Infinity,
      tickTimer: null,
      stopLoop: null,
      fusePath,
      fuseLength: fusePath.getTotalLength(),
      field: $('.bombe-field', root),
      stage: $('.bombe-stage', root),
      spark: $('.bombe-spark', root),
      glow: $('.bombe-glow', root),
      count: $('.bombe-pass-count', root),
    };

    $('[data-action="pass"]', root).addEventListener('click', registerPass);
    $('[data-action="cancel"]', root).addEventListener('click', showSetup);

    // Auftritt: Karte wird aufgestempelt, Bombe fällt herein, Zündschnur fängt Feuer
    sound.ignite();
    vibrate([0, 40, 60, 30]);
    if (!fx.reducedMotion()) {
      $('.bombe-card', root).animate(
        [{ transform: 'scale(1.5) rotate(-6deg)', opacity: 0 }, { transform: 'scale(.96) rotate(1deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }],
        { duration: 420, easing: 'cubic-bezier(.3, 1.4, .5, 1)' },
      );
      round.svg.animate(
        [
          { transform: 'translateY(-260px) rotate(-25deg)', opacity: 0 },
          { transform: 'translateY(0) rotate(4deg) scale(1.06, .92)', opacity: 1, offset: 0.55 },
          { transform: 'translateY(-18px) rotate(-2deg)', offset: 0.75 },
          { transform: 'none' },
        ],
        { duration: 650, easing: 'cubic-bezier(.4, 0, .6, 1)' },
      );
    }

    round.stopLoop = ctx.loop(animate);
    tick();
  }

  function progressAt(now) {
    return Math.min(Math.max((now - round.start) / round.duration, 0), 1);
  }

  function tick() {
    if (!round) return;
    const progress = progressAt(performance.now());
    if (progress >= 1) {
      explode();
      return;
    }
    round.ticks += 1;
    sound.tick(round.ticks % 2, progress);
    if (progress >= HEARTBEAT_FROM && round.ticks % 2 === 0) sound.heartbeat(progress);
    vibrate(progress >= HEARTBEAT_FROM ? [14, 60, 10] : 14);
    round.glow.style.strokeWidth = 6 + progress * 16;
    round.glow.animate([{ opacity: 0.25 + progress * 0.6 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' });
    if (!fx.reducedMotion()) {
      // Bombe pulsiert mit jedem Tick, gegen Ende immer stärker
      const swell = 1.03 + progress * 0.07;
      round.svg.animate([{ transform: `scale(${swell})` }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      if (progress > 0.35) {
        round.danger.animate([{ opacity: Math.min(1, progress * 1.1) }, { opacity: progress * 0.45 }], { duration: 300, easing: 'ease-out' });
      }
    }
    round.tickTimer = ctx.timeout(tick, TICK_SLOW * (TICK_FAST / TICK_SLOW) ** progress);
  }

  // Zündschnur brennt von außen zur Bombe hin ab; je näher das Ende, desto stärker wackelt sie.
  function animate(now) {
    if (!round) return false;
    const progress = progressAt(now);
    if (progress >= 1) {
      explode();
      return false;
    }

    const remaining = round.fuseLength * (1 - progress);
    round.fusePath.style.strokeDasharray = `${remaining} ${round.fuseLength}`;
    round.fuseCore.style.strokeDasharray = `${remaining} ${round.fuseLength}`;
    const point = round.fusePath.getPointAtLength(remaining);
    round.spark.setAttribute('cx', point.x);
    round.spark.setAttribute('cy', point.y);
    round.spark.setAttribute('r', 5 + progress * 4 + Math.random() * 2.5);
    round.svg.style.setProperty('--heat', progress.toFixed(3));

    // Funken sprühen von der Zündschnur
    const sparkEvery = SPARK_SLOW * (SPARK_FAST / SPARK_SLOW) ** progress;
    if (now - round.lastSpark > sparkEvery && !fx.reducedMotion()) {
      round.lastSpark = now;
      spawnSpark(point, progress);
    }
    // Knistern, mit der Zeit dichter
    if (now - round.lastCrackle > 140 - progress * 100 + Math.random() * 120) {
      round.lastCrackle = now;
      sound.crackle(progress);
    }

    if (!fx.reducedMotion()) {
      const amplitude = progress * progress * 6;
      const dx = (Math.random() * 2 - 1) * amplitude;
      const dy = (Math.random() * 2 - 1) * amplitude;
      round.stage.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }
  }

  function spawnSpark(point, progress) {
    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    spark.setAttribute('cx', point.x);
    spark.setAttribute('cy', point.y);
    spark.setAttribute('r', (1 + Math.random() * 2.2).toFixed(1));
    spark.setAttribute('fill', FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]);
    round.sparks.append(spark);
    const angle = Math.random() * Math.PI * 2;
    const distance = 14 + Math.random() * (22 + progress * 26);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 8;
    spark.animate(
      [{ transform: 'translate(0, 0)', opacity: 1 }, { transform: `translate(${dx}px, ${dy + 14}px)`, opacity: 0 }],
      { duration: 380 + Math.random() * 320, easing: 'cubic-bezier(.2, .7, .4, 1)' },
    ).onfinish = () => spark.remove();
  }

  function registerPass(event) {
    if (!round) return;
    const now = performance.now();
    if (now - round.lastPass < PASS_COOLDOWN) return;
    round.lastPass = now;

    round.passes += 1;
    round.count.textContent = `${round.passes} ${round.passes === 1 ? 'Weitergabe' : 'Weitergaben'}`;
    vibrate(8);
    sound.pass();
    showRipple(event);
    // Bombe macht einen Satz mit Drehung – „rüber zum Nächsten“
    if (!fx.reducedMotion()) {
      const side = Math.random() < 0.5 ? -1 : 1;
      round.svg.animate(
        [
          { transform: 'none' },
          { transform: `translate(${side * 26}px, -46px) rotate(${side * 200}deg) scale(1.08)`, offset: 0.45 },
          { transform: `translate(0, 0) rotate(${side * 360}deg) scale(1.05, .93)`, offset: 0.8 },
          { transform: `rotate(${side * 360}deg)` },
        ],
        { duration: 460, easing: 'cubic-bezier(.3, .7, .4, 1)' },
      );
    }
  }

  // Welle ab der Tippstelle als Rückmeldung (bei Tastaturbedienung aus der Mitte).
  function showRipple(event) {
    if (fx.reducedMotion()) return;
    const rect = round.field.getBoundingClientRect();
    const fromPointer = event.detail > 0;
    const size = Math.max(rect.width, rect.height) * 1.2;

    const ripple = document.createElement('span');
    ripple.className = 'bombe-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${fromPointer ? event.clientX - rect.left : rect.width / 2}px`;
    ripple.style.top = `${fromPointer ? event.clientY - rect.top : rect.height / 2}px`;
    round.field.append(ripple);

    ripple.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.35 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
      ],
      { duration: 550, easing: 'ease-out' },
    ).onfinish = () => ripple.remove();
    round.count.animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
  }

  function explode() {
    if (!round) return;
    const { category, passes } = round;
    stopRound();

    // Ort der Bombe merken, bevor der Bildschirm wechselt – dort beginnt der Feuerball
    const box = $('.bombe-svg', root)?.getBoundingClientRect();
    const center = box ? { x: box.left + box.width / 2, y: box.top + box.height * 0.6 } : { x: innerWidth / 2, y: innerHeight / 2 };

    sound.boom();
    vibrate([0, 120, 40, 200, 60, 320]);
    fx.flash('#fff6d8');
    showBoom(category, passes, center);
    fx.burst({ x: center.x, y: center.y, count: 130, colors: FIRE_COLORS.concat('#2b2522') });
    if (!fx.reducedMotion()) {
      document.querySelector('.app')?.animate(
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ transform: i === 8 ? 'none' : `translate(${(Math.random() * 2 - 1) * (18 - i * 2)}px, ${(Math.random() * 2 - 1) * (14 - i * 1.5)}px)` })),
        { duration: 650, easing: 'linear' },
      );
    }
  }

  function stopRound() {
    if (!round) return;
    ctx.clearTimeout(round.tickTimer);
    round.stopLoop?.();
    round = null;
  }

  function showBoom(category, passes, center) {
    const passLine = passes > 0 ? `<br>Die Bombe wurde ${passes}× weitergegeben.` : '';
    const smoke = Array.from({ length: 7 }, (_, i) => `<i style="--i: ${i}; --x: ${(Math.random() * 2 - 1) * 70}px; --s: ${0.7 + Math.random() * 0.8}"></i>`).join('');

    root.innerHTML = `
      <div class="bombe-blast" aria-hidden="true" style="--cx: ${center.x}px; --cy: ${center.y}px">
        <span class="bombe-fireball"></span>
        <span class="bombe-shockwave"></span>
        <span class="bombe-smoke">${smoke}</span>
      </div>
      <section class="screen bombe-boom">
        <div class="bombe-boom-burst">
          <svg class="bombe-star" viewBox="-100 -100 200 200" aria-hidden="true">
            <polygon points="${starPoints()}"/>
            <polygon class="bombe-star-inner" points="${starPoints(0.62)}"/>
          </svg>
          <p class="bombe-boom-text">Boom!</p>
        </div>
        <p class="bombe-boom-sub">Kategorie war <b>${esc(category)}</b>.<br>Wer die Bombe gerade hält, hat verloren.${passLine}</p>
        ${named() ? `
          <div class="bombe-loser">
            <p class="eyebrow">Wer hatte die Bombe?</p>
            <div class="bombe-loser-list">
              ${players.map((name, i) => `<button class="bombe-loser-btn" type="button" data-name="${esc(name)}" aria-pressed="false" style="--i: ${i}">${esc(name)}</button>`).join('')}
            </div>
            <ul class="bombe-tally" aria-live="polite"></ul>
          </div>` : ''}
        <div class="bombe-boom-actions">
          <button class="btn btn-primary" type="button" data-action="again">Nochmal</button>
          <button class="btn btn-ghost" type="button" data-action="setup">Zündzeit ändern</button>
        </div>
      </section>`;

    ctx.timeout(() => $('.bombe-blast', root)?.remove(), 2600);

    const readyAt = performance.now() + BOOM_INPUT_DELAY;
    const whenReady = (fn) => () => {
      if (performance.now() >= readyAt) fn();
    };
    $('[data-action="again"]', root).addEventListener('click', whenReady(startRound));
    $('[data-action="setup"]', root).addEventListener('click', whenReady(showSetup));
    if (named()) bindLoser();
  }

  // Erwischt: Name antippen zählt eine Explosion; ein anderer Name verschiebt sie dorthin
  function bindLoser() {
    let picked = null;
    renderTally();
    for (const button of root.querySelectorAll('.bombe-loser-btn')) {
      button.addEventListener('click', () => {
        const name = button.dataset.name;
        if (picked) booms.set(picked, (booms.get(picked) ?? 1) - 1);
        picked = picked === name ? null : name;
        if (picked) {
          booms.set(picked, (booms.get(picked) ?? 0) + 1);
          starter = picked;
          audio.noise({ duration: 0.25, volume: 0.35, cutoff: 900 });
          audio.tone({ freq: 120, slideTo: 50, duration: 0.25, type: 'sine', volume: 0.35 });
          vibrate(40);
          if (!fx.reducedMotion()) {
            button.animate([{ transform: 'scale(1.25) rotate(-6deg)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3, .8, .3, 1.4)' });
          }
        }
        for (const other of root.querySelectorAll('.bombe-loser-btn')) {
          other.setAttribute('aria-pressed', String(other.dataset.name === picked));
        }
        renderTally();
      });
    }
  }

  function renderTally() {
    const ranked = [...booms.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
    $('.bombe-tally', root).innerHTML = ranked
      .map(([name, count]) => `<li class="chip">💥 ${esc(name)} · ${count}</li>`)
      .join('');
  }
}

// Zackiger Comic-Explosionsstern (Punkte für ein SVG-Polygon)
function starPoints(scale = 1) {
  const spikes = 14;
  const points = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = (i % 2 ? 58 : 96 - (i % 4) * 6) * scale;
    const angle = (Math.PI * i) / spikes;
    points.push(`${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(' ');
}
