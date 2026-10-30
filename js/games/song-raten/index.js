import { $, esc } from '../../core/dom.js';
import { shuffle } from '../../core/random.js';
import { bindPlayerEditor, bindSegmented, bindToggleList, playerEditor, rankingList, segmented, setupScreen, toggleList } from '../../core/ui.js';
import { findPreview } from './itunes.js';
import categories from './songs.js';

const CLIP_LENGTHS = ['5', '10', '20']; // Sekunden, als Text für den Segment-Schalter
const DEFAULT_CLIP = '10';
const DEFAULT_CATEGORIES = ['2000er', '2010er', 'aktuell'];
const EXTEND_BY = 5;
const PREVIEW_FALLBACK = 30; // Länge der Apple-Hörproben, solange die echte Dauer noch nicht geladen ist

// So viele Songs werden nacheinander probiert, bevor das Spiel aufgibt (z. B. ohne Internet).
const MAX_LOOKUPS = 6;

const RING_LENGTH = 2 * Math.PI * 114;

// Equalizer unter der Platte und aufsteigende Noten, solange ein Ausschnitt läuft
const EQ_BARS = 21;
const NOTE_EVERY_MS = 380;
const NOTES = ['♪', '♫', '♬', '♩'];

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="27" fill="#17141f"/>
    <circle cx="32" cy="32" r="21" fill="none" stroke="#2f2a3d" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="16" fill="none" stroke="#2f2a3d" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="10" fill="currentColor"/>
    <circle cx="32" cy="32" r="2.2" fill="#17141f"/>
    <path d="M45 13a22 22 0 0 1 7 11" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".28"/>
  </svg>`;

// Startbild: Schallplatte dreht sich unter dem Tonarm, Noten steigen auf
const HERO = `
  <div class="sr-hero" aria-hidden="true">
    <span class="sr-hero-glow"></span>
    <svg class="sr-hero-disc" viewBox="0 0 120 120">
      <circle class="sr-hero-vinyl" cx="60" cy="60" r="58"/>
      <circle class="sr-hero-groove" cx="60" cy="60" r="50"/>
      <circle class="sr-hero-groove" cx="60" cy="60" r="42"/>
      <circle class="sr-hero-groove" cx="60" cy="60" r="34"/>
      <circle class="sr-hero-label" cx="60" cy="60" r="20"/>
      <path class="sr-hero-label-2" d="M40 60a20 20 0 0 1 40 0Z"/>
      <circle cx="60" cy="60" r="3.5" fill="#fff"/>
    </svg>
    <span class="sr-hero-shine"></span>
    <svg class="sr-hero-arm" viewBox="0 0 50 110">
      <circle cx="38" cy="12" r="9" class="sr-hero-arm-base"/>
      <path d="M38 12 34 78 18 98" class="sr-hero-arm-rod"/>
      <rect x="8" y="92" width="18" height="12" rx="3" transform="rotate(-38 17 98)" class="sr-hero-arm-head"/>
    </svg>
    ${['♪', '♫', '♪', '♬'].map((note, i) => `<span class="sr-hero-note" style="--i: ${i}">${note}</span>`).join('')}
  </div>`;

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5Z" fill="currentColor"/></svg>';
const ICON_STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/></svg>';

export default {
  id: 'song-raten',
  title: 'Song-Raten',
  tagline: 'Ein paar Sekunden Hörprobe – wer erkennt den Song zuerst?',
  tags: ['ab 2 Spielern', 'Internet nötig'],
  accent: '#8b5cf6',
  icon: ICON,
  styles: new URL('./song-raten.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;

  let selected = loadSelection();
  let clip = CLIP_LENGTHS.includes(storage.get('clip')) ? storage.get('clip') : DEFAULT_CLIP;
  let players = ctx.players.get();
  let scores = new Map();
  let deck = [];
  let round = 0;
  let revealed = 0;     // aufgelöste Songs – für die Endwertung
  let current = null;   // aktueller Song; die Hörprobe steckt in current.media
  let upcoming = null;  // Promise auf den bereits vorgeladenen nächsten Song
  let playback = null;  // { stopLoop, abort } während ein Ausschnitt läuft
  let noteTimer = null;
  let alive = true;

  ctx.onCleanup(() => {
    alive = false;
    stopClip();
    current?.media.removeAttribute('src');
  });

  showSetup();

  function loadSelection() {
    const stored = storage.get('categories');
    const valid = Array.isArray(stored) ? stored.filter((key) => key in categories) : [];
    return valid.length ? valid : DEFAULT_CATEGORIES;
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    stopClip();
    const categoryOptions = Object.entries(categories).map(([value, category]) => ({
      value,
      label: category.label,
      hint: `${category.hint} · ${category.songs.length} Songs`,
    }));
    const clipOptions = CLIP_LENGTHS.map((value) => ({ value, label: `${value} Sek.` }));

    root.innerHTML = setupScreen({
      hero: `
        <div class="sr-intro">
          ${HERO}
          <h1 class="sr-title-big">Song<br><span>raten</span></h1>
          <p class="sr-lede">Kurzer Ausschnitt – wer zuerst Titel oder Interpret ruft, gewinnt.</p>
        </div>`,
      cards: [
        {
          icon: '🎵',
          title: 'Kategorien',
          count: 'categories',
          body: toggleList({ name: 'categories', label: 'Kategorien wählen', options: categoryOptions, values: selected }),
        },
        {
          icon: '⏱️',
          title: 'Ausschnitt',
          body: segmented({ name: 'clip', label: 'Länge des Ausschnitts', options: clipOptions, value: clip }),
          note: 'Mit „+5 Sekunden“ lässt sich jeder Song während der Runde verlängern.',
        },
        {
          icon: '👥',
          title: 'Mitspieler',
          optional: true,
          body: playerEditor({ name: 'players' }),
          note: 'Mit Namen zählt das Spiel Punkte. Ohne Namen wird einfach nur geraten.',
        },
      ],
      start: `<button class="btn btn-primary" type="button" data-action="start">Los geht's</button>`,
      startNote: 'Braucht Internet – die Hörproben kommen von Apple Music.',
    });

    bindToggleList(root, 'categories', (values) => {
      selected = values;
      storage.set('categories', values);
    });
    bindSegmented(root, 'clip', (value) => {
      clip = value;
      storage.set('clip', value);
    });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => { players = list; },
    });
    $('[data-action="start"]', root).addEventListener('click', startGame);
  }

  function startGame() {
    audio.unlock();
    scores = new Map(players.map((player) => [player, 0]));
    deck = [];
    round = 0;
    revealed = 0;
    upcoming = null;
    nextRound();
  }

  // ---------- Songs ziehen ----------

  function refillDeck() {
    const seen = new Set();
    const pool = [];
    for (const key of selected) {
      for (const [artist, title] of categories[key].songs) {
        const id = `${artist}|${title}`.toLowerCase();
        if (seen.has(id)) continue;
        seen.add(id);
        pool.push({ artist, title, category: key });
      }
    }
    deck = shuffle(pool);
  }

  // Sucht für den nächsten Song eine Hörprobe; Songs ohne Treffer werden übersprungen.
  async function resolveNext() {
    let networkError = null;
    for (let attempt = 0; attempt < MAX_LOOKUPS; attempt += 1) {
      if (!deck.length) refillDeck();
      const entry = deck.pop();
      try {
        const found = await findPreview(entry.artist, entry.title);
        if (!found) continue;
        const media = new Audio();
        media.preload = 'auto';
        media.src = found.preview;
        return { ...entry, ...found, media, extra: 0, offset: Math.random() * 10 };
      } catch (error) {
        networkError = error;
      }
    }
    if (networkError) throw networkError;
    return null;
  }

  async function nextRound() {
    stopClip();
    current?.media.removeAttribute('src');
    current = null;
    renderLoading();

    let song = null;
    let failure = null;
    try {
      song = await (upcoming ?? resolveNext());
    } catch (error) {
      failure = error;
    }
    upcoming = null;
    if (!alive) return;
    if (!song) {
      renderError(failure);
      return;
    }

    current = song;
    round += 1;
    renderGuess();
    upcoming = resolveNext().catch(() => null); // nächsten Song schon im Hintergrund vorbereiten
  }

  // ---------- Abspielen ----------

  // Länger als die Hörprobe selbst kann ein Ausschnitt nicht werden.
  function maxLength(song) {
    const duration = song.media.duration;
    return Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : PREVIEW_FALLBACK;
  }

  function clipLength(song) {
    return Math.min(Number(clip) + song.extra, maxLength(song));
  }

  // Spielt ab `from` Sekunden für `seconds` Sekunden. Ohne Angaben: Ausschnitt der Runde.
  function playClip({ seconds = clipLength(current), from = current.offset } = {}) {
    const song = current;
    const element = song.media;
    stopClip();

    const abort = new AbortController();
    const options = { once: true, signal: abort.signal };
    let stopLoop = null;
    playback = { abort, stop: () => stopLoop?.() };

    const seekTo = () => {
      const latest = Math.max(0, (element.duration || 30) - seconds - 0.3);
      element.currentTime = Math.min(from, latest);
    };

    // Erst stumm starten (wegen iPhone muss play() direkt beim Tippen passieren), dann an die Stelle springen.
    element.muted = true;
    if (element.readyState >= 1) seekTo();
    else element.addEventListener('loadedmetadata', seekTo, options);
    element.addEventListener('seeked', () => { element.muted = false; }, options);
    element.addEventListener('playing', () => {
      if (element.readyState >= 1 && !element.seeking) element.muted = false;
      const end = performance.now() + seconds * 1000;
      setPlaying(true);
      stopLoop = ctx.loop((now) => {
        const progress = 1 - Math.max(0, end - now) / (seconds * 1000);
        setProgress(progress);
        if (now >= end || element.ended) {
          stopClip();
          return false;
        }
      });
    }, options);

    element.play().catch((error) => {
      stopClip();
      fx.toast(`Abspielen nicht möglich – Internet prüfen. (${error?.name ?? 'Fehler'})`);
    });
  }

  function stopClip() {
    if (!playback) return;
    playback.abort.abort();
    playback.stop();
    playback = null;
    current?.media.pause();
    setPlaying(false);
  }

  function setPlaying(playing) {
    root.querySelector('.sr-round')?.classList.toggle('is-playing', playing);
    if (noteTimer !== null) {
      ctx.clearInterval(noteTimer);
      noteTimer = null;
    }
    if (playing && !fx.reducedMotion()) noteTimer = ctx.interval(spawnNote, NOTE_EVERY_MS);
    const label = root.querySelector('.sr-label');
    if (label) label.innerHTML = playing ? ICON_STOP : ICON_PLAY;
    const hint = root.querySelector('.sr-hint');
    if (hint && root.querySelector('.is-revealed')) hint.textContent = playing ? 'Läuft – Platte antippen zum Stoppen' : 'Platte antippen für die ganze Hörprobe';
    else if (hint) hint.textContent = playing ? 'Läuft … wer weiß es?' : 'Tippen zum Abspielen';
    if (!playing) setProgress(0);
  }

  // Eine Note steigt aus der Platte auf und verweht
  function spawnNote() {
    const record = root.querySelector('.sr-record');
    const stage = record?.parentElement;
    if (!stage) return;
    const note = document.createElement('span');
    note.className = 'sr-note';
    note.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];
    note.style.left = `${record.offsetLeft + record.offsetWidth * (0.2 + Math.random() * 0.6)}px`;
    note.style.top = `${record.offsetTop + record.offsetHeight * 0.35}px`;
    note.style.fontSize = `${20 + Math.random() * 16}px`;
    stage.append(note);
    const drift = (Math.random() * 2 - 1) * 60;
    note.animate(
      [
        { transform: 'translate(-50%, 0) scale(.4) rotate(0deg)', opacity: 0 },
        { transform: `translate(calc(-50% + ${drift * 0.3}px), -40px) scale(1) rotate(${drift * 0.2}deg)`, opacity: 0.9, offset: 0.25 },
        { transform: `translate(calc(-50% + ${drift}px), -170px) scale(.8) rotate(${drift * 0.5}deg)`, opacity: 0 },
      ],
      { duration: 1800 + Math.random() * 600, easing: 'ease-out' },
    ).onfinish = () => note.remove();
  }

  function equalizer() {
    const bars = Array.from({ length: EQ_BARS }, (_, i) => {
      const peak = (0.35 + Math.random() * 0.65).toFixed(2);
      const speed = (0.32 + Math.random() * 0.4).toFixed(2);
      return `<i style="--i: ${i}; --peak: ${peak}; --speed: ${speed}s"></i>`;
    }).join('');
    return `<div class="sr-eq" aria-hidden="true">${bars}</div>`;
  }

  function setProgress(progress) {
    const ring = root.querySelector('.sr-ring-progress');
    if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - progress));
  }

  // ---------- Bildschirme ----------

  function scoreboard() {
    if (!players.length) return '';
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    return `<ul class="chips sr-scores">${ranked.map(([name, points]) => `<li class="chip">${esc(name)} · ${points}</li>`).join('')}</ul>`;
  }

  function header() {
    return `
      <div class="sr-head">
        <p class="eyebrow">Song ${round} · ${categories[current.category].label}</p>
        ${scoreboard()}
      </div>`;
  }

  function record(content) {
    return `
      <button class="sr-record" type="button" data-action="play" aria-label="Ausschnitt abspielen oder stoppen">
        <svg class="sr-ring" viewBox="0 0 240 240" aria-hidden="true">
          <circle class="sr-ring-track" cx="120" cy="120" r="114"/>
          <circle class="sr-ring-progress" cx="120" cy="120" r="114" style="stroke-dasharray: ${RING_LENGTH}; stroke-dashoffset: ${RING_LENGTH}"/>
        </svg>
        <span class="sr-disc">${content}</span>
        <svg class="sr-arm" viewBox="0 0 60 160" aria-hidden="true">
          <circle cx="34" cy="20" r="15" class="sr-arm-base"/>
          <circle cx="34" cy="20" r="6" class="sr-arm-pin"/>
          <path d="M34 20 L36 112 Q36 126 26 136" class="sr-arm-rod"/>
          <rect x="15" y="130" width="18" height="24" rx="4" transform="rotate(28 24 142)" class="sr-arm-head"/>
        </svg>
      </button>`;
  }

  function renderLoading() {
    root.innerHTML = `
      <section class="screen sr-round sr-loading">
        <div class="sr-stage">
          ${record('<span class="sr-label sr-label-loading"></span>')}
          <p class="sr-hint sr-searching">Nächster Song wird gesucht</p>
        </div>
      </section>`;
  }

  function renderError(failure) {
    const details = failure?.message ? `<p class="sr-small">Details: ${esc(failure.message)}</p>` : '';
    root.innerHTML = `
      <section class="screen sr-message">
        <p class="sr-message-title">Keine Hörprobe gefunden</p>
        <p class="sr-small">Die Songs kommen von Apple Music – das klappt nur mit Internet. Prüf die Verbindung und versuch es nochmal.</p>
        ${details}
        <button class="btn btn-primary" type="button" data-action="retry">Nochmal versuchen</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="retry"]', root).addEventListener('click', nextRound);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }

  function renderGuess() {
    root.innerHTML = `
      <section class="screen sr-round">
        ${header()}
        <div class="sr-stage">
          ${record(`<span class="sr-label">${ICON_PLAY}</span>`)}
          ${equalizer()}
          <p class="sr-hint">Tippen zum Abspielen</p>
        </div>
        <div class="sr-actions">
          <button class="btn btn-ghost" type="button" data-action="extend"></button>
          <button class="btn btn-primary" type="button" data-action="reveal">Auflösen</button>
        </div>
        <div class="sr-links">
          <button class="btn-link" type="button" data-action="skip">Song überspringen</button>
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    $('[data-action="play"]', root).addEventListener('click', () => {
      if (playback) stopClip();
      else playClip();
    });
    const extend = $('[data-action="extend"]', root);
    const song = current;
    const updateExtend = () => {
      const length = clipLength(song);
      const atMax = length >= maxLength(song);
      extend.disabled = atMax;
      extend.innerHTML = atMax
        ? `Ganze Hörprobe <span class="sr-length">(${length} s)</span>`
        : `+${EXTEND_BY} Sekunden <span class="sr-length">(jetzt ${length} s)</span>`;
    };
    updateExtend();
    // Die echte Länge der Hörprobe steht erst fest, wenn ihre Metadaten geladen sind.
    if (song.media.readyState < 1) ctx.listen(song.media, 'loadedmetadata', updateExtend, { once: true });
    extend.addEventListener('click', () => {
      if (clipLength(song) >= maxLength(song)) return;
      song.extra = Math.min(song.extra + EXTEND_BY, maxLength(song) - Number(clip));
      updateExtend();
      playClip();
    });
    $('[data-action="reveal"]', root).addEventListener('click', renderReveal);
    $('[data-action="skip"]', root).addEventListener('click', nextRound);
    $('[data-action="end"]', root).addEventListener('click', showEnd);
  }

  function renderReveal() {
    stopClip();
    revealed += 1;
    audio.sounds.success();
    vibrate(20);
    const song = current;
    const cover = song.cover
      ? `<img class="sr-cover" src="${esc(song.cover)}" alt="Cover von ${esc(song.title)}" referrerpolicy="no-referrer">`
      : '';
    const award = players.length
      ? `<div class="sr-award">
           <p class="eyebrow">Wer hatte es zuerst?</p>
           <div class="sr-award-buttons">
             ${players.map((name, index) => `<button class="sr-award-btn" type="button" data-player="${index}">${esc(name)}</button>`).join('')}
             <button class="sr-award-btn sr-award-none" type="button" data-player="-1">Keiner</button>
           </div>
         </div>`
      : '<button class="btn btn-primary" type="button" data-action="next">Nächster Song</button>';

    root.innerHTML = `
      <section class="screen sr-round is-revealed">
        ${header()}
        <div class="sr-reveal">
          ${record(cover || `<span class="sr-label">${ICON_PLAY}</span>`)}
          ${equalizer()}
          <div class="sr-answer">
            <p class="sr-answer-title">${words(song.title, 0)}</p>
            <p class="sr-answer-artist">${words(`${song.artist}${song.year ? ` · ${song.year}` : ''}`, song.title.split(' ').length)}</p>
          </div>
          <p class="sr-hint">Läuft – Platte antippen zum Stoppen</p>
        </div>
        ${award}
        <div class="sr-links">
          ${song.link ? `<a class="btn-link" href="${esc(song.link)}" target="_blank" rel="noopener">Hörprobe: Apple Music</a>` : ''}
          <button class="btn-link" type="button" data-action="end">Spiel beenden</button>
        </div>
      </section>`;

    // Platte dreht kurz schnell an, dann taucht das Cover auf – mit kleinem Konfetti
    if (!fx.reducedMotion()) {
      $('.sr-disc', root).animate(
        [{ transform: 'rotate(-540deg) scale(.7)', filter: 'blur(6px) brightness(.4)' }, { transform: 'rotate(0) scale(1.06)', filter: 'blur(0) brightness(1)', offset: 0.8 }, { transform: 'none' }],
        { duration: 750, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
      ctx.timeout(() => {
        const box = $('.sr-record', root)?.getBoundingClientRect();
        if (!box) return;
        const styles = getComputedStyle(root);
        fx.burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, count: 40, colors: ['--accent', '--accent-2', '--text'].map((token) => styles.getPropertyValue(token).trim()) });
      }, 520);
    }

    // Ganze Hörprobe von vorn – startet direkt mit dem Tippen auf „Auflösen“ (zählt am iPhone als Berührung)
    const playFull = () => playClip({ seconds: song.media.duration || 30, from: 0 });
    $('[data-action="play"]', root).addEventListener('click', () => {
      if (playback) stopClip();
      else playFull();
    });
    playFull();
    $('[data-action="next"]', root)?.addEventListener('click', nextRound);
    for (const button of root.querySelectorAll('[data-player]')) {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.player);
        if (index >= 0) {
          const name = players[index];
          scores.set(name, (scores.get(name) ?? 0) + 1);
          fx.toast(`+1 Punkt für ${name}`);
          if (!fx.reducedMotion()) {
            plusOne(button);
            ctx.timeout(nextRound, 650);
            for (const other of root.querySelectorAll('[data-player]')) other.disabled = true;
            return;
          }
        }
        nextRound();
      });
    }
    $('[data-action="end"]', root).addEventListener('click', showEnd);
  }

  // Titel/Interpret Wort für Wort einblenden; start = Versatz, damit die zweite Zeile nach der ersten kommt
  function words(text, start) {
    return text.split(' ').map((word, i) => `<span class="sr-word" style="--i: ${start + i}">${esc(word)}</span>`).join(' ');
  }

  // „+1“ fliegt vom Namen nach oben, mit Konfetti-Spritzer
  function plusOne(button) {
    const box = button.getBoundingClientRect();
    const styles = getComputedStyle(root);
    fx.burst({ x: box.left + box.width / 2, y: box.top + box.height / 2, count: 28, colors: ['--accent', '--accent-2'].map((token) => styles.getPropertyValue(token).trim()) });
    audio.tone({ freq: 880, slideTo: 1320, duration: 0.18, type: 'triangle', volume: 0.14 });
    button.classList.add('is-picked');
    const label = document.createElement('span');
    label.className = 'sr-plus';
    label.textContent = '+1';
    button.append(label);
    label.animate(
      [{ transform: 'translate(-50%, 0) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -26px) scale(1.3)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%, -70px) scale(1)', opacity: 0 }],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    );
  }

  function showEnd() {
    stopClip();
    if (!players.length) {
      showSetup();
      return;
    }
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0]?.[1] ?? 0;
    const winners = ranked.filter(([, points]) => points === best && best > 0).map(([name]) => name);
    if (winners.length) {
      audio.sounds.success();
      const styles = getComputedStyle(root);
      fx.burst({ colors: ['--accent', '--accent-2', '--text'].map((name) => styles.getPropertyValue(name).trim()) });
    }

    root.innerHTML = `
      <section class="screen sr-message" data-leave-free>
        <p class="eyebrow">${revealed} ${revealed === 1 ? 'Song' : 'Songs'} gespielt</p>
        <p class="sr-message-title">${winners.length ? `${winners.map(esc).join(' & ')} ${winners.length > 1 ? 'gewinnen' : 'gewinnt'}!` : 'Unentschieden'}</p>
        ${rankingList(ranked.map(([name, value]) => ({ name, value })))}
        <button class="btn btn-primary" type="button" data-action="again">Neues Spiel</button>
        <button class="btn-link" type="button" data-action="setup">Einstellungen</button>
      </section>`;
    $('[data-action="again"]', root).addEventListener('click', startGame);
    $('[data-action="setup"]', root).addEventListener('click', showSetup);
  }
}
