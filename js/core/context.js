// Baut das ctx-Objekt, das jedes Spiel in mount(ctx) bekommt.
// Alles, was über ctx gestartet wird (Timer, Animationsschleifen, Listener), wird beim
// Verlassen des Spiels automatisch beendet – ein Spiel muss nicht selbst aufräumen.

import * as audio from './audio.js';
import * as fx from './fx.js';
import { vibrate } from './haptics.js';
import { getPlayers, setPlayers } from './players.js';
import { createStorage } from './storage.js';

export function createContext({ game, root, exit }) {
  const timeouts = new Set();
  const intervals = new Set();
  const loops = new Set();
  const cleanups = [];

  const ctx = {
    game,
    root,
    exit,
    storage: createStorage(game.id),
    players: { get: getPlayers, set: setPlayers },
    audio,
    fx,
    vibrate,

    timeout(fn, ms) {
      const id = setTimeout(() => {
        timeouts.delete(id);
        fn();
      }, ms);
      timeouts.add(id);
      return id;
    },
    clearTimeout(id) {
      clearTimeout(id);
      timeouts.delete(id);
    },

    interval(fn, ms) {
      const id = setInterval(fn, ms);
      intervals.add(id);
      return id;
    },
    clearInterval(id) {
      clearInterval(id);
      intervals.delete(id);
    },

    /** Ruft fn(zeit) in jedem Frame auf, bis fn false zurückgibt oder stop() aufgerufen wird. */
    loop(fn) {
      let frame = 0;
      let running = true;
      const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
        loops.delete(stop);
      };
      const step = (now) => {
        if (!running) return;
        if (fn(now) === false) {
          stop();
          return;
        }
        frame = requestAnimationFrame(step);
      };
      loops.add(stop);
      frame = requestAnimationFrame(step);
      return stop;
    },

    /** addEventListener, der beim Verlassen automatisch entfernt wird (für window, document …). */
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    },

    onCleanup(fn) {
      cleanups.push(fn);
    },
  };

  function dispose() {
    timeouts.forEach((id) => clearTimeout(id));
    intervals.forEach((id) => clearInterval(id));
    [...loops].forEach((stop) => stop());
    for (const fn of cleanups.reverse()) {
      try {
        fn();
      } catch (error) {
        console.error(error);
      }
    }
    timeouts.clear();
    intervals.clear();
    cleanups.length = 0;
  }

  return { ctx, dispose };
}
