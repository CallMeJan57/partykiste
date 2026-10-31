// Alle Spiele der Sammlung – in dieser Reihenfolge erscheinen sie auf der Startseite.
//
// Neues Spiel hinzufügen:
//   1. Ordner js/games/_vorlage kopieren und umbenennen (z. B. js/games/wer-bin-ich)
//   2. In der index.js des neuen Ordners id, title usw. anpassen
//   3. Hier importieren und in die Liste eintragen
//
// Einträge mit `tool: true` (z. B. das Regelrad) erscheinen nicht als Karte, sondern als Knopf in der Kopfzeile.

import bombe from './bombe/index.js';
import nochNie from './noch-nie/index.js';
import wahrheitPflicht from './wahrheit-pflicht/index.js';
import kissMarryKill from './kiss-marry-kill/index.js';
import songRaten from './song-raten/index.js';
import pantomime from './pantomime/index.js';
import werWuerdeEher from './wer-wuerde-eher/index.js';
import yoga from './yoga/index.js';
import storychaos from './storychaos/index.js';
import blindZeichnen from './blind-zeichnen/index.js';
import regelrad from './regelrad/index.js';
import schaetzen from './schaetzen/index.js';
import imposter from './imposter/index.js';
import emojiRaten from './emoji-raten/index.js';
import blackStories from './black-stories/index.js';
import colorMatch from './color-match/index.js';

// Abschnitte auf der Startseite (per id). Spiele, die hier fehlen, landen unter „Weitere Spiele“.
export const sections = [
  { emoji: '🍻', title: 'Quatschen & Trinken', ids: ['noch-nie', 'wahrheit-pflicht', 'wer-wuerde-eher', 'kiss-marry-kill'] },
  { emoji: '🧠', title: 'Raten & Rätseln', ids: ['song-raten', 'emoji-raten', 'schaetzen', 'imposter', 'black-stories'] },
  { emoji: '🎭', title: 'Action & Kreativ', ids: ['bombe', 'pantomime', 'blind-zeichnen', 'storychaos', 'yoga', 'color-match'] },
];

export const games = [
  bombe,
  nochNie,
  wahrheitPflicht,
  kissMarryKill,
  songRaten,
  pantomime,
  werWuerdeEher,
  yoga,
  storychaos,
  blindZeichnen,
  regelrad,
  schaetzen,
  imposter,
  emojiRaten,
  blackStories,
  colorMatch,
];
