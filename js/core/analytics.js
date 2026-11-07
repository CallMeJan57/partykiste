// Besucherzähler GoatCounter: ohne Cookies, Zahlen auf https://callmejan57.goatcounter.com
// Zählt nur auf der veröffentlichten Seite – nicht lokal und nicht in der Vorschau auf claude.ai.
// Seitenaufrufe zählt das Skript selbst, geöffnete Spiele und Werkzeuge kommen als Ereignisse dazu.

const ENDPOINT = 'https://callmejan57.goatcounter.com/count';
const SCRIPT = 'https://gc.zgo.at/count.js';
const LIVE_HOST = 'callmejan57.github.io';

const active = location.hostname === LIVE_HOST;
let pending = []; // Ereignisse, bevor das Skript geladen ist

export function enableAnalytics() {
  if (!active) return;
  // Pfade ohne ?…, damit jeder Aufruf der Startseite gleich gezählt wird (gilt auch für Ereignisse)
  window.goatcounter = { path: (path) => path.split('?')[0] };
  const script = document.createElement('script');
  script.async = true;
  script.src = SCRIPT;
  script.dataset.goatcounter = ENDPOINT;
  script.addEventListener('load', () => {
    for (const event of pending) send(event);
    pending = [];
  });
  document.head.append(script);
}

/** Zählt ein Ereignis, z. B. ein geöffnetes Spiel: trackEvent('spiel/tabu', 'Tabu'). */
export function trackEvent(path, title) {
  if (!active) return;
  const event = { path, title, event: true };
  if (window.goatcounter?.count) send(event);
  else pending.push(event);
}

function send(event) {
  try {
    window.goatcounter.count(event);
  } catch {
    // Zählen darf das Spiel nie stören, z. B. wenn ein Werbeblocker GoatCounter sperrt
  }
}
