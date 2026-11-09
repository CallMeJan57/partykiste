import { $, esc } from '../../core/dom.js';
import { PARTY_GAMES, clearParty, getParty, saveParty } from '../../core/party.js';
import { shuffle } from '../../core/random.js';
import { getTeams, teamLabel } from '../../core/teams.js';
import { bindPlayerEditor, bindSegmented, bindTeamEditor, bindToggleList, playerEditor, segmented, setupRow, setupScreen, splitLetters, teamEditor, toggleList } from '../../core/ui.js';
import { games } from '../index.js';

// Partyabend: mehrere Spiele hintereinander, die Teams sammeln Platzpunkte (core/party.js) in einer Gesamtwertung.
// Ganz optional – kein Eintrag in der Spieleliste, sondern ein Knopf auf der Startseite unter den Teams.

const DEFAULT_GAMES = ['tabu', 'stirnraten', 'schaetzen'];
const ORDERS = [
  { value: 'mix', label: '🎲 Zufällig' },
  { value: 'list', label: '📋 Wie gewählt' },
];
const REVEAL_DELAY_MS = 1100;   // erst die Platzierung des Spiels, dann rutscht die Gesamtwertung um
const PODIUM_STEP_MS = 650;     // Platz 3, 2, 1 nacheinander

const ICON = `
  <svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="#2b1748"/>
    <path d="M20 16h24v8a12 12 0 0 1-24 0Z" fill="#ffd34d"/>
    <path d="M20 19h-6a6 6 0 0 0 7 8M44 19h6a6 6 0 0 1-7 8" fill="none" stroke="#ffd34d" stroke-width="3"/>
    <rect x="29" y="36" width="6" height="8" fill="#e0a52a"/>
    <rect x="22" y="44" width="20" height="6" rx="2" fill="#e0a52a"/>
  </svg>`;

// Startbild: Discokugel dreht sich, Lichtkegel wandern, darunter ein Pokal
const HERO = `
  <div class="pa-hero" aria-hidden="true">
    <span class="pa-beam pa-beam-1"></span>
    <span class="pa-beam pa-beam-2"></span>
    <span class="pa-beam pa-beam-3"></span>
    <span class="pa-ball"></span>
    <span class="pa-trophy">🏆</span>
  </div>`;

export default {
  id: 'partyabend',
  title: 'Partyabend',
  tagline: 'Mehrere Spiele, eine Gesamtwertung für eure Teams.',
  tags: ['Teams'],
  accent: '#a855f7',
  icon: ICON,
  hidden: true, // erscheint nicht in der Spieleliste – Knopf auf der Startseite
  styles: new URL('./partyabend.css', import.meta.url).href,
  mount,
};

