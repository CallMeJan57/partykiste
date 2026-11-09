// Partyabend (optional): Teams spielen mehrere Spiele hintereinander und sammeln Platzpunkte in einer Gesamtwertung.
// Hier liegt nur der gespeicherte Stand und die Verbindung zu den Spielen; Ablauf und Bildschirme stehen in
// js/games/partyabend/. Ein Spiel, das gerade für den Partyabend läuft, startet im Teammodus und zeigt auf
// seinem Endbildschirm „Weiter zum Partyabend“ (partyFinish).

import { $ } from './dom.js';
import { appStorage } from './storage.js';
import { getTeams } from './teams.js';

// Spiele mit Teammodus, die sich für den Partyabend eignen (Reihenfolge = Vorschlag in den Einstellungen)
export const PARTY_GAMES = ['tabu', 'stirnraten', 'schaetzen', 'pantomime', 'emoji-raten', 'blind-zeichnen', 'song-raten', 'color-match', 'black-stories'];

export function getParty() {
  const party = appStorage.get('party', null);
  return party && typeof party === 'object' && party.active ? party : null;
}

export function saveParty(party) {
  appStorage.set('party', party);
}

export function clearParty() {
  appStorage.set('party', null);
}

/** Läuft gerade dieses Spiel als aktuelles Spiel des Partyabends? */
export function isPartyGame(id) {
  const party = getParty();
  return Boolean(party && party.games[party.index] === id);
}

/**
 * Platzpunkte: Bei T Teams bekommt Platz 1 T Punkte, Platz 2 T−1 … Gleichstand teilt sich den besseren Platz.
 * ranked: [[Teamname, Spielpunkte], …] in beliebiger Reihenfolge.
 */
export function placementPoints(ranked) {
  const sorted = [...ranked].sort((a, b) => b[1] - a[1]);
  return sorted.map(([name, score]) => {
    const place = 1 + sorted.filter(([, other]) => other > score).length;
    return { name, score, place, points: sorted.length - place + 1 };
  });
}

/**
 * Auf dem Endbildschirm eines Spiels aufrufen. Läuft das Spiel für den Partyabend und wurde in Teams gespielt,
 * erscheint oben ein Knopf „Weiter zum Partyabend“; der bisherige Hauptknopf wird zum Nebenknopf.
 * scores: Map oder Liste [[Teamname, Punkte], …].
 */
export function partyFinish(root, id, scores) {
  const party = getParty();
  if (!party || party.games[party.index] !== id) return;
  const teamNames = new Set(getTeams().map((team) => team.name));
  const ranked = [...scores].filter(([name]) => teamNames.has(name));
  const screen = root.querySelector('[data-leave-free]');
  if (!screen) return;

  if (ranked.length < 2) {
    screen.insertAdjacentHTML('afterbegin', '<p class="party-note">🎉 Für den Partyabend zählt dieses Spiel nur im Teammodus.</p>');
    return;
  }
  const again = $('[data-action="again"]', screen);
  again?.classList.replace('btn-primary', 'btn-ghost');
  again?.classList.add('party-again');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary party-continue';
  button.innerHTML = `🏆 Weiter zum Partyabend <small>Spiel ${party.index + 1} von ${party.games.length}</small>`;
  (again ?? screen.lastElementChild).before(button);
  button.addEventListener('click', () => {
    recordResult(id, ranked);
    location.hash = '#/partyabend';
  }, { once: true });
}

function recordResult(id, ranked) {
  const party = getParty();
  if (!party || party.games[party.index] !== id) return;
  const placements = placementPoints(ranked);
  for (const entry of placements) party.totals[entry.name] = (party.totals[entry.name] ?? 0) + entry.points;
  party.results.push({ game: id, placements });
  party.index += 1;
  party.reveal = true; // der Partyabend zeigt beim nächsten Öffnen die Zwischenwertung
  saveParty(party);
}

/** Kleiner Hinweis für die Startseite, z. B. „Spiel 2 von 4“. */
export function partyStatus() {
  const party = getParty();
  if (!party) return null;
  return { index: party.index, count: party.games.length, next: party.games[party.index] ?? null };
}
