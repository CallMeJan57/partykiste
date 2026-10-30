// Klänge werden live mit der Web Audio API erzeugt – keine Audiodateien nötig.
// Browser erlauben Ton erst nach einer Berührung; unlock() wird dafür bei jedem Tippen aufgerufen.

import { appStorage } from './storage.js';

let audioContext = null;
let muted = appStorage.get('muted', false);

function getContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

export function unlock() {
  getContext();
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  appStorage.set('muted', value);
}

/** Einzelner Ton. type: 'sine' | 'square' | 'triangle' | 'sawtooth'; slideTo gleitet zur Zielfrequenz. */
export function tone({ freq = 880, duration = 0.1, type = 'sine', volume = 0.2, slideTo = null, delay = 0 } = {}) {
  if (muted) return;
  const ac = getContext();
  if (!ac) return;
  try {
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch {
    // Ton ist Beiwerk – Fehler nie ins Spiel durchreichen
  }
}

/** Ausklingendes Rauschen, z. B. für Explosionen oder Zischen. */
export function noise({ duration = 0.7, volume = 0.6, cutoff = 1200, delay = 0 } = {}) {
  if (muted) return;
  const ac = getContext();
  if (!ac) return;
  try {
    const t = ac.currentTime + delay;
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(gain).connect(ac.destination);
    source.start(t);
  } catch {
    // siehe tone()
  }
}

/** Fertige Klänge für typische Spielmomente. */
export const sounds = {
  tick: () => tone({ freq: 1500, duration: 0.07, type: 'square', volume: 0.18 }),
  blip: () => tone({ freq: 660, duration: 0.08, type: 'triangle', volume: 0.2 }),
  success: () => {
    tone({ freq: 660, duration: 0.1, type: 'triangle', volume: 0.2 });
    tone({ freq: 990, duration: 0.18, type: 'triangle', volume: 0.2, delay: 0.1 });
  },
  fail: () => tone({ freq: 220, slideTo: 110, duration: 0.35, type: 'sawtooth', volume: 0.15 }),
  boom: () => {
    tone({ freq: 140, slideTo: 40, duration: 0.8, volume: 0.5 });
    noise({ duration: 0.7, volume: 0.6 });
  },
};
