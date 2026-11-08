import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, segmented, setupRow, setupScreen, splitLetters, toggleList } from '../../core/ui.js';

// Die App ist die Spielleitung: Sie verteilt die Rollen, ruft nachts die Rollen auf (Handy liegt in der Mitte)
// und führt tagsüber durch Verkündung, Diskussion und Abstimmung.

const MIN_PLAYERS = 5;
const WOLF_OPTIONS = ['auto', '1', '2', '3', '4'];
const TALK_OPTIONS = ['2', '3', '5', 'ohne']; // Minuten Diskussion
const SPECIALS = ['seherin', 'hexe', 'jaeger', 'amor'];
const DEFAULT_SPECIALS = ['seherin', 'hexe'];

const VOICE_RATE = 0.84;  // Erzählstimme etwas langsamer als normal
const VOICE_PITCH = 1;    // natürliche Tonhöhe – tiefer klingt schnell nach Roboter
const SAMPLE_TEXT = 'Die Nacht bricht herein. Alle schließen die Augen … und das Dorf schläft.';

const STEP_PAUSE_MS = 1800;      // zwischen „schläft ein“ und der nächsten Rolle
const FAKE_TURN_MS = [7000, 11000]; // so lange „wartet“ eine Rolle, die schon tot ist
const LOVERS_MS = 7000;          // Verliebte schauen sich an
const SUNRISE_MS = 1600;

const ROLES = {
  werwolf: { name: 'Werwolf', emoji: '🐺', team: 'wolves', color: '#e5484d', text: 'Nachts frisst du mit den anderen Werwölfen einen Menschen. Tagsüber spielst du den harmlosen Nachbarn.' },
  dorf: { name: 'Dorfbewohner', emoji: '🧑‍🌾', team: 'village', color: '#d9a441', text: 'Du hast keine besondere Fähigkeit – nur deinen Verstand. Finde heraus, wer die Werwölfe sind.' },
  seherin: { name: 'Seherin', emoji: '🔮', team: 'village', color: '#8b7cf6', text: 'Jede Nacht darfst du die wahre Gestalt eines Menschen sehen.' },
  hexe: { name: 'Hexe', emoji: '🧪', team: 'village', color: '#34c46b', text: 'Du hast einen Heiltrank und einen Gifttrank – jeden nur einmal im ganzen Spiel.' },
  jaeger: { name: 'Jäger', emoji: '🏹', team: 'village', color: '#c2763a', text: 'Wenn du stirbst, nimmst du mit deinem letzten Schuss noch jemanden mit.' },
  amor: { name: 'Amor', emoji: '💘', team: 'village', color: '#ff6fae', text: 'In der ersten Nacht verliebst du zwei Menschen. Stirbt einer, stirbt der andere vor Kummer.' },
};

const GOALS = {
  wolves: 'Ihr Werwölfe gewinnt, sobald es so viele Werwölfe wie Menschen gibt.',
  village: 'Du gehörst zum Dorf: Ihr gewinnt, wenn alle Werwölfe tot sind.',
};

