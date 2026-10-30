// VORLAGE FÜR EIN NEUES MINISPIEL
//
// 1. Diesen Ordner kopieren, z. B. nach js/games/wer-bin-ich
// 2. vorlage.css umbenennen (z. B. wer-bin-ich.css) und unten bei `styles` anpassen
// 3. id, title, tagline … anpassen. Die id steht in der URL (#/wer-bin-ich) und im CSS (.game-wer-bin-ich)
// 4. In js/games/index.js importieren und in die Liste eintragen

import { $ } from '../../core/dom.js';

export default {
  id: 'vorlage',                                   // nur a–z, 0–9 und -
  title: 'Vorlage',                                // Name auf der Karte und in der Kopfzeile
  tagline: 'Ein Satz, worum es in dem Spiel geht.',
  tags: ['ab 2 Spielern', 'ca. 5 Min.'],            // kleine Hinweise auf der Karte
  accent: '#3d8bff',                               // Farbe des Symbols auf der Karte
  icon: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22" fill="currentColor"/></svg>',
  styles: new URL('./vorlage.css', import.meta.url).href,
  mount,
};

/**
 * Wird aufgerufen, sobald das Spiel geöffnet wird. Was ctx mitbringt:
 *
 *   ctx.root          Element, in das das Spiel zeichnet
 *   ctx.storage       .get(key, fallback) / .set(key, value) – bleibt gespeichert, nur für dieses Spiel
 *   ctx.players       .get() / .set(liste) – gemeinsame Mitspielerliste aller Spiele
 *                     (zum Eintragen: playerEditor() + bindPlayerEditor() aus core/ui.js)
 *   Einstellungsseite:  setupScreen({ hero, cards, start }) aus core/ui.js – so sehen alle Spiele gleich aus
 *   ctx.audio         .sounds.tick() / .blip() / .success() / .fail() / .boom(), .tone({ freq, duration, … })
 *   ctx.fx            .flash(), .shake(), .burst(), .toast(text), .reducedMotion()
 *   ctx.vibrate(ms)   Vibration, z. B. vibrate(20) oder vibrate([0, 80, 40, 120])
 *   ctx.timeout / ctx.interval / ctx.loop / ctx.listen
 *                     wie setTimeout & Co., werden beim Verlassen des Spiels automatisch beendet
 *   ctx.exit()        zurück zur Spieleauswahl
 */
function mount(ctx) {
  const { root, storage, audio } = ctx;
  let rounds = storage.get('runden', 0);

  render();

  function render() {
    root.innerHTML = `
      <section class="screen vorlage-screen">
        <h1 class="vorlage-title">Vorlage</h1>
        <p>Bisher gespielt: <b>${rounds}</b> ${rounds === 1 ? 'Runde' : 'Runden'}</p>
        <button class="btn btn-primary" type="button" data-action="play">Runde spielen</button>
      </section>`;

    $('[data-action="play"]', root).addEventListener('click', () => {
      rounds += 1;
      storage.set('runden', rounds);
      audio.sounds.success();
      render();
    });
  }
}