function mount(ctx) {
  const { root, storage, audio, fx, vibrate } = ctx;
  const sound = createSounds(audio);
  let players = ctx.players.get();

  const party = getParty();
  if (!party) showSetup();
  else if (party.index >= party.games.length && !party.reveal) showFinale();
  else showOverview();

  function game(id) {
    return games.find((entry) => entry.id === id);
  }

  function standings(totals) {
    const teams = getTeams(players);
    return teams
      .map((team) => ({ ...team, points: totals[team.name] ?? 0 }))
      .sort((a, b) => b.points - a.points);
  }

  // ---------- Einstellungen ----------

  function showSetup() {
    const available = PARTY_GAMES.filter((id) => game(id));
    let picked = (storage.get('games') ?? DEFAULT_GAMES).filter((id) => available.includes(id));
    if (!picked.length) picked = DEFAULT_GAMES;
    let order = storage.get('order') === 'list' ? 'list' : 'mix';

    root.innerHTML = setupScreen({
      hero: `
        <div class="pa-intro">
          ${HERO}
          <h1 class="pa-title" aria-label="Partyabend">${splitLetters('Partyabend', { prefix: 'pa' })}</h1>
          <p class="pa-lede">Mehrere Spiele hintereinander – die Teams sammeln Punkte für die große Gesamtwertung.</p>
        </div>`,
      cards: [
        {
          icon: '👥',
          title: 'Teams',
          body: `${playerEditor({ name: 'players' })}<hr class="pa-divider">${teamEditor({ name: 'teams' })}`,
          note: 'Dieselben Teams wie auf der Startseite. Ohne Namen spielen die Teams einfach unter ihrem Teamnamen.',
        },
        {
          icon: '🎮',
          title: 'Spiele des Abends',
          count: 'games',
          body: toggleList({
            name: 'games',
            label: 'Spiele wählen',
            options: available.map((id) => ({ value: id, label: game(id).title, hint: game(id).tagline })),
            values: picked,
          }),
        },
        {
          icon: '🏅',
          title: 'Ablauf',
          body: setupRow({
            label: 'Reihenfolge',
            control: segmented({ name: 'order', label: 'Reihenfolge', options: ORDERS, value: order }),
          }),
          note: 'Pro Spiel gibt es Platzpunkte: Bei drei Teams bekommt der Sieger 3, der Zweite 2, der Dritte 1 Punkt. So zählt jedes Spiel gleich viel.',
        },
      ],
      start: '<button class="btn btn-primary" type="button" data-action="start">🎉 Partyabend starten</button>',
    });

    bindToggleList(root, 'games', (values) => {
      picked = values;
      storage.set('games', values);
    });
    bindSegmented(root, 'order', (value) => {
      order = value;
      storage.set('order', value);
    });
    const teams = bindTeamEditor(root, 'teams', { open: true });
    players = bindPlayerEditor(root, 'players', {
      min: 0,
      onChange: (list) => {
        players = list;
        teams.refresh(list);
      },
    });
    $('[data-action="start"]', root).addEventListener('click', () => {
      const chosen = available.filter((id) => picked.includes(id));
      saveParty({
        active: true,
        games: order === 'mix' ? shuffle(chosen) : chosen,
        index: 0,
        totals: Object.fromEntries(getTeams(players).map((team) => [team.name, 0])),
        results: [],
        reveal: false,
      });
      sound.start();
      vibrate([0, 40, 30, 60]);
      showOverview();
    });
  }

  // ---------- Übersicht: Zwischenwertung und nächstes Spiel ----------

  function showOverview() {
    const party = getParty();
    const next = game(party.games[party.index]); // fehlt nach dem letzten Spiel – dann geht es zum Finale
    const last = party.reveal ? party.results.at(-1) : null;
    // Für die Animation: Stand vor dem letzten Spiel
    const before = { ...party.totals };
    for (const entry of last?.placements ?? []) before[entry.name] = (before[entry.name] ?? 0) - entry.points;
    const rows = standings(last ? before : party.totals);
    const max = Math.max(1, ...Object.values(party.totals));

    root.innerHTML = `
      <section class="screen pa-overview" data-leave-free>
        <p class="eyebrow">🎉 Partyabend · ${party.index ? `${party.index} von ${party.games.length} gespielt` : 'Gleich geht’s los'}</p>
        ${last ? `
          <div class="pa-result">
            <p class="pa-result-title">${esc(game(last.game)?.title ?? '')} – so lief’s</p>
            <ol class="pa-placements">
              ${last.placements.map((entry, index) => `
                <li style="--i: ${index}">
                  <span class="pa-place">${entry.place}.</span>
                  <span class="pa-place-name">${esc(entry.name)}</span>
                  <b class="pa-place-points" data-team="${esc(entry.name)}">+${entry.points}</b>
                </li>`).join('')}
            </ol>
          </div>` : ''}
        <div class="pa-board-box">
          <p class="eyebrow">Gesamtwertung</p>
          <ol class="pa-board">
            ${rows.map((team) => `
              <li data-team="${esc(team.name)}" style="--team: ${team.color}; --share: ${team.points / max}">
                <span class="pa-bar" aria-hidden="true"></span>
                <span class="pa-board-name">${esc(teamLabel(team))}</span>
                <b class="pa-board-points">${team.points}</b>
              </li>`).join('')}
          </ol>
        </div>
        <ul class="pa-program" aria-label="Programm des Abends">
          ${party.games.map((id, index) => `<li class="${index < party.index ? 'is-done' : index === party.index ? 'is-next' : ''}">${index < party.index ? '✓' : index + 1}<span>${esc(game(id)?.title ?? id)}</span></li>`).join('')}
        </ul>
        ${next ? `
          <div class="pa-next" style="--accent-game: ${next.accent}">
            <span class="pa-next-icon" aria-hidden="true">${next.icon ?? ''}</span>
            <span class="pa-next-text"><small>Spiel ${party.index + 1} von ${party.games.length}</small><b>${esc(next.title)}</b></span>
          </div>
          <button class="btn btn-primary" type="button" data-action="play">▶ ${esc(next.title)} starten</button>
          <div class="pa-links">
            <button class="btn-link" type="button" data-action="skip">Spiel überspringen</button>
            <button class="btn-link" type="button" data-action="finish">Partyabend beenden</button>
          </div>` : '<button class="btn btn-primary pa-to-finale" type="button" data-action="finale">🏆 Zur Siegerehrung</button>'}
      </section>`;

    if (last) revealStandings(party, last);
    if (!next) {
      $('[data-action="finale"]', root).addEventListener('click', showFinale);
      return;
    }
    $('[data-action="play"]', root).addEventListener('click', () => {
      sound.go();
      location.hash = `#/${next.id}`;
    });
    $('[data-action="skip"]', root).addEventListener('click', () => {
      const current = getParty();
      current.index += 1;
      current.reveal = false;
      saveParty(current);
      if (current.index >= current.games.length) showFinale();
      else showOverview();
    });
    $('[data-action="finish"]', root).addEventListener('click', () => {
      const current = getParty();
      current.index = current.games.length;
      saveParty(current);
      showFinale();
    });
  }

  // Punkte fliegen von der Platzierung in die Gesamtwertung, danach rutschen die Teams auf ihre neuen Plätze
  function revealStandings(party, last) {
    party.reveal = false;
    saveParty(party);
    sound.tally();
    ctx.timeout(() => {
      const board = $('.pa-board', root);
      const max = Math.max(1, ...Object.values(party.totals));
      const items = [...board.children];
      const firstTop = new Map(items.map((item) => [item, item.getBoundingClientRect().top]));

      for (const entry of last.placements) {
        const chip = root.querySelector(`.pa-place-points[data-team="${CSS.escape(entry.name)}"]`);
        const row = board.querySelector(`[data-team="${CSS.escape(entry.name)}"]`);
        if (chip && row && !fx.reducedMotion()) flyPoints(chip, row);
      }
      // neu sortieren und mit FLIP von der alten an die neue Position gleiten lassen
      const sorted = [...items].sort((a, b) => (party.totals[b.dataset.team] ?? 0) - (party.totals[a.dataset.team] ?? 0));
      for (const item of sorted) board.append(item);
      for (const item of sorted) {
        const points = party.totals[item.dataset.team] ?? 0;
        item.style.setProperty('--share', String(points / max));
        countUp($('.pa-board-points', item), points);
        const delta = firstTop.get(item) - item.getBoundingClientRect().top;
        if (delta && !fx.reducedMotion()) {
          item.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 700, delay: 350, easing: 'cubic-bezier(.3, 1.3, .5, 1)', fill: 'backwards' });
        }
      }
      sorted[0]?.classList.add('is-leader');
      vibrate(30);
    }, fx.reducedMotion() ? 0 : REVEAL_DELAY_MS);
  }

  function flyPoints(chip, row) {
    const from = chip.getBoundingClientRect();
    const to = $('.pa-board-points', row).getBoundingClientRect();
    const ghost = document.createElement('span');
    ghost.className = 'pa-fly';
    ghost.textContent = chip.textContent;
    ghost.style.left = `${from.left}px`;
    ghost.style.top = `${from.top}px`;
    document.body.append(ghost);
    ghost.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${(to.left - from.left) / 2}px, ${(to.top - from.top) / 2 - 40}px) scale(1.4)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.6)`, opacity: 0 },
      ],
      { duration: 650, easing: 'cubic-bezier(.4, 0, .3, 1)' },
    ).onfinish = () => ghost.remove();
    ctx.onCleanup(() => ghost.remove());
  }

  function countUp(element, target) {
    const start = Number(element.textContent) || 0;
    if (fx.reducedMotion() || start === target) {
      element.textContent = String(target);
      return;
    }
    const began = performance.now();
    ctx.loop((now) => {
      const progress = Math.min(1, (now - began - 350) / 600);
      if (progress < 0) return true;
      element.textContent = String(Math.round(start + (target - start) * progress));
      return progress < 1;
    });
  }

  // ---------- Finale mit Podest ----------

  function showFinale() {
    const party = getParty();
    if (!party) {
      showSetup();
      return;
    }
    const rows = standings(party.totals);
    const podium = [rows[1], rows[0], rows[2]].filter(Boolean); // Platz 2 links, 1 Mitte, 3 rechts
    const best = rows[0]?.points ?? 0;
    const winners = rows.filter((team) => team.points === best);
    const title = winners.length > 1 ? 'Unentschieden!' : `${winners[0]?.name ?? ''} gewinnt!`;

    root.innerHTML = `
      <section class="screen pa-finale" data-leave-free>
        <p class="eyebrow">🎉 Partyabend · ${party.results.length} ${party.results.length === 1 ? 'Spiel' : 'Spiele'} gespielt</p>
        <h1 class="pa-finale-title" aria-label="${esc(title)}">${splitLetters(title, { prefix: 'pa' })}</h1>
        <div class="pa-podium" style="--steps: ${podium.length}">
          ${podium.map((team) => {
            const place = rows.indexOf(team) + 1;
            return `
              <div class="pa-step is-place-${place}" style="--team: ${team.color}; --delay: ${(3 - place) * PODIUM_STEP_MS}ms">
                <span class="pa-step-emoji" aria-hidden="true">${place === 1 ? '👑' : ''}${team.emoji}</span>
                <b class="pa-step-name">${esc(team.name)}</b>
                <span class="pa-step-points">${team.points} Pkt.</span>
                <span class="pa-step-block"><i>${place}</i></span>
              </div>`;
          }).join('')}
        </div>
        ${rows.length > 3 ? `<ol class="pa-rest" start="4">${rows.slice(3).map((team) => `<li>${esc(teamLabel(team))} <b>${team.points}</b></li>`).join('')}</ol>` : ''}
        <button class="btn btn-primary" type="button" data-action="new">Neuer Partyabend</button>
        <button class="btn-link" type="button" data-action="home">Zur Startseite</button>
      </section>`;

    // Platz 3, 2, 1 steigen nacheinander auf, dann Feuerwerk
    [3, 2, 1].forEach((place, index) => {
      ctx.timeout(() => sound.step(place), index * PODIUM_STEP_MS + 300);
    });
    ctx.timeout(() => {
      sound.win();
      vibrate([0, 80, 40, 80, 40, 160]);
      const colors = [winners[0]?.color ?? '#ffd34d', '#ffd34d', '#ffffff', '#a855f7'];
      fx.burst({ colors, count: 90 });
      ctx.timeout(() => fx.burst({ x: window.innerWidth * 0.25, y: window.innerHeight * 0.3, colors, count: 50 }), 400);
      ctx.timeout(() => fx.burst({ x: window.innerWidth * 0.75, y: window.innerHeight * 0.3, colors, count: 50 }), 750);
    }, fx.reducedMotion() ? 0 : 3 * PODIUM_STEP_MS + 300);

    $('[data-action="new"]', root).addEventListener('click', () => {
      clearParty();
      showSetup();
    });
    $('[data-action="home"]', root).addEventListener('click', () => {
      clearParty();
      ctx.exit();
    });
  }
}

function createSounds(audio) {
  const chord = (notes, { gap = 0.08, duration = 0.3, volume = 0.13 } = {}) => {
    notes.forEach((freq, index) => audio.tone({ freq, duration, type: 'triangle', volume, delay: index * gap }));
  };
  return {
    start: () => chord([392, 523, 659, 784, 1047], { gap: 0.07 }),
    go: () => audio.tone({ freq: 523, slideTo: 1047, duration: 0.25, type: 'triangle', volume: 0.15 }),
    tally: () => {
      for (let i = 0; i < 8; i++) audio.tone({ freq: 700 + i * 60, duration: 0.04, type: 'sine', volume: 0.06, delay: 1.1 + i * 0.05 });
    },
    step: (place) => chord(place === 1 ? [523, 659, 784] : place === 2 ? [440, 554] : [392], { duration: 0.35 }),
    win: () => chord([523, 659, 784, 1047, 1319, 1568], { gap: 0.1, duration: 0.45, volume: 0.14 }),
  };
}
