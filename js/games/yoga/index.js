import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupRow, setupScreen, splitLetters, toggleList } from '../../core/ui.js';
import { blend, figuresMarkup, poseSvg, standing, victory } from './figure.js';
import { LEVELS, duo, solo } from './poses.js';

const MODES = {
  solo: { label: 'Solo', poses: solo },
  duo: { label: 'Duo', poses: duo },
};
const HOLD_TIMES = ['15', '30', '45']; // Sekunden, als Text für den Segment-Schalter
const DEFAULT_HOLD = '30';
const DEFAULT_LEVELS = ['leicht', 'mittel'];

// So lange hat man Zeit, die Position einzunehmen, bevor die Haltezeit läuft.
const PREP_SECONDS = 5;
// In den letzten Sekunden tickt es.
const URGENT_SECONDS = 5;

const RING_RADIUS = 104;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const MORPH_MS = 1000;       // Übergang von einer Position in die nächste
const PREP_MORPH_MS = 1800;  // beim Einnehmen langsam vormachen
const INTRO_STEP_MS = 2600;  // Startbildschirm: Figur wechselt die Position
const BREATH_MS = 4000;      // einatmen – ausatmen
const FALL_MS = 700;

// Diese Positionen zeigt die Figur auf dem Startbildschirm nacheinander (Index in solo)
const INTRO_POSES = [0, 2, 8, 4, 3, 11];

const FALL_ICON = '💥';

const ICON = `
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="32" cy="17" r="5.5" fill="currentColor" stroke="none"/>
    <path d="M32 25v18M32 43v15M32 43l12-6-10-3M32 27l-10-14M32 27l10-14"/>
  </svg>`;

