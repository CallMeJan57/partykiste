// Spielautomaten-Klänge für „Storychaos³“, gebaut aus den Grundklängen von core/audio.js.

// Dudel-Melodie, die während des Drehens in Schleife läuft (C-Dur-Arpeggio wie am Automaten).
const SPIN_MELODY = [523, 659, 784, 1047, 784, 659];
const WIN_NOTES = [523, 659, 784, 1047, 1319, 1568, 2093];

export function createSlotSounds(audio) {
  return {
    /** Kurzes metallisches Klicken – eine Raste beim Hebel oder ein vorbeilaufendes Feld der Walze. */
    click(volume = 0.22) {
      audio.noise({ duration: 0.018, volume, cutoff: 6000 });
      audio.tone({ freq: 2600, duration: 0.012, type: 'square', volume: volume * 0.12 });
    },

    /** Hebel ganz unten: Ratschen und ein dumpfes Einrasten. */
    lever() {
      for (let i = 0; i < 5; i++) audio.noise({ duration: 0.016, volume: 0.3, cutoff: 5000, delay: i * 0.035 });
      audio.tone({ freq: 150, slideTo: 70, duration: 0.16, type: 'square', volume: 0.14, delay: 0.17 });
      audio.noise({ duration: 0.12, volume: 0.35, cutoff: 700, delay: 0.17 });
    },

    /** Ein Ton der Dreh-Melodie; step zählt einfach hoch. */
    melody(step) {
      const freq = SPIN_MELODY[step % SPIN_MELODY.length];
      audio.tone({ freq, duration: 0.09, type: 'square', volume: 0.035 });
      audio.tone({ freq: freq * 2, duration: 0.06, type: 'triangle', volume: 0.025 });
    },

    /** Spannung vor dem letzten Stopp: ansteigender Ton über die Restzeit. */
    suspense(seconds) {
      audio.tone({ freq: 330, slideTo: 1320, duration: seconds, type: 'sawtooth', volume: 0.035 });
      audio.tone({ freq: 335, slideTo: 1330, duration: seconds, type: 'sine', volume: 0.05 });
    },

    /** Walze rastet ein: dumpfer Schlag plus kleines Glöckchen, je Walze etwas höher. */
    stop(index) {
      audio.tone({ freq: 120, slideTo: 60, duration: 0.14, type: 'square', volume: 0.16 });
      audio.noise({ duration: 0.09, volume: 0.45, cutoff: 900 });
      audio.tone({ freq: 1568 + index * 262, duration: 0.25, type: 'triangle', volume: 0.08, delay: 0.03 });
    },

    /** Gewinn-Fanfare: schnelles Arpeggio und Münz-Glöckchen. */
    win() {
      WIN_NOTES.forEach((freq, i) => {
        audio.tone({ freq, duration: 0.14, type: 'square', volume: 0.06, delay: i * 0.07 });
        audio.tone({ freq: freq * 2, duration: 0.1, type: 'triangle', volume: 0.04, delay: i * 0.07 });
      });
      for (let i = 0; i < 10; i++) {
        audio.tone({ freq: i % 2 ? 2637 : 3136, duration: 0.08, type: 'triangle', volume: 0.07, delay: 0.5 + i * 0.065 });
      }
      audio.tone({ freq: 1047, duration: 0.5, type: 'triangle', volume: 0.1, delay: 0.5 });
    },
  };
}
