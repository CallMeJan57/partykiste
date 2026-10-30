import { $, esc } from '../../core/dom.js';
import { MAX_NAME_LENGTH, validateName } from '../../core/players.js';
import { bindPlayerEditor, bindSegmented, playerEditor, segmented, setupRow, setupScreen } from '../../core/ui.js';
import { loadActiveRules, saveActiveRules, untilLabel } from './active-rules.js';
import { basic, drinking } from './rules.js';

const PENALTIES = {
  feld: { label: '1 Feld zurück', text: 'Wer die Regel bricht, geht 1 Feld zurück.' },
  schluck: { label: '1 Schluck', text: 'Wer die Regel bricht, trinkt 1 Schluck.' },
  buh: { label: 'Ausbuhen', text: 'Wer die Regel bricht, wird von allen ausgebuht.' },
};
const DRINK_OPTIONS = [
  { value: 'aus', label: 'Ohne Trinkregeln' },
  { value: 'an', label: 'Mit Trinkregeln' },
];

const CUSTOM_EMOJI = '⭐';
const MAX_LABEL = 14;       // so viele Zeichen passen als Kurzname aufs Rad
const MAX_CUSTOM_LENGTH = 120;

// Farben der Felder, reihum
const SEGMENT_COLORS = ['#ff4f7b', '#ffb020', '#3d8bff', '#22c55e', '#a855f7', '#ff7a2e'];

// Rad: Radius der Felder und Lämpchen am Rand (SVG-Einheiten)
const RADIUS = 140;
const RIM_LIGHTS = 24;