export default {
  id: 'yoga',
  title: 'Yoga-Challenge',
  tagline: 'Position nachmachen und halten – solo oder im Zweierteam. Wer umfällt, trinkt.',
  tags: ['Solo & Duo', 'Namen optional'],
  accent: '#06b6d4',
  icon: ICON,
  styles: new URL('./yoga.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  let mode = storage.get('mode') in MODES ? storage.get('mode') : 'solo';
  let levels = loadLevels();
  let hold = HOLD_TIMES.includes(storage.get('hold')) ? storage.get('hold') : DEFAULT_HOLD;
  let players = ctx.players.get();
  // Reihenfolge, aus der im Duo-Modus die Zweierteams gebildet werden (1+2, 3+4 …). Bleibt gespeichert.
  let teamOrder = Array.isArray(storage.get('teams')) ? storage.get('teams') : shuffle(players);

  // Während des Spiels: wer reihum dran ist (Namen oder Teams) und deren Punkte.
  let sides = [];      // [{ label, names: [...] }]
  let turn = 0;
  let points = new Map();
  let deck = [];
  let round = 0;
  let held = 0;
  let current = null;
  let stopCountdown = null;
  let breathTimer = null;
  let introTimer = null;
  const morphs = new WeakMap(); // laufender Übergang je SVG

  showSetup();

  function loadLevels() {
    const stored = storage.get('levels');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in LEVELS) : [];
    return valid.length ? valid : DEFAULT_LEVELS;
  }

  // Zweierteams aus der gemischten Reihenfolge. null, wenn sich keine vollständigen Teams bilden lassen.
  function buildTeams() {
    const names = teamOrder.filter((name) => players.includes(name));
    for (const name of players) if (!names.includes(name)) names.push(name);
    teamOrder = names;
    storage.set('teams', names);
    if (names.length < 2 || names.length % 2) return null;
    const teams = [];
    for (let i = 0; i < names.length; i += 2) teams.push([names[i], names[i + 1]]);
    return teams;
  }

  function sipsText(side) {
    if (!side) return mode === 'duo' ? 'Beide trinken je 1 Schluck.' : 'Trinken: 1 Schluck.';
    return side.names.length > 1 ? `${side.label} trinken je 1 Schluck.` : `${side.label} trinkt 1 Schluck.`;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    endCountdown();
    const levelOptions = Object.entries(LEVELS).map(([value, level]) => ({
      value,
      label: level.label,
      hint: `${level.hint} · ${solo.filter((pose) => pose.level === value).length} Solo, ${duo.filter((pose) => pose.level === value).length} Duo`,
    }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="yg-intro">
          <div class="yg-intro-figure">
            <span class="yg-sun" aria-hidden="true"></span>
            ${poseSvg(solo[INTRO_POSES[0]], { label: 'Yoga-Figur' })}
          </div>
          <h1 class="yg-title">${letters('Yoga-')}<br>${letters('Challenge', 5)}</h1>
          <p class="yg-lede">Position nachmachen und halten – wer vorher umfällt, trinkt.</p>
        </div>`,
      cards: [
        {
          icon: '⚙️',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Modus',
              control: segmented({ name: 'mode', label: 'Modus', options: Object.entries(MODES).map(([value, info]) => ({ value, label: info.label })), value: mode }),
              hint: '<p class="setup-note yg-mode-hint"></p>',
            })}
            ${setupRow({
              label: 'Haltezeit',
              control: segmented({ name: 'hold', label: 'Haltezeit', options: HOLD_TIMES.map((value) => ({ value, label: `${value} Sek.` })), value: hold }),
            })}`,
        },
        {
          icon: '📶',
          title: 'Schwierigkeit',
          count: 'levels',
          body: toggleList({ name: 'levels', label: 'Schwierigkeit wählen', options: levelOptions, values: levels }),
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: `${playerEditor({ name: 'players' })}<div class="yg-teams"></div>`,
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Platz schaffen, Schuhe aus – und Trinken ist kein Muss.',
    });

    const startButton = $('[data-action="start"]', root);
    const modeHint = $('.yg-mode-hint', root);
    const teamsBox = $('.yg-teams', root);
    let picked = null; // angetippter Name beim Tauschen (Index in teamOrder)

    const update = () => {
      modeHint.textContent = mode === 'duo'
        ? 'Feste Zweierteams: Jedes Team macht die Partnerposition gemeinsam und sammelt zusammen Punkte.'
        : 'Jede Person ist reihum allein dran.';

      if (mode === 'solo') {
        const named = players.length >= 2;
        startButton.textContent = named ? "Los geht's" : 'Ohne Namen starten';
        teamsBox.innerHTML = `<p class="yg-small">${named
          ? 'Reihum ist jeder dran – wer die Position hält, bekommt einen Punkt.'
          : 'Mit Namen sagt das Spiel, wer dran ist, und zählt Punkte. Für eine schnelle Runde einfach ohne starten.'}</p>`;
        return;
      }

      const teams = buildTeams();
      startButton.textContent = teams ? "Los geht's" : 'Ohne Teams starten';
      if (!teams) {
        teamsBox.innerHTML = `<p class="yg-small">${players.length % 2
          ? 'Für feste Zweierteams braucht ihr eine gerade Anzahl an Namen – sonst geht es ohne Teams.'
          : 'Tragt Namen ein, dann bildet das Spiel feste Zweierteams und zählt Punkte pro Team.'}</p>`;
        return;
      }
      const member = (name, index) =>
        `<button class="yg-member" type="button" data-index="${index}" aria-pressed="${index === picked}">${esc(name)}</button>`;
      teamsBox.innerHTML = `
        <ul class="yg-team-list">
          ${teams.map(([a, b], index) => `
            <li>
              <span class="yg-team-number">Team ${index + 1}</span>
              ${member(a, index * 2)}<span class="yg-and">&amp;</span>${member(b, index * 2 + 1)}
            </li>`).join('')}
        </ul>
        ${teams.length > 1
          ? `<p class="yg-small yg-center">${picked === null
              ? 'Selbst einteilen: erst einen Namen antippen, dann den, mit dem getauscht wird.'
              : `Mit wem soll ${esc(teamOrder[picked])} tauschen?`}</p>
             <button class="btn-link" type="button" data-action="shuffle">Zufällig mischen</button>`
          : ''}`;

      for (const button of teamsBox.querySelectorAll('.yg-member')) {
        button.addEventListener('click', () => {
          const index = Number(button.dataset.index);
          if (teams.length < 2) return;
          if (picked === null || picked === index) {
            picked = picked === index ? null : index;
          } else {
            [teamOrder[picked], teamOrder[index]] = [teamOrder[index], teamOrder[picked]];
            storage.set('teams', teamOrder);
            picked = null;
          }
          vibrate(10);
          update();
        });
      }
      $('[data-action="shuffle"]', teamsBox)?.addEventListener('click', () => {
        teamOrder = shuffle(teamOrder);
        storage.set('teams', teamOrder);
        picked = null;
        vibrate(10);
        update();
      });
    };

    bindSegmented(root, 'mode', (value) => {
      mode = value;
      storage.set('mode', value);
      update();
    });
    bindToggleList(root, 'levels', (values) => {
      levels = values;
      storage.set('levels', values);
    });
    bindSegmented(root, 'hold', (value) => {
      hold = value;
      storage.set('hold', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        update();
      },
    });
    startButton.addEventListener('click', startGame);
    update();
    startIntro();
  }

  // Die Figur fließt von Position zu Position
  function startIntro() {
    stopIntro();
    if (fx.reducedMotion()) return;
    const svg = $('.yg-intro-figure svg', root);
    let step = 0;
    introTimer = ctx.interval(() => {
      const from = solo[INTRO_POSES[step % INTRO_POSES.length]].figures;
      step += 1;
      morph(svg, from, solo[INTRO_POSES[step % INTRO_POSES.length]].figures, MORPH_MS * 1.1);
    }, INTRO_STEP_MS);
  }

  function stopIntro() {
    if (introTimer !== null) ctx.clearInterval(introTimer);
    introTimer = null;
  }

  // Bewegt die Figuren im SVG von einer Position in die andere
  function morph(svg, from, to, duration = MORPH_MS) {
    morphs.get(svg)?.();
    const layer = $('.yg-figures', svg);
    if (fx.reducedMotion()) {
      layer.innerHTML = figuresMarkup(to);
      return;
    }
    const start = performance.now();
    const stop = ctx.loop((now) => {
      const t = Math.min(1, (now - start) / duration);
      layer.innerHTML = figuresMarkup(blend(from, to, easeInOut(t)));
      if (t >= 1) {
        morphs.delete(svg);
        return false;
      }
    });
    morphs.set(svg, stop);
  }

  function startGame() {
    stopIntro();
    if (mode === 'duo') {
      const teams = buildTeams() ?? [];
      sides = teams.map((names) => ({ label: names.join(' & '), names }));
    } else {
      sides = players.length >= 2 ? players.map((name) => ({ label: name, names: [name] })) : [];
    }
    points = new Map(sides.map((side) => [side.label, 0]));
    deck = [];
    turn = 0;
    round = 0;
    held = 0;
    nextPose();
  }

  // ---------- Position ----------

  function draw() {
    if (!deck.length) {
      deck = shuffle(MODES[mode].poses.filter((pose) => levels.includes(pose.level)));
    }
    return deck.pop();
  }

  function nextPose() {
    current = draw();
    round += 1;
    showPose();
  }

  function scoreboard() {
    if (!sides.length || round < 2) return '';
    const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
    return `<ul class="chips yg-scores">${ranked.map(([label, score]) => `<li class="chip">${esc(label)} · ${score}</li>`).join('')}</ul>`;
  }

  function whoLabel() {
    const side = sides[turn];
    if (side) return side.label;
    return mode === 'duo' ? 'Zwei Freiwillige!' : 'Wer traut sich?';
  }

  function cardHead() {
    return `
      <span class="chip yg-level yg-level-${current.level}">${LEVELS[current.level].label}</span>
      <span class="chip">${MODES[mode].label}</span>`;
  }

  function cardText() {
    return `
      <p class="yg-name">${letters(current.name)}</p>
      ${current.sanskrit ? `<p class="yg-sanskrit">${esc(current.sanskrit)}</p>` : ''}
      <p class="yg-how">${esc(current.how)}</p>`;
  }

  function showPose() {
    endCountdown();
    stopIntro();
    const motion = !fx.reducedMotion();

    root.innerHTML = `
      <section class="screen yg-pose-screen">
        <div class="yg-head">
          <p class="eyebrow">Runde ${round}${sides.length ? (mode === 'duo' ? ' · Team ist dran' : ' · ist dran') : ''}</p>
          <h1 class="yg-who">${letters(whoLabel())}</h1>
        </div>
        ${scoreboard()}
        <div class="yg-card">
          <div class="yg-card-head">${cardHead()}</div>
          <div class="yg-figure-box">${poseSvg(current, { figures: motion ? standing(current.figures) : current.figures })}</div>
          <div class="yg-card-text">${cardText()}</div>
        </div>
        <div class="yg-actions">
          <button class="btn btn-primary" type="button" data-action="go">Bereit – ${hold} Sek. halten</button>
          <button class="btn btn-ghost" type="button" data-action="reroll">Andere Position</button>
        </div>
        <div class="yg-links">
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
          <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
        </div>
      </section>`;

    if (motion) {
      $('.yg-card', root).animate(
        [{ opacity: 0, transform: 'translateY(24px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
      const svg = $('.yg-figure-box svg', root);
      ctx.timeout(() => {
        sound.flow();
        morph(svg, standing(current.figures), current.figures);
      }, 280);
    }

    $('[data-action="go"]', root).addEventListener('click', showHold);
    $('[data-action="reroll"]', root).addEventListener('click', reroll);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }

  // Andere Position: die Figur geht direkt von der alten in die neue über
  function reroll() {
    const previous = current;
    current = draw();
    sound.flow();
    const svg = $('.yg-figure-box svg', root);
    svg.setAttribute('aria-label', current.name);
    morph(svg, previous.figures, current.figures);
    $('.yg-card-head', root).innerHTML = cardHead();
    const text = $('.yg-card-text', root);
    text.innerHTML = cardText();
    if (!fx.reducedMotion()) {
      text.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
      $('.yg-level', root).animate([{ transform: 'scale(.5)' }, { transform: 'scale(1.15)', offset: 0.6 }, { transform: 'none' }], { duration: 380 });
    }
  }

  // ---------- Einnehmen und halten ----------

  function showHold() {
    root.innerHTML = `
      <section class="screen yg-hold is-prep">
        <div class="yg-hold-figure">${poseSvg(current, { figures: fx.reducedMotion() ? current.figures : standing(current.figures) })}</div>
        <p class="yg-hold-name">${esc(current.name)}</p>
        <div class="yg-clock" role="timer">
          <span class="yg-breath" aria-hidden="true"></span>
          <svg class="yg-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle class="yg-ring-track" cx="110" cy="110" r="104"/>
            <circle class="yg-ring-progress" cx="110" cy="110" r="104" style="stroke-dasharray: ${RING_LENGTH}; stroke-dashoffset: 0"/>
            <circle class="yg-ring-tip" cx="${110 + RING_RADIUS}" cy="110" r="8"/>
          </svg>
          <span class="yg-clock-inner">
            <span class="yg-seconds">${PREP_SECONDS}</span>
            <span class="yg-phase">Position einnehmen</span>
          </span>
        </div>
        <p class="yg-breath-label" aria-hidden="true">&nbsp;</p>
        <div class="yg-actions">
          <button class="btn btn-ghost yg-fall" type="button" data-action="fall">Umgefallen</button>
        </div>
      </section>`;

    $('[data-action="fall"]', root).addEventListener('click', () => finish(false));

    const screen = $('.yg-hold', root);
    const ring = $('.yg-ring-progress', root);
    const tip = $('.yg-ring-tip', root);
    const label = $('.yg-seconds', root);
    const phase = $('.yg-phase', root);
    const breathLabel = $('.yg-breath-label', root);
    const motion = !fx.reducedMotion();
    // Die Figur macht die Position langsam vor
    morph($('.yg-hold-figure svg', root), standing(current.figures), current.figures, PREP_MORPH_MS);
    const total = Number(hold) * 1000;
    const prep = PREP_SECONDS * 1000;
    const start = performance.now();
    let shown = PREP_SECONDS;
    let holding = false;

    audio.sounds.blip();
    stopCountdown = ctx.loop((now) => {
      const elapsed = now - start;
      if (!holding && elapsed >= prep) {
        holding = true;
        screen.classList.remove('is-prep');
        phase.textContent = 'Halten!';
        shown = Number(hold);
        label.textContent = hold;
        sound.gong();
        vibrate(60);
        startBreathing(breathLabel);
        if (motion) {
          ripple($('.yg-clock', root));
          phase.animate([{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2, .8, .3, 1.3)' });
        }
      }

      const left = holding ? Math.max(0, total - (elapsed - prep)) : prep - elapsed;
      const share = left / (holding ? total : prep);
      ring.style.strokeDashoffset = String(RING_LENGTH * (1 - share));
      tip.setAttribute('cx', String(110 + RING_RADIUS * Math.cos(2 * Math.PI * share)));
      tip.setAttribute('cy', String(110 + RING_RADIUS * Math.sin(2 * Math.PI * share)));
      const whole = Math.ceil(left / 1000);
      if (whole !== shown) {
        shown = whole;
        label.textContent = String(whole);
        const urgent = holding && whole <= URGENT_SECONDS && whole > 0;
        if (!holding || urgent) {
          audio.sounds.tick();
          if (urgent) screen.classList.add('is-urgent');
        }
        if (motion) {
          label.animate([{ transform: `scale(${urgent ? 1.3 : 1.12})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
        }
      }
      if (holding && left <= 0) {
        finish(true);
        return false;
      }
    });
  }

  function endCountdown() {
    stopCountdown?.();
    stopCountdown = null;
    if (breathTimer !== null) ctx.clearInterval(breathTimer);
    breathTimer = null;
  }

  // Atemhilfe: der Kreis hinter der Uhr wächst beim Einatmen und schrumpft beim Ausatmen (per CSS, im selben Takt)
  function startBreathing(labelEl) {
    let inhale = true;
    const show = () => {
      labelEl.textContent = inhale ? 'Einatmen …' : 'Ausatmen …';
      if (!fx.reducedMotion()) {
        labelEl.animate([{ opacity: 0, letterSpacing: '.3em' }, { opacity: 1, letterSpacing: '.14em' }], { duration: 900, easing: 'ease-out' });
      }
      inhale = !inhale;
    };
    show();
    breathTimer = ctx.interval(show, BREATH_MS);
  }

  function ripple(anchor) {
    for (let i = 0; i < 2; i++) {
      const ring = document.createElement('span');
      ring.className = 'yg-ripple';
      anchor.append(ring);
      ring.animate(
        [{ transform: 'scale(.85)', opacity: 0.7 }, { transform: 'scale(1.7)', opacity: 0 }],
        { duration: 1300, delay: i * 260, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'both' },
      ).onfinish = () => ring.remove();
    }
  }

  // ---------- Ergebnis ----------

  function finish(success) {
    endCountdown();
    const side = sides[turn];

    if (success) {
      held += 1;
      if (side) points.set(side.label, points.get(side.label) + 1);
      sound.bowl();
      vibrate([0, 80, 40, 80]);
      celebrate();
    } else {
      sound.fall();
      vibrate([0, 120, 60, 120]);
    }

    const next = sides.length ? sides[(turn + 1) % sides.length] : null;
    root.innerHTML = `
      <section class="screen yg-result ${success ? 'is-success' : 'is-fail'}">
        <div class="yg-result-figure">
          ${poseSvg(current)}
          ${success ? '' : `<span class="yg-fall-icon" aria-hidden="true">${FALL_ICON}</span>`}
        </div>
        <p class="yg-result-title">${letters(success ? 'Geschafft!' : 'Umgefallen!')}</p>
        <p class="yg-result-text">${success
          ? `${side ? `+1 Punkt für ${esc(side.label)}` : 'Starke Balance!'} – ${esc(current.name)} gehalten.`
          : esc(sipsText(side))}</p>
        <button class="btn btn-primary" type="button" data-action="next">${next ? `Weiter – ${esc(next.label)}` : 'Nächste Position'}</button>
      </section>`;

    $('[data-action="next"]', root).addEventListener('click', () => {
      if (sides.length) turn = (turn + 1) % sides.length;
      nextPose();
    });

    const figureBox = $('.yg-result-figure', root);
    if (success) cheer(figureBox);
    else topple(figureBox);
  }

  function celebrate() {
    const styles = getComputedStyle(root);
    fx.burst({ colors: ['--accent', '--accent-2', '--partner'].map((token) => styles.getPropertyValue(token).trim()) });
  }

  // Geschafft: die Figur reißt die Arme hoch und hüpft, Blüten fliegen
  function cheer(box) {
    if (fx.reducedMotion()) return;
    const svg = $('svg', box);
    morph(svg, current.figures, victory(current.figures), 700);
    ctx.timeout(() => {
      $('.yg-figures', svg).animate(
        [{ transform: 'none' }, { transform: 'translateY(-10px)', offset: 0.3 }, { transform: 'none', offset: 0.55 }, { transform: 'translateY(-6px)', offset: 0.75 }, { transform: 'none' }],
        { duration: 900, easing: 'ease-in-out' },
      );
    }, 700);
    const petals = ['🌸', '✨', '🍃', '🌸', '💮'];
    for (let i = 0; i < 12; i++) {
      const petal = document.createElement('span');
      petal.className = 'yg-petal';
      petal.textContent = petals[i % petals.length];
      box.append(petal);
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 90 + Math.random() * 50;
      petal.animate(
        [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.2)' },
          { opacity: 1, transform: `translate(calc(-50% + ${Math.cos(angle) * distance * 0.6}px), calc(-50% + ${Math.sin(angle) * distance * 0.6}px)) scale(1.1) rotate(60deg)`, offset: 0.4 },
          { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance + 40}px)) scale(.8) rotate(160deg)` },
        ],
        { duration: 1500 + Math.random() * 500, delay: 250 + Math.random() * 200, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'both' },
      ).onfinish = () => petal.remove();
    }
  }

  // Umgefallen: jede Figur kippt um, prallt kurz ab und bleibt liegen
  function topple(box) {
    if (fx.reducedMotion()) return;
    const direction = Math.random() < 0.5 ? -1 : 1;
    $('.yg-fall-icon', box)?.classList.add(direction > 0 ? 'is-right' : 'is-left');
    box.querySelectorAll('.yg-figure').forEach((figure, index) => {
      // Drehpunkt an der Fußkante auf der Seite, zu der sie fällt – so landet die Figur flach auf dem Boden.
      // Liegt die Position schon eher waagerecht (z. B. Krieger III), sackt sie stattdessen in sich zusammen.
      const { width, height } = figure.getBBox();
      const end = width > height
        ? `rotate(${direction * 14}deg) scale(1.08, .4)`
        : `rotate(${direction * 90}deg)`;
      const rebound = width > height
        ? `rotate(${direction * 10}deg) scale(1.04, .55)`
        : `rotate(${direction * 80}deg)`;
      figure.style.transformOrigin = direction > 0 ? '100% 100%' : '0% 100%';
      figure.animate(
        [
          { transform: 'rotate(0deg)', easing: 'cubic-bezier(.3, 0, .1, .1)' },
          { transform: `rotate(${direction * -6}deg)`, offset: 0.15, easing: 'cubic-bezier(.5, 0, 1, .6)' },
          { transform: end, offset: 0.7, easing: 'ease-out' },
          { transform: rebound, offset: 0.85, easing: 'ease-in' },
          { transform: end },
        ],
        { duration: FALL_MS * 1.6, delay: 200 + index * 120, fill: 'forwards' },
      );
    });
    ctx.timeout(() => fx.shake(), 200 + FALL_MS * 1.6 * 0.7);
  }

  // ---------- Spielende ----------

  function showEnd() {
    endCountdown();
    const played = round - 1; // die gerade angezeigte Position zählt nicht
    if (!sides.length || !played) {
      showSetup();
      return;
    }

    const ranked = [...points.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0][1];
    const winners = ranked.filter(([, score]) => score === best && best > 0).map(([label]) => label);
    if (winners.length) {
      sound.bowl();
      celebrate();
    }
    const plural = winners.length > 1 || (mode === 'duo' && winners.length === 1);

    root.innerHTML = `
      <section class="screen yg-result yg-end" data-leave-free>
        <span class="yg-end-icon" aria-hidden="true">🧘</span>
        <p class="eyebrow">${played} ${played === 1 ? 'Position' : 'Positionen'} · ${held} gehalten</p>
        <p class="yg-result-title">${winners.length ? `${winners.map(esc).join(mode === 'duo' ? ' und ' : ' & ')} ${plural ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden'}</p>
        ${rankingList(ranked.map(([name, value]) => ({ name, value })))}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Buchstaben, die per CSS nacheinander erscheinen (Klassen .yg-word / .yg-letter)
const letters = (text, start = 0) => splitLetters(text, { prefix: 'yg', start });

// Ruhige Klänge: Gong, Klangschale, Luftzug – und ein Plumps
function createSounds(audio) {
  return {
    flow: () => audio.noise({ duration: 0.7, volume: 0.1, cutoff: 900 }),
    gong: () => {
      audio.noise({ duration: 0.12, volume: 0.25, cutoff: 500 });
      audio.tone({ freq: 98, duration: 3, type: 'sine', volume: 0.4 });
      audio.tone({ freq: 196.5, duration: 2.4, type: 'sine', volume: 0.16 });
      audio.tone({ freq: 297, duration: 1.6, type: 'triangle', volume: 0.06 });
      audio.tone({ freq: 415, duration: 1.2, type: 'sine', volume: 0.04 });
    },
    bowl: () => {
      audio.tone({ freq: 528, duration: 2.6, type: 'sine', volume: 0.2 });
      audio.tone({ freq: 531, duration: 2.6, type: 'sine', volume: 0.1 });
      audio.tone({ freq: 792, duration: 2, type: 'sine', volume: 0.08, delay: 0.04 });
      audio.tone({ freq: 1188, duration: 1.4, type: 'sine', volume: 0.05, delay: 0.08 });
    },
    fall: () => {
      audio.tone({ freq: 520, slideTo: 140, duration: 0.6, type: 'triangle', volume: 0.16, delay: 0.2 });
      audio.noise({ duration: 0.3, volume: 0.55, cutoff: 350, delay: 0.95 });
      audio.tone({ freq: 90, slideTo: 45, duration: 0.3, type: 'sine', volume: 0.45, delay: 0.95 });
    },
  };
}
