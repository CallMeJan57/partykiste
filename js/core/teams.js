// Gemeinsame Teams für alle Spiele – auf der Startseite oder in einem Spiel eingeteilt, überall dieselben.
// Gespeichert werden nur die Einstellungen und wer in welchem Team ist; die Namen kommen aus der Spielerliste.

import { getPlayers } from './players.js';
import { shuffle } from './random.js';
import { appStorage } from './storage.js';

// Vorgefertigte Teams: Name, wenn keiner eingegeben wurde, dazu Symbol und Farbe
export const TEAM_STYLES = [
  { name: 'Team Feuer', emoji: '🔥', color: '#ff5a36' },
  { name: 'Team Eis', emoji: '❄️', color: '#38a9f0' },
  { name: 'Team Gift', emoji: '🧪', color: '#34c46b' },
  { name: 'Team Blitz', emoji: '⚡', color: '#e6b00e' },
  { name: 'Team Nacht', emoji: '🌙', color: '#a463f2' },
  { name: 'Team Herz', emoji: '💖', color: '#ff5c9d' },
];

export const TEAM_COUNTS = [2, 3, 4, 5, 6];   // Aufteilen nach Anzahl Teams
export const TEAM_SIZES = [2, 3, 4, 5];       // Aufteilen nach Personen pro Team
export const MIN_TEAM_SIZE = 2;               // jemand erklärt oder spielt vor, mindestens eine Person rät
export const MAX_TEAM_NAME = 20;

const DEFAULTS = { split: 'teams', value: 2, mode: 'random', names: [], assignment: {} };

/**
 * split: 'teams' (value = Anzahl Teams) oder 'size' (value = Personen pro Team)
 * mode: 'random' (gleich große, zufällige Teams) oder 'manual' (selbst eingeteilt)
 * names: eigene Teamnamen, leer = vorgefertigter Name; assignment: Name → Nummer des Teams
 */
export function getTeamSettings() {
  const stored = appStorage.get('teams', {});
  const settings = { ...DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
  if (!['teams', 'size'].includes(settings.split)) settings.split = DEFAULTS.split;
  const allowed = settings.split === 'size' ? TEAM_SIZES : TEAM_COUNTS;
  if (!allowed.includes(settings.value)) settings.value = allowed[0];
  if (!['random', 'manual'].includes(settings.mode)) settings.mode = DEFAULTS.mode;
  if (!Array.isArray(settings.names)) settings.names = [];
  if (!settings.assignment || typeof settings.assignment !== 'object') settings.assignment = {};
  return settings;
}

export function setTeamSettings(settings) {
  appStorage.set('teams', settings);
}

export function teamCount(playerCount, settings = getTeamSettings()) {
  if (settings.split === 'teams') return settings.value;
  return Math.min(TEAM_STYLES.length, Math.max(2, Math.floor(playerCount / settings.value)));
}

/** So viele Namen braucht es, damit das Spiel die Personen auf die Teams verteilen kann. */
export function playersNeeded(settings = getTeamSettings(), playerCount = getPlayers().length) {
  return teamCount(playerCount, settings) * MIN_TEAM_SIZE;
}

/**
 * Die Teams für ein Spiel: [{ name, emoji, color, members }]. Reichen die Namen nicht,
 * gibt es trotzdem die Teams (Name, Farbe), nur ohne Mitglieder – das Spiel fragt dann nicht nach Namen.
 * Neue Namen landen im kleinsten Team; die angepasste Einteilung wird gespeichert.
 */
export function getTeams(players = getPlayers()) {
  const settings = getTeamSettings();
  const count = teamCount(players.length, settings);
  const enough = players.length >= count * MIN_TEAM_SIZE;
  if (enough) {
    const assignment = arrange(players, count, settings.assignment, settings.mode === 'random');
    if (JSON.stringify(assignment) !== JSON.stringify(settings.assignment)) {
      setTeamSettings({ ...settings, assignment });
    }
    settings.assignment = assignment;
  }
  return TEAM_STYLES.slice(0, count).map((style, index) => ({
    ...style,
    defaultName: style.name,
    name: settings.names[index]?.trim() || style.name,
    members: enough ? players.filter((name) => settings.assignment[name] === index) : [],
  }));
}

/** Alle Namen neu und gleichmäßig zufällig verteilen. */
export function shuffleTeams() {
  setTeamSettings({ ...getTeamSettings(), assignment: {} });
  return getTeams();
}

/** Eine Person in ein anderes Team setzen. false, wenn das alte Team dann zu klein wäre. */
export function moveToTeam(name, team) {
  const settings = getTeamSettings();
  const from = settings.assignment[name];
  const left = getPlayers().filter((other) => settings.assignment[other] === from).length;
  if (left <= MIN_TEAM_SIZE) return false;
  setTeamSettings({ ...settings, assignment: { ...settings.assignment, [name]: team } });
  return true;
}

/** Zwei Personen aus verschiedenen Teams tauschen. */
export function swapMembers(first, second) {
  const settings = getTeamSettings();
  const { assignment } = settings;
  setTeamSettings({ ...settings, assignment: { ...assignment, [first]: assignment[second], [second]: assignment[first] } });
}

export function setTeamName(index, name) {
  const settings = getTeamSettings();
  const names = [...settings.names];
  names[index] = name.slice(0, MAX_TEAM_NAME);
  setTeamSettings({ ...settings, names });
}

// Behält bekannte Zuordnungen, verteilt neue Namen aufs kleinste Team und sorgt dafür, dass kein Team zu klein ist.
// Im Zufallsmodus bleiben die Teams außerdem gleich groß (höchstens eine Person Unterschied).
function arrange(players, count, previous, balanced) {
  const assignment = {};
  for (const name of players) {
    if (Number.isInteger(previous[name]) && previous[name] < count) assignment[name] = previous[name];
  }
  const sizes = () => Array.from({ length: count }, (_, index) => players.filter((name) => assignment[name] === index).length);
  const smallest = () => sizes().indexOf(Math.min(...sizes()));
  const largest = () => sizes().indexOf(Math.max(...sizes()));

  for (const name of shuffle(players.filter((entry) => !(entry in assignment)))) {
    assignment[name] = smallest();
  }
  const limit = balanced ? 1 : Infinity;
  while (Math.min(...sizes()) < MIN_TEAM_SIZE || Math.max(...sizes()) - Math.min(...sizes()) > limit) {
    const from = largest();
    const candidates = players.filter((name) => assignment[name] === from);
    assignment[candidates[Math.floor(Math.random() * candidates.length)]] = smallest();
  }
  return assignment;
}
