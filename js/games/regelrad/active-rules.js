// Aktive Regeln des Regelrads. Sie gelten weiter, auch wenn zwischendurch ein anderes Spiel läuft –
// deshalb zeigt auch die Startseite sie an (js/hub/hub.js).
// Eine Regel: { id, emoji, title, text, owner } – owner = wer aufs Regelfeld kam (oder null).

import { createStorage } from '../../core/storage.js';

const storage = createStorage('regelrad');

export function loadActiveRules() {
  const stored = storage.get('active');
  return Array.isArray(stored) ? stored : [];
}

export function saveActiveRules(rules) {
  storage.set('active', rules);
}

export function untilLabel(rule) {
  return rule.owner ? `bis ${rule.owner} wieder dran ist` : 'bis die Person wieder dran ist';
}