// Drehen: mindestens so viele volle Umdrehungen, Dauer in ms
const MIN_TURNS = 5;
const SPIN_MS = 5600;

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="34" r="26" fill="#ffb020"/>
    <path d="M32 34V8A26 26 0 0 1 54.5 21Z" fill="#ff4f7b"/>
    <path d="M32 34 54.5 21A26 26 0 0 1 54.5 47Z" fill="#3d8bff"/>
    <path d="M32 34 54.5 47A26 26 0 0 1 32 60Z" fill="#22c55e"/>
    <path d="M32 34V60A26 26 0 0 1 9.5 47Z" fill="#a855f7"/>
    <path d="M32 34 9.5 47A26 26 0 0 1 9.5 21Z" fill="#ff7a2e"/>
    <circle cx="32" cy="34" r="7" fill="#fff"/>
    <path d="M25 2h14l-7 11Z" fill="currentColor"/>
  </svg>`;

export default {
  id: 'regelrad',
  title: 'Regelrad',
  tagline: 'Fürs Brettspiel: Regelfeld erwischt? Dreh am Rad – die Regel gilt, bis du wieder dran bist.',
  tags: ['Begleiter fürs Brettspiel', 'eigene Regeln'],
  accent: '#c026d3',
  icon: ICON,
  tool: true, // kein Spiel in der Liste, sondern ein Knopf oben in der Kopfzeile
  styles: new URL('./regelrad.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let drinkRules = storage.get('drink') === 'an' ? 'an' : 'aus';
  let penalty = storage.get('penalty') in PENALTIES ? storage.get('penalty') : 'feld';
  let custom = Array.isArray(storage.get('custom')) ? storage.get('custom') : [];
  let active = loadActiveRules();
  let players = ctx.players.get();
  let owner = null;     // wer aufs Regelfeld gekommen ist
  let rotation = 0;     // aktuelle Drehung des Rads in Grad (nicht auf 360 begrenzt)
  let spinning = false;
  let stopTicks = null;

  showWheel();

  // ---------- Regeln ----------

  function shortLabel(text) {
    return text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…` : text;
  }

  function rules() {
    const list = [...basic, ...(drinkRules === 'an' ? drinking : [])]
      .map(([emoji, title, text]) => ({ emoji, title, text }));
    for (const text of custom) list.push({ emoji: CUSTOM_EMOJI, title: shortLabel(text), text, custom: true });
    return list;
  }

  function saveActive() {
    saveActiveRules(active);
  }

  // ---------- Rad zeichnen ----------

  function point(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return `${(radius * Math.sin(rad)).toFixed(2)} ${(-radius * Math.cos(rad)).toFixed(2)}`;
  }

  function wheelSvg(list) {
    const step = 360 / list.length;
    const fontSize = list.length <= 12 ? 13 : list.length <= 20 ? 11 : 9.5;
    const emojiSize = list.length <= 20 ? 16 : 13;
    const segments = list.map((rule, index) => {
      const start = index * step - step / 2;
      const end = start + step;
      const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
      return `
        <path d="M0 0L${point(start, RADIUS)}A${RADIUS} ${RADIUS} 0 0 1 ${point(end, RADIUS)}Z" fill="${color}"/>
        <g transform="rotate(${index * step})">
          <text class="rr-seg-emoji" x="0" y="${-RADIUS + 16}" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="central">${esc(rule.emoji)}</text>
          <text class="rr-seg-label" transform="translate(0 ${-RADIUS + 30}) rotate(90)" font-size="${fontSize}" dominant-baseline="central">${esc(rule.title)}</text>
        </g>`;
    }).join('');
    const lights = Array.from({ length: RIM_LIGHTS }, (_, index) => {
      const [x, y] = point((360 / RIM_LIGHTS) * index, RADIUS + 9).split(' ');
      return `<circle class="rr-light" cx="${x}" cy="${y}" r="3.4" style="--i: ${index}"/>`;
    }).join('');

    return `
      <svg class="rr-wheel" viewBox="-160 -160 320 320" role="img" aria-label="Glücksrad mit ${list.length} Regeln">
        <circle class="rr-rim" r="${RADIUS + 9}"/>
        <g class="rr-spinner">
          ${segments}
          ${list.map((_, index) => `<path class="rr-divider" d="M0 0L${point(index * step - step / 2, RADIUS)}"/>`).join('')}
        </g>
        ${lights}
        <circle class="rr-hub" r="27"/>
        <circle class="rr-hub-inner" r="19"/>
        <text class="rr-hub-text" y="1" text-anchor="middle" dominant-baseline="central">🎲</text>
      </svg>`;
  }

  // ---------- Hauptansicht ----------

  function showWheel() {
    const list = rules();
    root.innerHTML = `
      <section class="screen rr-main" data-leave-free>
        <div class="rr-head">
          <p class="eyebrow">Regelfeld erwischt?</p>
          <h1 class="rr-title">Regelrad</h1>
        </div>
        ${players.length ? `
          <div class="rr-owner">
            <p class="eyebrow">Wer ist aufs Feld gekommen?</p>
            <div class="rr-owner-buttons">
              ${players.map((name) => `<button class="rr-owner-btn" type="button" data-owner="${esc(name)}" aria-pressed="${name === owner}">${esc(name)}</button>`).join('')}
            </div>
          </div>` : ''}
        <div class="rr-stage">
          <div class="rr-wheel-box">
            ${wheelSvg(list)}
            <svg class="rr-pointer" viewBox="0 0 40 52" aria-hidden="true">
              <path d="M20 50 4 14A17 17 0 1 1 36 14Z"/>
              <circle cx="20" cy="17" r="6"/>
            </svg>
          </div>
        </div>
        <button class="btn btn-primary rr-spin-btn" type="button" data-action="spin">Drehen!</button>
        <p class="rr-small rr-center">${list.length} Regeln auf dem Rad · ${PENALTIES[penalty].text}</p>
        <div class="rr-active"></div>
        <button class="btn-link" type="button" data-action="settings">Einstellungen &amp; eigene Regeln</button>
      </section>`;

    const spinner = $('.rr-spinner', root);
    spinner.style.transform = `rotate(${rotation}deg)`;

    for (const button of root.querySelectorAll('[data-owner]')) {
      button.addEventListener('click', () => {
        owner = owner === button.dataset.owner ? null : button.dataset.owner;
        for (const other of root.querySelectorAll('[data-owner]')) other.setAttribute('aria-pressed', String(other.dataset.owner === owner));
        vibrate(10);
      });
    }
    $('[data-action="spin"]', root).addEventListener('click', () => spin(list));
    $('.rr-wheel', root).addEventListener('click', () => spin(list));
    $('[data-action="settings"]', root).addEventListener('click', showSettings);
    renderActive();
  }

  // ---------- Drehen ----------

  function currentAngle(element) {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
  }

  // Index des Feldes, das gerade unter dem Zeiger (oben) steht.
  function segmentAt(angle, count) {
    const step = 360 / count;
    const position = ((-angle % 360) + 360) % 360;
    return Math.floor((position + step / 2) / step) % count;
  }

  function spin(list) {
    if (spinning || !list.length) return;
    spinning = true;
    const spinner = $('.rr-spinner', root);
    const pointer = $('.rr-pointer', root);
    const box = $('.rr-wheel-box', root);
    $('[data-action="spin"]', root).disabled = true;
    box.classList.add('is-spinning');

    // Bevorzugt eine Regel, die gerade nicht aktiv ist
    const activeTexts = new Set(active.map((rule) => rule.text));
    const candidates = list.map((rule, index) => index).filter((index) => !activeTexts.has(list[index].text));
    const pool = candidates.length ? candidates : list.map((_, index) => index);
    const target = pool[Math.floor(Math.random() * pool.length)];

    const step = 360 / list.length;
    const jitter = (Math.random() - 0.5) * step * 0.6;
    const desired = (((-target * step + jitter) % 360) + 360) % 360;
    const delta = (desired - ((rotation % 360) + 360) % 360 + 360) % 360;
    const turns = MIN_TURNS + Math.floor(Math.random() * 3);
    const from = rotation;
    const to = rotation + turns * 360 + delta;
    rotation = to;

    audio.noise({ duration: 0.5, volume: 0.25, cutoff: 1400 });
    vibrate(30);

    if (fx.reducedMotion()) {
      spinner.style.transform = `rotate(${to}deg)`;
      landed(list[target]);
      return;
    }

    spinner.style.transform = `rotate(${to}deg)`;
    const animation = spinner.animate(
      [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }],
      { duration: SPIN_MS + Math.random() * 900, easing: 'cubic-bezier(.12, .72, .1, 1)' },
    );

    // Zeiger klackert über jedes Feld
    let last = segmentAt(from, list.length);
    stopTicks = ctx.loop(() => {
      const index = segmentAt(currentAngle(spinner), list.length);
      if (index !== last) {
        last = index;
        audio.tone({ freq: 1500, duration: 0.025, type: 'square', volume: 0.07 });
        audio.noise({ duration: 0.02, volume: 0.12, cutoff: 5000 });
        pointer.animate(
          [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-22deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 140, easing: 'ease-out' },
        );
      }
    });

    animation.finished.then(() => {
      stopTicks?.();
      stopTicks = null;
      landed(list[target]);
    }, () => {});
  }

  function landed(rule) {
    spinning = false;
    $('.rr-wheel-box', root)?.classList.remove('is-spinning');
    const button = $('[data-action="spin"]', root);
    if (button) button.disabled = false;
    fanfare();
    vibrate([0, 60, 40, 60, 40, 120]);
    showResult(rule);
  }

  function fanfare() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, index) => {
      audio.tone({ freq, duration: 0.16, type: 'square', volume: 0.06, delay: index * 0.09 });
      audio.tone({ freq: freq * 2, duration: 0.12, type: 'triangle', volume: 0.04, delay: index * 0.09 });
    });
  }

  // ---------- Ergebnis ----------

  function untilText(name) {
    return name ? `Gilt für alle, bis ${esc(name)} wieder dran ist.` : 'Gilt für alle, bis die Person, die gedreht hat, wieder dran ist.';
  }

  function showResult(rule) {
    const overlay = document.createElement('div');
    overlay.className = 'rr-overlay';
    overlay.innerHTML = `
      <div class="rr-rays-clip" aria-hidden="true"><div class="rr-rays"></div></div>
      <div class="rr-card" role="dialog" aria-modal="true" aria-label="Neue Regel">
        <p class="eyebrow">Neue Regel!</p>
        <div class="rr-card-emoji">${esc(rule.emoji)}</div>
        <h2 class="rr-card-title">${esc(rule.custom ? 'Eigene Regel' : rule.title)}</h2>
        <p class="rr-card-text">${esc(rule.text)}</p>
        <div class="rr-card-owner">
          <p class="eyebrow">Wer ist aufs Feld gekommen?</p>
          <div class="rr-owner-buttons"></div>
          <form class="rr-owner-add" autocomplete="off">
            <input type="text" maxlength="${MAX_NAME_LENGTH}" placeholder="Name eintragen" enterkeyhint="done" aria-label="Name der Person, die aufs Feld gekommen ist">
            <button type="submit" aria-label="Name hinzufügen">+</button>
          </form>
          <p class="rr-owner-error" aria-live="polite"></p>
        </div>
        <p class="rr-card-until">${untilText(owner)}</p>
        <p class="rr-card-penalty">${PENALTIES[penalty].text}</p>
        <button class="btn btn-primary" type="button" data-action="activate">Regel gilt ab jetzt!</button>
      </div>`;
    root.querySelector('.rr-main').append(overlay);

    if (!fx.reducedMotion()) {
      const card = $('.rr-card', overlay);
      const box = card.getBoundingClientRect();
      const styles = getComputedStyle(root);
      ctx.timeout(() => fx.burst({
        x: box.left + box.width / 2,
        y: box.top + 70,
        count: 70,
        colors: SEGMENT_COLORS.concat(styles.getPropertyValue('--accent').trim()),
      }), 250);
    }

    bindCardOwner(overlay);

    $('[data-action="activate"]', overlay).addEventListener('click', () => {
      active.unshift({ id: Date.now(), emoji: rule.emoji, title: rule.custom ? 'Eigene Regel' : rule.title, text: rule.text, owner });
      saveActive();
      audio.sounds.success();
      overlay.classList.add('is-closing');
      ctx.timeout(() => {
        overlay.remove();
        owner = null;
        showWheel(); // neu zeichnen, falls in der Karte Namen dazugekommen sind
        renderActive(true);
      }, fx.reducedMotion() ? 0 : 220);
    });
  }

  // In der Ergebniskarte: Person antippen oder neuen Namen eintragen (landet in der gemeinsamen Spielerliste)
  function bindCardOwner(overlay) {
    const buttons = $('.rr-owner-buttons', overlay);
    const until = $('.rr-card-until', overlay);
    const form = $('.rr-owner-add', overlay);
    const input = $('input', form);
    const error = $('.rr-owner-error', overlay);

    const render = () => {
      buttons.innerHTML = players
        .map((name) => `<button class="rr-owner-btn" type="button" data-card-owner="${esc(name)}" aria-pressed="${name === owner}">${esc(name)}</button>`)
        .join('');
      until.innerHTML = untilText(owner);
    };

    buttons.addEventListener('click', (event) => {
      const button = event.target.closest('[data-card-owner]');
      if (!button) return;
      owner = owner === button.dataset.cardOwner ? null : button.dataset.cardOwner;
      vibrate(10);
      render();
      if (owner && !fx.reducedMotion()) {
        until.animate([{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3, .8, .3, 1.4)' });
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = validateName(input.value, players);
      if (result.error) {
        error.textContent = result.error;
        return;
      }
      error.textContent = '';
      input.value = '';
      input.blur();
      players = [...players, result.name];
      ctx.players.set(players);
      owner = result.name;
      vibrate(10);
      render();
    });

    render();
  }

  // ---------- Aktive Regeln ----------

  function renderActive(animateFirst = false) {
    const box = $('.rr-active', root);
    if (!box) return;
    if (!active.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = `
      <p class="eyebrow">Aktive Regeln · ${active.length}</p>
      <ul class="rr-active-list">
        ${active.map((rule) => `
          <li class="rr-rule" data-id="${rule.id}">
            <span class="rr-rule-emoji" aria-hidden="true">${esc(rule.emoji)}</span>
            <span class="rr-rule-body">
              <b>${esc(rule.title)}</b>
              <span>${esc(rule.text)}</span>
              <small>${esc(untilLabel(rule))}</small>
            </span>
            <button class="rr-rule-done" type="button" data-done="${rule.id}" aria-label="Regel ${esc(rule.title)} beenden">Vorbei</button>
          </li>`).join('')}
      </ul>`;

    if (animateFirst && !fx.reducedMotion()) {
      box.querySelector('.rr-rule')?.animate(
        [{ opacity: 0, transform: 'translateY(-14px) scale(.96)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
    }

    for (const button of box.querySelectorAll('[data-done]')) {
      button.addEventListener('click', () => {
        const id = Number(button.dataset.done);
        const item = button.closest('.rr-rule');
        audio.sounds.blip();
        vibrate(15);
        const remove = () => {
          active = active.filter((rule) => rule.id !== id);
          saveActive();
          renderActive();
        };
        if (fx.reducedMotion()) {
          remove();
          return;
        }
        item.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }],
          { duration: 240, easing: 'ease-in', fill: 'forwards' },
        ).finished.then(remove, () => {});
      });
    }
  }

  // ---------- Einstellungen ----------

  function showSettings() {
    root.innerHTML = setupScreen({
      hero: `
        <div class="rr-head">
          <p class="eyebrow">Regelrad</p>
          <h1 class="rr-title">Einstellungen</h1>
        </div>`,
      cards: [
        {
          icon: '⚖️',
          title: 'Regeln',
          body: `
            ${setupRow({
              label: 'Strafe bei Regelbruch',
              control: segmented({ name: 'penalty', label: 'Strafe', options: Object.entries(PENALTIES).map(([value, info]) => ({ value, label: info.label })), value: penalty }),
            })}
            ${setupRow({
              label: 'Trinkregeln',
              control: segmented({ name: 'drink', label: 'Trinkregeln', options: DRINK_OPTIONS, value: drinkRules }),
              hint: `<p class="setup-note">Mit Trinkregeln kommen ${drinking.length} weitere Regeln aufs Rad, z. B. „Wer eine 1 würfelt, trinkt“.</p>`,
            })}`,
        },
        {
          icon: '✍️',
          title: 'Eigene Regeln',
          body: `
            <ul class="rr-custom-list"></ul>
            <form class="rr-custom-add" autocomplete="off">
              <input type="text" name="rule" maxlength="${MAX_CUSTOM_LENGTH}" placeholder="z. B. Alle reden wie Piraten" enterkeyhint="done" aria-label="Eigene Regel">
              <button type="submit" aria-label="Regel hinzufügen">+</button>
            </form>`,
          note: `Eigene Regeln landen mit ${CUSTOM_EMOJI} auf dem Rad.`,
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: 'Mit Namen tippt ihr an, wer aufs Regelfeld gekommen ist.',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="to-wheel">Zum Rad</button>',
    });

    bindSegmented(root, 'penalty', (value) => {
      penalty = value;
      storage.set('penalty', value);
    });
    bindSegmented(root, 'drink', (value) => {
      drinkRules = value;
      storage.set('drink', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        if (!players.includes(owner)) owner = null;
      },
    });

    const list = $('.rr-custom-list', root);
    const renderCustom = () => {
      list.innerHTML = custom.map((text, index) => `
        <li class="rr-custom">
          <span>${CUSTOM_EMOJI} ${esc(text)}</span>
          <button type="button" data-remove="${index}" aria-label="Regel entfernen">×</button>
        </li>`).join('');
    };
    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove]');
      if (!button) return;
      custom = custom.filter((_, index) => index !== Number(button.dataset.remove));
      storage.set('custom', custom);
      renderCustom();
    });
    const form = $('.rr-custom-add', root);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('input');
      const text = input.value.trim().replace(/\s+/g, ' ');
      if (!text) return;
      custom = [...custom, text];
      storage.set('custom', custom);
      input.value = '';
      renderCustom();
      input.focus();
    });
    renderCustom();

    $('[data-action="to-wheel"]', root).addEventListener('click', showWheel);
  }
}