const WINNERS = {
  village: { emoji: '🏡', title: 'Das Dorf gewinnt!', text: 'Alle Werwölfe sind besiegt. Endlich wieder ruhige Nächte.' },
  wolves: { emoji: '🐺', title: 'Die Werwölfe gewinnen!', text: 'Das Dorf hat zu spät gemerkt, wer heult.' },
  lovers: { emoji: '💘', title: 'Das Liebespaar gewinnt!', text: 'Nur die zwei Verliebten sind übrig – Liebe schlägt alles.' },
};

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="#141a3a"/>
    <circle cx="40" cy="22" r="10" fill="#f4f1d8"/>
    <path d="M14 52l6-14 4 3 3-12 4 9 5-5 2 9 6-2-3 12Z" fill="#0b0e22"/>
    <circle cx="27" cy="38" r="1.6" fill="#ffd34d"/><circle cx="32" cy="38" r="1.6" fill="#ffd34d"/>
  </svg>`;

// Startbild: Vollmond über dem Dorf, ein Wolf heult auf dem Hügel, im Wald leuchten Augen
const HERO = `
  <div class="ww-hero" aria-hidden="true">
    <svg viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ww-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b1030"/><stop offset="1" stop-color="#27306a"/>
        </linearGradient>
        <radialGradient id="ww-glow"><stop offset="0" stop-color="#f4f1d8" stop-opacity=".6"/><stop offset="1" stop-color="#f4f1d8" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#ww-sky)"/>
      <g class="ww-stars" fill="#fff"><circle cx="24" cy="20" r="1.2"/><circle cx="60" cy="44" r="1"/><circle cx="100" cy="16" r="1.3"/><circle cx="244" cy="30" r="1.1"/><circle cx="262" cy="64" r="1"/><circle cx="140" cy="40" r="1"/></g>
      <circle cx="190" cy="52" r="60" fill="url(#ww-glow)" class="ww-moon-glow"/>
      <circle cx="190" cy="52" r="28" fill="#f4f1d8"/>
      <circle cx="181" cy="44" r="5" fill="#e3dfbf"/><circle cx="199" cy="60" r="7" fill="#e3dfbf"/>
      <path d="M0 160v-30c40-18 80-22 120-14 30 6 50 4 70-6 34-16 64-14 90 0v50Z" fill="#090c20"/>
      <g class="ww-wolf"><path d="M196 104l4-9 3 2 3-8 2 6 4-3 1 6 6 2-2 5 6 4H196Z" fill="#090c20"/><path d="M203 92l2-12 4 9Z" fill="#090c20"/></g>
      <path d="M30 140v-22h-5l18-16 18 16h-5v22Z" fill="#0d1230"/>
      <rect class="ww-window" x="36" y="122" width="7" height="8" fill="#ffc65c"/>
      <path d="M72 144v-16h-4l13-12 13 12h-4v16Z" fill="#0d1230"/>
      <g class="ww-eyes" fill="#ffd34d"><circle cx="122" cy="132" r="1.6"/><circle cx="128" cy="132" r="1.6"/></g>
      <g class="ww-eyes ww-eyes-2" fill="#ff5d5d"><circle cx="252" cy="138" r="1.5"/><circle cx="258" cy="138" r="1.5"/></g>
      <path d="M100 160l10-34 10 34ZM112 160l12-44 12 44ZM236 160l10-30 10 30ZM256 160l8-24 8 24Z" fill="#070a1a"/>
    </svg>
  </div>`;

export default {
  id: 'werwolf',
  title: 'Werwolf',
  tagline: 'Nachts schlagen die Werwölfe zu, tagsüber sucht das Dorf die Schuldigen. Die App leitet das Spiel.',
  tags: [`ab ${MIN_PLAYERS} Spielern`, 'Erzählstimme'],
  accent: '#5b6cff',
  icon: ICON,
  styles: new URL('./werwolf.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);

  // Das Spiel läuft immer im dunklen Design – Nacht ist Nacht
  const html = document.documentElement;
  const previousTheme = html.dataset.theme;
  html.dataset.theme = 'dark';
  ctx.onCleanup(() => {
    if (previousTheme) html.dataset.theme = previousTheme;
    else delete html.dataset.theme;
    window.speechSynthesis?.cancel();
  });

  let players = ctx.players.get();
  let specials = loadSpecials();
  let wolves = WOLF_OPTIONS.includes(storage.get('wolves')) ? storage.get('wolves') : 'auto';
  let talk = TALK_OPTIONS.includes(storage.get('talk')) ? storage.get('talk') : '3';
  let voiceOn = storage.get('voice') !== 'aus';
  let voiceName = storage.get('voiceName', '');

  let cast = [];          // [{ name, role, alive }]
  let lovers = [];        // zwei Namen
  let potions = { heal: true, poison: true };
  let night = 0;
  let victim = null;      // Opfer der Werwölfe in dieser Nacht
  let healed = false;
  let poisoned = null;

  showSetup();

  function loadSpecials() {
    const stored = storage.get('specials');
    return Array.isArray(stored) ? stored.filter((key) => SPECIALS.includes(key)) : DEFAULT_SPECIALS;
  }

  // ---------- Erzählstimme ----------

  // Satz für Satz sprechen: Zwischen den Sätzen entsteht eine kleine Pause, das klingt weniger hastig
  function speak(text, force = false) {
    if ((!voiceOn && !force) || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = germanVoices();
    const voice = voices.find((entry) => entry.name === voiceName) ?? voices[0];
    for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
      const line = new SpeechSynthesisUtterance(sentence);
      line.lang = voice?.lang ?? 'de-DE';
      line.rate = VOICE_RATE;
      line.pitch = VOICE_PITCH;
      if (voice) line.voice = voice;
      synth.speak(line);
    }
  }

  // ---------- Hilfen ----------

  function alive() {
    return cast.filter((person) => person.alive);
  }

  function person(name) {
    return cast.find((entry) => entry.name === name);
  }

  function holders(role) {
    return cast.filter((entry) => entry.role === role);
  }

  function inGame(role) {
    return holders(role).length > 0;
  }

  function roleAlive(role) {
    return holders(role).some((entry) => entry.alive);
  }

  function wolfCount(count = players.length) {
    if (wolves !== 'auto') return Number(wolves);
    return Math.max(1, Math.round(count / 4));
  }

  function setSky(state) {
    root.classList.toggle('is-day', state === 'day');
  }

  function roleCard(role, { big = false } = {}) {
    const info = ROLES[role];
    return `
      <div class="ww-card${big ? ' is-big' : ''}" style="--role: ${info.color}">
        <span class="ww-card-emoji" aria-hidden="true">${info.emoji}</span>
        <b class="ww-card-name">${info.name}</b>
      </div>`;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    setSky('night');
    window.speechSynthesis?.cancel();
    const options = SPECIALS.map((key) => ({ value: key, label: `${ROLES[key].emoji} ${ROLES[key].name}`, hint: ROLES[key].text }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="ww-intro">
          ${HERO}
          <h1 class="ww-title" aria-label="Werwolf">${splitLetters('Werwolf', { prefix: 'ww' })}</h1>
          <p class="ww-lede">Die Nacht bricht herein. Wer von euch ist in Wahrheit ein Werwolf?</p>
        </div>`,
      cards: [
        {
          icon: '👥',
          title: 'Mitspieler',
          body: playerEditor({ name: 'players' }),
          note: '<span class="ww-cast-hint"></span>',
        },
        {
          icon: '🃏',
          title: 'Sonderrollen',
          count: 'specials',
          body: toggleList({ name: 'specials', label: 'Sonderrollen wählen', options, values: specials }),
          note: 'Alle anderen sind Werwölfe oder einfache Dorfbewohner.',
        },
        {
          icon: '🐺',
          title: 'Spiel',
          body: `
            ${setupRow({
              label: 'Werwölfe',
              control: segmented({ name: 'wolves', label: 'Anzahl Werwölfe', options: WOLF_OPTIONS.map((value) => ({ value, label: value === 'auto' ? 'Auto' : value })), value: wolves }),
            })}
            ${setupRow({
              label: 'Diskussion am Tag',
              control: segmented({ name: 'talk', label: 'Diskussion am Tag', options: TALK_OPTIONS.map((value) => ({ value, label: value === 'ohne' ? 'Ohne Uhr' : `${value} Min.` })), value: talk }),
            })}
            ${setupRow({
              label: 'Erzählstimme',
              control: segmented({ name: 'voice', label: 'Erzählstimme', options: [{ value: 'an', label: '🔊 An' }, { value: 'aus', label: '🔇 Aus' }], value: voiceOn ? 'an' : 'aus' }),
            })}
            <div class="ww-voice"${voiceOn ? '' : ' hidden'}>
              <select class="ww-voice-select" aria-label="Stimme der Erzählung"></select>
              <button class="btn btn-ghost ww-voice-test" type="button">▶ Probe</button>
            </div>`,
          note: 'Die Stimme liest nachts vor, wer aufwachen soll. Am iPhone klingt sie viel natürlicher mit einer „Erweitert“- oder „Premium“-Stimme: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch.',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">Rollen verteilen</button>',
    });

    const startButton = $('[data-action="start"]', root);
    const hint = $('.ww-cast-hint', root);
    const update = () => {
      const enough = players.length >= MIN_PLAYERS;
      const wolvesNow = wolfCount();
      const tooMany = wolvesNow * 2 >= players.length;
      const villagers = players.length - wolvesNow - specials.length;
      startButton.disabled = !enough || tooMany || villagers < 0;
      if (!enough) hint.textContent = `Werwolf braucht mindestens ${MIN_PLAYERS} Namen – noch ${MIN_PLAYERS - players.length}.`;
      else if (tooMany) hint.textContent = 'Zu viele Werwölfe für so wenige Leute – weniger Werwölfe wählen.';
      else if (villagers < 0) hint.textContent = 'Mehr Rollen als Leute – Sonderrollen abwählen.';
      else hint.textContent = `${players.length} Leute: ${wolvesNow} ${wolvesNow === 1 ? 'Werwolf' : 'Werwölfe'}, ${specials.length} ${specials.length === 1 ? 'Sonderrolle' : 'Sonderrollen'}, ${villagers} Dorfbewohner.`;
    };

    bindToggleList(root, 'specials', (values) => {
      specials = values;
      storage.set('specials', values);
      update();
    }, { min: 0 });
    bindSegmented(root, 'wolves', (value) => {
      wolves = value;
      storage.set('wolves', value);
      update();
    });
    bindSegmented(root, 'talk', (value) => {
      talk = value;
      storage.set('talk', value);
    });
    const voiceBox = $('.ww-voice', root);
    const voiceSelect = $('.ww-voice-select', root);
    // Die Stimmen lädt der Browser manchmal erst nach dem Start – dann wird die Liste neu gefüllt
    const fillVoices = () => {
      const voices = germanVoices();
      voiceSelect.innerHTML = voices.length
        ? voices.map((voice) => `<option value="${esc(voice.name)}"${voice.name === voiceName ? ' selected' : ''}>${esc(voiceLabel(voice))}</option>`).join('')
        : '<option value="">Standardstimme</option>';
    };
    fillVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', fillVoices);
    ctx.onCleanup(() => window.speechSynthesis?.removeEventListener('voiceschanged', fillVoices));
    voiceSelect.addEventListener('change', () => {
      voiceName = voiceSelect.value;
      storage.set('voiceName', voiceName);
      speak(SAMPLE_TEXT, true);
    });
    $('.ww-voice-test', root).addEventListener('click', () => speak(SAMPLE_TEXT, true));

    bindSegmented(root, 'voice', (value) => {
      voiceOn = value === 'an';
      storage.set('voice', value);
      voiceBox.hidden = !voiceOn;
      if (voiceOn) speak('Die Erzählstimme ist an.');
      else window.speechSynthesis?.cancel();
    });
    players = bindPlayerEditor(root, 'players', {
      min: MIN_PLAYERS,
      onChange: (list) => {
        players = list;
        update();
      },
    });
    update();
    startButton.addEventListener('click', startGame);
  }

  function startGame() {
    const roles = [
      ...Array(wolfCount()).fill('werwolf'),
      ...specials,
    ];
    while (roles.length < players.length) roles.push('dorf');
    const dealt = shuffle(roles);
    cast = players.map((name, index) => ({ name, role: dealt[index], alive: true }));
    lovers = [];
    potions = { heal: true, poison: true };
    night = 0;
    showHandover(0);
  }

  // ---------- Rollen verteilen: das Handy geht reihum ----------

  function showHandover(index) {
    if (index >= cast.length) {
      showNightIntro();
      return;
    }
    const entry = cast[index];
    root.innerHTML = `
      <section class="screen ww-deal">
        <p class="eyebrow">Rolle ${index + 1} von ${cast.length}</p>
        <h1 class="ww-who">${esc(entry.name)}</h1>
        <p class="ww-lede">Nimm das Handy – nur du darfst hinschauen.</p>
        <button class="ww-flip" type="button" data-action="flip" aria-label="Rolle aufdecken">
          <span class="ww-flip-inner">
            <span class="ww-flip-back">
              <span class="ww-flip-moon" aria-hidden="true">🌕</span>
              <span class="ww-flip-label">Antippen zum Aufdecken</span>
            </span>
            <span class="ww-flip-front" style="--role: ${ROLES[entry.role].color}">
              <span class="ww-card-emoji" aria-hidden="true">${ROLES[entry.role].emoji}</span>
              <b class="ww-card-name">${ROLES[entry.role].name}</b>
              <span class="ww-card-text">${ROLES[entry.role].text}</span>
              <span class="ww-card-goal">${GOALS[ROLES[entry.role].team]}</span>
            </span>
          </span>
        </button>
        <button class="btn btn-primary" type="button" data-action="done" disabled>Verstanden – zudecken</button>
      </section>`;

    const flip = $('.ww-flip', root);
    const done = $('[data-action="done"]', root);
    flip.addEventListener('click', () => {
      if (flip.classList.contains('is-open')) return;
      flip.classList.add('is-open');
      done.disabled = false;
      // Für jede Rolle gleich und ohne Ton – sonst hören die anderen, wer Werwolf ist
      vibrate(20);
    });
    done.addEventListener('click', () => {
      flip.classList.remove('is-open');
      sound.cover();
      ctx.timeout(() => showPass(index + 1), fx.reducedMotion() ? 0 : 450);
    });
  }

  function showPass(index) {
    if (index >= cast.length) {
      showNightIntro();
      return;
    }
    root.innerHTML = `
      <section class="screen ww-pass">
        <span class="ww-pass-icon" aria-hidden="true">📱</span>
        <p class="ww-lede">Gib das Handy weiter an</p>
        <h1 class="ww-who">${esc(cast[index].name)}</h1>
        <button class="btn btn-primary" type="button" data-action="next">Ich bin ${esc(cast[index].name)}</button>
      </section>`;
    $('[data-action="next"]', root).addEventListener('click', () => showHandover(index));
  }

  // ---------- Nacht ----------

  function showNightIntro() {
    night += 1;
    victim = null;
    healed = false;
    poisoned = null;
    setSky('night');
    root.innerHTML = `
      <section class="screen ww-night ww-center">
        <p class="eyebrow">Nacht ${night}</p>
        <span class="ww-moon" aria-hidden="true"></span>
        <h1 class="ww-big">Die Nacht bricht herein</h1>
        <p class="ww-lede">Legt das Handy in die Mitte. Wenn alle bereit sind: antippen, dann schließen alle die Augen.</p>
        <button class="btn btn-primary" type="button" data-action="sleep">Alle schließen die Augen</button>
        ${night > 1 ? '<button class="btn-link" type="button" data-action="end">Spiel beenden</button>' : ''}
      </section>`;
    $('[data-action="sleep"]', root).addEventListener('click', () => {
      sound.night();
      speak(`Nacht ${night}. Alle schließen die Augen. Das Dorf schläft.`);
      ctx.timeout(() => runNight(nightSteps(), 0), 4200);
      showWaiting('Das Dorf schläft …');
    });
    $('[data-action="end"]', root)?.addEventListener('click', () => showEnd(null));
  }

  function nightSteps() {
    const steps = [];
    if (night === 1 && inGame('amor')) steps.push('amor', 'lovers');
    if (inGame('seherin')) steps.push('seherin');
    steps.push('werwolf');
    if (inGame('hexe')) steps.push('hexe');
    return steps;
  }

  function showWaiting(text) {
    root.innerHTML = `
      <section class="screen ww-night ww-center ww-asleep">
        <span class="ww-moon" aria-hidden="true"></span>
        <p class="ww-zzz" aria-hidden="true"><span>z</span><span>z</span><span>z</span></p>
        <p class="ww-lede">${esc(text)}</p>
      </section>`;
  }

  function runNight(steps, index) {
    if (index >= steps.length) {
      showWaiting('Die Nacht geht zu Ende …');
      speak('Die Nacht geht zu Ende.');
      ctx.timeout(sunrise, 2600);
      return;
    }
    const next = () => {
      showWaiting('…');
      ctx.timeout(() => runNight(steps, index + 1), STEP_PAUSE_MS);
    };
    const step = steps[index];
    if (step === 'lovers') return loversStep(next);
    if (step === 'werwolf') return wolvesStep(next);
    // Ist die Rolle schon tot, wird sie trotzdem aufgerufen – sonst wüsste das Dorf Bescheid
    if (!roleAlive(step)) return fakeStep(step, next);
    if (step === 'amor') return amorStep(next);
    if (step === 'seherin') return seerStep(next);
    if (step === 'hexe') return witchStep(next);
    next();
  }

  // Rahmen für eine Rolle, die gerade wach ist
  function roleScreen(role, { title, text, body = '' }) {
    root.innerHTML = `
      <section class="screen ww-night ww-role-turn" style="--role: ${ROLES[role].color}">
        <div class="ww-turn-head">
          <span class="ww-turn-emoji" aria-hidden="true">${ROLES[role].emoji}</span>
          <h1 class="ww-turn-title">${title}</h1>
          <p class="ww-lede">${text}</p>
        </div>
        <div class="ww-content">${body}</div>
      </section>`;
    sound.wake(role);
  }

  function sleepAgain(role, done) {
    speak(`${ROLES[role].name === 'Werwolf' ? 'Die Werwölfe schlafen' : `${articleName(role)} schläft`} wieder ein.`);
    done();
  }

  function articleName(role) {
    return { seherin: 'Die Seherin', hexe: 'Die Hexe', amor: 'Amor', jaeger: 'Der Jäger' }[role] ?? ROLES[role].name;
  }

  function fakeStep(role, done) {
    speak(`${articleName(role)} erwacht.`);
    roleScreen(role, { title: `${ROLES[role].name} erwacht`, text: 'Augen zu lassen, wer nicht gemeint ist.' });
    const wait = FAKE_TURN_MS[0] + Math.random() * (FAKE_TURN_MS[1] - FAKE_TURN_MS[0]);
    ctx.timeout(() => {
      speak(`${articleName(role)} schläft wieder ein.`);
      done();
    }, wait);
  }

  // Auswahl von Personen: count = wie viele, onPick bekommt die Namen
  function chooser({ options, count = 1, confirm, allowNone = '', onPick }) {
    const box = $('.ww-content', root);
    box.innerHTML = `
      <div class="ww-pick" role="group">
        ${options.map((entry, index) => `<button class="ww-pick-btn" type="button" data-name="${esc(entry.name)}" aria-pressed="false" style="--i: ${index}">${esc(entry.name)}${entry.note ? ` <small>${esc(entry.note)}</small>` : ''}</button>`).join('')}
      </div>
      <button class="btn btn-primary" type="button" data-action="confirm" disabled>${confirm}</button>
      ${allowNone ? `<button class="btn-link" type="button" data-action="none">${allowNone}</button>` : ''}`;
    const picked = [];
    const confirmButton = $('[data-action="confirm"]', box);
    for (const button of box.querySelectorAll('[data-name]')) {
      button.addEventListener('click', () => {
        const name = button.dataset.name;
        const at = picked.indexOf(name);
        if (at >= 0) picked.splice(at, 1);
        else {
          if (picked.length >= count) {
            const dropped = picked.shift();
            box.querySelector(`[data-name="${CSS.escape(dropped)}"]`)?.setAttribute('aria-pressed', 'false');
          }
          picked.push(name);
        }
        button.setAttribute('aria-pressed', String(picked.includes(name)));
        confirmButton.disabled = picked.length !== count;
        // Nachts still: Eine tote Rolle tippt nichts, Geräusche würden verraten, wer noch lebt
        if (root.classList.contains('is-day')) sound.tap();
      });
    }
    confirmButton.addEventListener('click', () => onPick([...picked]), { once: true });
    $('[data-action="none"]', box)?.addEventListener('click', () => onPick([]), { once: true });
  }

  function amorStep(done) {
    speak('Amor erwacht und wählt zwei Menschen, die sich unsterblich ineinander verlieben.');
    roleScreen('amor', { title: 'Amor erwacht', text: 'Wähle zwei Menschen, die sich verlieben – du darfst dich selbst wählen.' });
    chooser({
      options: alive(),
      count: 2,
      confirm: '💘 Verlieben',
      onPick: (names) => {
        lovers = names;
        sound.love();
        $('.ww-content', root).innerHTML = `
          <p class="ww-lovers"><span>${esc(names[0])}</span><i aria-hidden="true">💘</i><span>${esc(names[1])}</span></p>
          <p class="ww-lede">Tippe den beiden jetzt leise auf die Schulter.</p>
          <button class="btn btn-primary" type="button" data-action="done">Erledigt – Augen zu</button>`;
        $('[data-action="done"]', root).addEventListener('click', () => sleepAgain('amor', done), { once: true });
      },
    });
  }

  function loversStep(done) {
    if (lovers.length !== 2) {
      done();
      return;
    }
    speak('Die Verliebten öffnen die Augen und erkennen einander.');
    root.innerHTML = `
      <section class="screen ww-night ww-center ww-role-turn" style="--role: ${ROLES.amor.color}">
        <span class="ww-turn-emoji" aria-hidden="true">💞</span>
        <h1 class="ww-turn-title">Die Verliebten erwachen</h1>
        <p class="ww-lovers"><span>${esc(lovers[0])}</span><i aria-hidden="true">💘</i><span>${esc(lovers[1])}</span></p>
        <p class="ww-lede">Stirbt einer von euch, stirbt der andere vor Kummer. Bleibt ihr als Letzte übrig, gewinnt ihr zusammen.</p>
      </section>`;
    sound.love();
    ctx.timeout(() => {
      speak('Die Verliebten schließen die Augen wieder.');
      done();
    }, LOVERS_MS);
  }

  function seerStep(done) {
    speak('Die Seherin erwacht und darf die wahre Gestalt eines Menschen sehen.');
    const seer = holders('seherin')[0];
    roleScreen('seherin', { title: 'Die Seherin erwacht', text: 'Wessen wahre Gestalt willst du sehen?' });
    chooser({
      options: alive().filter((entry) => entry !== seer),
      confirm: '🔮 In die Kugel schauen',
      onPick: ([name]) => {
        const target = person(name);
        $('.ww-content', root).innerHTML = `
          <div class="ww-vision">
            <span class="ww-orb" aria-hidden="true"></span>
            <p class="ww-lede"><b>${esc(name)}</b> ist …</p>
            ${roleCard(target.role, { big: true })}
          </div>
          <button class="btn btn-primary" type="button" data-action="done">Gesehen – Augen zu</button>`;
        $('[data-action="done"]', root).addEventListener('click', () => sleepAgain('seherin', done), { once: true });
      },
    });
  }

  function wolvesStep(done) {
    const pack = alive().filter((entry) => entry.role === 'werwolf');
    speak(night === 1 ? 'Die Werwölfe erwachen, erkennen einander und wählen gemeinsam ihr Opfer.' : 'Die Werwölfe erwachen und wählen ihr Opfer.');
    roleScreen('werwolf', {
      title: 'Die Werwölfe erwachen',
      text: `${pack.length > 1 ? `Ihr seid: ${pack.map((entry) => esc(entry.name)).join(', ')}. ` : ''}Einigt euch leise auf ein Opfer.`,
    });
    sound.howl();
    chooser({
      options: alive().filter((entry) => entry.role !== 'werwolf'),
      confirm: '🐺 Zuschlagen',
      onPick: ([name]) => {
        victim = name;
        vibrate([0, 60, 30, 60]);
        sound.bite();
        $('.ww-content', root).innerHTML = `
          <p class="ww-claw" aria-hidden="true"><i></i><i></i><i></i></p>
          <p class="ww-lede"><b>${esc(name)}</b> ist euer Opfer.</p>
          <button class="btn btn-primary" type="button" data-action="done">Augen zu</button>`;
        $('[data-action="done"]', root).addEventListener('click', () => sleepAgain('werwolf', done), { once: true });
      },
    });
  }

  function witchStep(done) {
    speak('Die Hexe erwacht. Sie sieht das Opfer der Nacht und darf ihre Tränke benutzen.');
    roleScreen('hexe', {
      title: 'Die Hexe erwacht',
      text: victim ? `Heute Nacht haben die Werwölfe <b>${esc(victim)}</b> angegriffen.` : 'Heute Nacht gab es kein Opfer.',
    });
    const menu = () => {
      const box = $('.ww-content', root);
      box.innerHTML = `
        <div class="ww-potions">
          <button class="ww-potion is-heal" type="button" data-action="heal" ${potions.heal && victim && !healed ? '' : 'disabled'}>
            <span aria-hidden="true">💚</span><b>Heiltrank</b><small>${potions.heal ? (healed ? 'benutzt' : `${victim ? `${esc(victim)} retten` : 'kein Opfer'}`) : 'schon verbraucht'}</small>
          </button>
          <button class="ww-potion is-poison" type="button" data-action="poison" ${potions.poison && !poisoned ? '' : 'disabled'}>
            <span aria-hidden="true">☠️</span><b>Gifttrank</b><small>${potions.poison ? 'jemanden vergiften' : (poisoned ? `${esc(poisoned)} vergiftet` : 'schon verbraucht')}</small>
          </button>
        </div>
        <button class="btn btn-primary" type="button" data-action="done">Fertig – Augen zu</button>`;
      $('[data-action="heal"]', box).addEventListener('click', () => {
        potions.heal = false;
        healed = true;
        fx.toast(`${victim} ist gerettet`);
        menu();
      });
      $('[data-action="poison"]', box).addEventListener('click', () => {
        chooser({
          options: alive().filter((entry) => entry.role !== 'hexe'),
          confirm: '☠️ Vergiften',
          allowNone: 'Doch nicht',
          onPick: ([name]) => {
            if (name) {
              potions.poison = false;
              poisoned = name;
            }
            menu();
          },
        });
      });
      $('[data-action="done"]', box).addEventListener('click', () => sleepAgain('hexe', done), { once: true });
    };
    menu();
  }

  // ---------- Morgen ----------

  // Tötet jemanden; stirbt ein Verliebter, folgt der andere. Gibt alle Toten in Reihenfolge zurück.
  function kill(name, cause) {
    const dead = [];
    const target = person(name);
    if (!target || !target.alive) return dead;
    target.alive = false;
    dead.push({ name, role: target.role, cause });
    if (lovers.includes(name)) {
      const partner = lovers.find((other) => other !== name);
      dead.push(...kill(partner, 'Kummer'));
    }
    return dead;
  }

  function sunrise() {
    const dead = [];
    if (victim && !healed) dead.push(...kill(victim, 'Werwölfe'));
    if (poisoned) dead.push(...kill(poisoned, 'Gift'));
    setSky('day');
    sound.morning();
    speak(dead.length ? 'Das Dorf erwacht. Doch nicht alle haben die Nacht überlebt.' : 'Das Dorf erwacht. Heute Nacht ist niemand gestorben.');
    root.innerHTML = `
      <section class="screen ww-day ww-center">
        <span class="ww-sun" aria-hidden="true"></span>
        <p class="eyebrow">Tag ${night}</p>
        <h1 class="ww-big">Das Dorf erwacht</h1>
      </section>`;
    ctx.timeout(() => announce(dead, (shown) => afterDeaths(showTalk, shown)), fx.reducedMotion() ? 0 : SUNRISE_MS);
  }

  // Verkündet die Toten nacheinander, jeweils mit aufgedeckter Rolle
  function announce(dead, done) {
    root.innerHTML = `
      <section class="screen ww-day">
        <p class="eyebrow">Tag ${night}</p>
        <h1 class="ww-big">${dead.length ? (dead.length === 1 ? 'Ein Opfer' : `${dead.length} Opfer`) : 'Alle leben noch'}</h1>
        ${dead.length ? `
          <ul class="ww-graves">
            ${dead.map((entry, index) => `
              <li style="--i: ${index}; --role: ${ROLES[entry.role].color}">
                <span class="ww-grave" aria-hidden="true">🪦</span>
                <span class="ww-grave-text"><b>${esc(entry.name)}</b><small>${causeText(entry.cause)}</small></span>
                <span class="ww-grave-role">${ROLES[entry.role].emoji} ${ROLES[entry.role].name}</span>
              </li>`).join('')}
          </ul>` : '<p class="ww-lede ww-relief">Kein Blut, kein Heulen – das Dorf atmet auf. 🌤️</p>'}
        <button class="btn btn-primary" type="button" data-action="go">Weiter</button>
      </section>`;
    if (dead.length) {
      dead.forEach((_, index) => ctx.timeout(() => sound.bell(), index * 700));
      vibrate([0, 80, 60, 80]);
      speak(dead.map((entry) => `${entry.name} ist tot. ${entry.name} war ${entry.role === 'werwolf' ? 'ein Werwolf' : ROLES[entry.role].name}.`).join(' '));
    }
    $('[data-action="go"]', root).addEventListener('click', () => done(dead), { once: true });
  }

  function causeText(cause) {
    return { Werwölfe: 'von Werwölfen zerfleischt', Gift: 'vergiftet', Kummer: 'aus Liebeskummer gestorben', Dorf: 'vom Dorf verurteilt', Jäger: 'vom Jäger erschossen' }[cause] ?? cause;
  }

  // Nach Todesfällen: Jäger schießen noch, dann wird geprüft, ob jemand gewonnen hat
  function afterDeaths(next, dead = []) {
    const hunter = dead.find((entry) => entry.role === 'jaeger');
    if (hunter) {
      hunterShot(hunter.name, (more) => {
        const rest = dead.filter((entry) => entry !== hunter);
        announce(more, (shown) => afterDeaths(next, [...rest, ...shown]));
      });
      return;
    }
    const winner = checkWinner();
    if (winner) showEnd(winner);
    else next();
  }

  function hunterShot(name, done) {
    speak(`${name} war der Jäger und nimmt mit dem letzten Schuss noch jemanden mit.`);
    root.innerHTML = `
      <section class="screen ww-day ww-role-turn" style="--role: ${ROLES.jaeger.color}">
        <div class="ww-turn-head">
          <span class="ww-turn-emoji" aria-hidden="true">🏹</span>
          <h1 class="ww-turn-title">Der letzte Schuss</h1>
          <p class="ww-lede"><b>${esc(name)}</b> war Jäger und nimmt noch jemanden mit.</p>
        </div>
        <div class="ww-content"></div>
      </section>`;
    chooser({
      options: alive(),
      confirm: '🏹 Schießen',
      onPick: ([target]) => {
        sound.shot();
        fx.flash('#ffffff');
        fx.shake();
        done(kill(target, 'Jäger'));
      },
    });
  }

  function checkWinner() {
    const living = alive();
    if (lovers.length === 2 && living.length === 2 && lovers.every((name) => person(name).alive)) return 'lovers';
    const pack = living.filter((entry) => entry.role === 'werwolf').length;
    if (pack === 0) return 'village';
    if (pack >= living.length - pack) return 'wolves';
    return null;
  }

  // ---------- Tag: Diskussion und Abstimmung ----------

  function showTalk() {
    const minutes = talk === 'ohne' ? 0 : Number(talk);
    root.innerHTML = `
      <section class="screen ww-day">
        <p class="eyebrow">Tag ${night} · ${alive().length} leben noch</p>
        <h1 class="ww-big">Wer ist der Werwolf?</h1>
        <p class="ww-lede">Diskutiert! Wer verdächtig ist, wird gleich vom Dorf verurteilt.</p>
        ${minutes ? `
          <div class="ww-clock" style="--ms: ${minutes * 60000}ms">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ww-clock-back" cx="60" cy="60" r="52"/><circle class="ww-clock-ring" cx="60" cy="60" r="52" pathLength="100"/></svg>
            <span class="ww-clock-time" role="timer">${minutes}:00</span>
          </div>` : ''}
        <ul class="ww-alive">${alive().map((entry, index) => `<li style="--i: ${index}">${esc(entry.name)}</li>`).join('')}</ul>
        <button class="btn btn-primary" type="button" data-action="vote">Zur Abstimmung</button>
        <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
      </section>`;
    speak('Diskutiert, wer von euch ein Werwolf sein könnte.');

    if (minutes) {
      const label = $('.ww-clock-time', root);
      const clock = $('.ww-clock', root);
      clock.classList.add('is-running');
      let left = minutes * 60;
      const id = ctx.interval(() => {
        left -= 1;
        label.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        if (left <= 10 && left > 0) {
          clock.classList.add('is-urgent');
          sound.tick();
        }
        if (left <= 0) {
          ctx.clearInterval(id);
          sound.gong();
          vibrate([0, 200, 100, 200]);
          speak('Die Zeit ist um. Stimmt ab.');
          label.textContent = 'Zeit!';
        }
      }, 1000);
    }
    $('[data-action="vote"]', root).addEventListener('click', showVote);
    $('[data-action="end"]', root).addEventListener('click', () => showEnd(null));
  }

  function showVote() {
    root.innerHTML = `
      <section class="screen ww-day ww-role-turn" style="--role: #d9a441">
        <div class="ww-turn-head">
          <span class="ww-turn-emoji" aria-hidden="true">⚖️</span>
          <h1 class="ww-turn-title">Das Dorf stimmt ab</h1>
          <p class="ww-lede">Zeigt alle gleichzeitig auf euren Verdacht. Wen trifft es?</p>
        </div>
        <div class="ww-content"></div>
      </section>`;
    sound.drum();
    chooser({
      options: alive(),
      confirm: '⚖️ Verurteilen',
      allowNone: 'Niemand wird verurteilt',
      onPick: ([name]) => {
        if (!name) {
          speak('Das Dorf ist sich nicht einig. Niemand wird verurteilt.');
          showNightIntro();
          return;
        }
        const dead = kill(name, 'Dorf');
        sound.verdict();
        fx.shake();
        announce(dead, () => afterDeaths(showNightIntro, dead));
      },
    });
  }

  // ---------- Spielende ----------

  function showEnd(winner) {
    window.speechSynthesis?.cancel();
    setSky(winner === 'wolves' ? 'night' : 'day');
    const result = winner ? WINNERS[winner] : { emoji: '🌘', title: 'Spiel beendet', text: 'So sah das Dorf wirklich aus:' };
    if (winner) speak(result.title);
    if (winner === 'wolves') sound.howl();
    else if (winner) {
      sound.win();
      fx.burst({ colors: winner === 'lovers' ? ['#ff6fae', '#ffd1e6', '#ffffff'] : ['#ffc65c', '#7bd88f', '#ffffff'] });
    }

    root.innerHTML = `
      <section class="screen ww-end ww-center" data-leave-free>
        <span class="ww-end-emoji" aria-hidden="true">${result.emoji}</span>
        <h1 class="ww-big" aria-label="${esc(result.title)}">${splitLetters(result.title, { prefix: 'ww' })}</h1>
        <p class="ww-lede">${result.text}</p>
        <ul class="ww-reveal-list">
          ${cast.map((entry, index) => `
            <li class="${entry.alive ? '' : 'is-dead'}" style="--i: ${index}; --role: ${ROLES[entry.role].color}">
              <span class="ww-reveal-emoji" aria-hidden="true">${ROLES[entry.role].emoji}</span>
              <b>${esc(entry.name)}${lovers.includes(entry.name) ? ' 💘' : ''}</b>
              <small>${ROLES[entry.role].name}${entry.alive ? '' : ' · †'}</small>
            </li>`).join('')}
        </ul>
        <button class="btn btn-primary" type="button" data-action="again">Neue Runde</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}

// Deutsche Stimmen des Geräts, die natürlichsten zuerst (Premium/Erweitert/neuronale Stimmen)
function germanVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices()
    .filter((voice) => voice.lang?.toLowerCase().startsWith('de'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

function voiceScore(voice) {
  let score = 0;
  if (/premium|neural|natural|online/i.test(voice.name)) score += 4;
  if (/enhanced|erweitert|google|siri/i.test(voice.name)) score += 3;
  if (voice.lang === 'de-DE') score += 1;
  return score;
}

// „Eddy (Deutsch (Deutschland))“ → „Eddy“, Österreich und Schweiz bekommen einen Zusatz
function voiceLabel(voice) {
  const name = voice.name.replace(/\s*\(.*\)\s*$/, '');
  const region = { 'de-AT': 'Österreich', 'de-CH': 'Schweiz' }[voice.lang];
  return region ? `${name} · ${region}` : name;
}

// Nachtklänge: Eule, Heulen, Glocke – alles aus Tönen und Rauschen.
// Nachts gibt es nur Klänge, die bei jeder Rolle gleich ablaufen (auch wenn sie schon tot ist).
function createSounds(audio) {
  const chord = (notes, { type = 'triangle', volume = 0.12, gap = 0.08, duration = 0.3 } = {}) => {
    notes.forEach((freq, index) => audio.tone({ freq, duration, type, volume, delay: index * gap }));
  };
  return {
    tap: () => audio.tone({ freq: 880, duration: 0.04, type: 'sine', volume: 0.06 }),
    cover: () => audio.noise({ duration: 0.12, volume: 0.1, cutoff: 2500 }),
    night: () => {
      // Eule: „Hu – huu“
      audio.tone({ freq: 440, slideTo: 400, duration: 0.25, type: 'sine', volume: 0.14 });
      audio.tone({ freq: 430, slideTo: 380, duration: 0.6, type: 'sine', volume: 0.14, delay: 0.35 });
    },
    wake: (role) => {
      const notes = { seherin: [784, 988, 1175], hexe: [392, 466, 554], amor: [659, 784, 988, 1319], werwolf: [147, 156], jaeger: [330, 440] }[role] ?? [440];
      chord(notes, { type: role === 'werwolf' ? 'sawtooth' : 'sine', volume: role === 'werwolf' ? 0.06 : 0.08, gap: 0.12, duration: 0.45 });
    },
    howl: () => {
      audio.tone({ freq: 260, slideTo: 560, duration: 0.8, type: 'sine', volume: 0.16 });
      audio.tone({ freq: 560, slideTo: 420, duration: 1.4, type: 'sine', volume: 0.14, delay: 0.75 });
      audio.tone({ freq: 270, slideTo: 540, duration: 0.8, type: 'triangle', volume: 0.05, delay: 0.05 });
    },
    bite: () => {
      audio.noise({ duration: 0.18, volume: 0.35, cutoff: 1800 });
      audio.tone({ freq: 110, slideTo: 55, duration: 0.3, type: 'square', volume: 0.12 });
    },
    love: () => chord([659, 784, 988, 1319], { type: 'sine', volume: 0.08, gap: 0.1, duration: 0.5 }),
    morning: () => {
      chord([523, 659, 784, 1047], { volume: 0.12, gap: 0.12, duration: 0.5 });
      for (let i = 0; i < 4; i++) audio.tone({ freq: 2400 + i * 200, slideTo: 3000, duration: 0.06, type: 'sine', volume: 0.04, delay: 0.7 + i * 0.12 });
    },
    bell: () => {
      audio.tone({ freq: 110, duration: 2.2, type: 'sine', volume: 0.3 });
      audio.tone({ freq: 220, duration: 1.6, type: 'sine', volume: 0.12 });
      audio.tone({ freq: 331, duration: 1, type: 'sine', volume: 0.05 });
    },
    shot: () => {
      audio.noise({ duration: 0.4, volume: 0.6, cutoff: 3000 });
      audio.tone({ freq: 120, slideTo: 40, duration: 0.4, type: 'sine', volume: 0.4 });
    },
    drum: () => {
      for (let i = 0; i < 10; i++) audio.noise({ duration: 0.05, volume: 0.1 + i * 0.02, cutoff: 600, delay: i * 0.08 });
    },
    verdict: () => {
      audio.noise({ duration: 0.15, volume: 0.4, cutoff: 900 });
      audio.tone({ freq: 98, duration: 0.8, type: 'triangle', volume: 0.25 });
    },
    tick: () => audio.tone({ freq: 1320, duration: 0.04, type: 'square', volume: 0.06 }),
    gong: () => {
      audio.tone({ freq: 196, duration: 1.8, type: 'sine', volume: 0.25 });
      audio.tone({ freq: 294, duration: 1.2, type: 'sine', volume: 0.1 });
    },
    win: () => chord([523, 659, 784, 1047, 1319], { volume: 0.13, gap: 0.1, duration: 0.4 }),
  };
}
