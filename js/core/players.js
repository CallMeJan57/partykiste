// Gemeinsame Spielerliste für alle Spiele – einmal eintragen, überall verfügbar.

import { appStorage } from './storage.js';

export const MAX_NAME_LENGTH = 20;
export const MAX_PLAYERS = 20;

export function getPlayers() {
  const stored = appStorage.get('players', []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((name) => typeof name === 'string' && name.trim()).slice(0, MAX_PLAYERS);
}

export function setPlayers(players) {
  appStorage.set('players', players);
}

/**
 * Prüft einen neuen Namen. Liefert { name } oder { error } mit einer Meldung für die Anzeige.
 */
export function validateName(raw, players) {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  if (!name) return { error: 'Bitte einen Namen eingeben.' };
  if (players.length >= MAX_PLAYERS) return { error: `Mehr als ${MAX_PLAYERS} Mitspieler gehen nicht.` };
  if (players.some((other) => other.toLowerCase() === name.toLowerCase())) {
    return { error: `„${name}“ ist schon dabei.` };
  }
  return { name };
}
