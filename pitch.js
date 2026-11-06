// Pure audio helpers: no DOM, so they can be tested in Node.

export const NOTE_NAMES = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H']; // German names

export function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

// YIN pitch detection. Returns Hz or null.
export function detectPitch(buf, sampleRate, threshold = 0.15) {
  const half = buf.length >> 1;
  const d = new Float32Array(half);
  for (let tau = 1; tau < half; tau++) {
    let s = 0;
    for (let i = 0; i < half; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  d[0] = 1;
  let sum = 0;
  for (let tau = 1; tau < half; tau++) {
    sum += d[tau];
    d[tau] = sum ? (d[tau] * tau) / sum : 1;
  }
  const minTau = Math.floor(sampleRate / 2000); // ignore anything above ~2 kHz
  let tau = minTau;
  for (; tau < half; tau++) {
    if (d[tau] < threshold) {
      while (tau + 1 < half && d[tau + 1] < d[tau]) tau++;
      break;
    }
  }
  if (tau >= half - 1) return null;
  const [a, b, c] = [d[tau - 1], d[tau], d[tau + 1]];
  const denom = 2 * (2 * b - a - c);
  return sampleRate / (denom ? tau + (c - a) / denom : tau);
}

export const freqToMidi = (f) => Math.round(69 + 12 * Math.log2(f / 440));
export const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);
export const pitchClass = (m) => ((m % 12) + 12) % 12;

// Turns a stream of per-frame (midi|null, rms) readings into "a key was struck" events.
// Matches on pitch class, so octave slips in detection don't count as new notes.
export function createNoteTracker({ stableFrames = 3, gate = 0.01 } = {}) {
  let cand = null, count = 0, lastPc = null, armed = true, floor = Infinity;
  return function feed(midi, level) {
    if (level < gate) { armed = true; cand = null; count = 0; floor = Infinity; return null; }
    if (midi == null) { cand = null; count = 0; return null; }
    const pc = pitchClass(midi);
    if (level > floor * 2) armed = true; // same key struck again: volume jumps
    floor = Math.min(floor, level);
    if (pc !== lastPc) armed = true;
    if (!armed) return null;
    count = pc === cand ? count + 1 : 1;
    cand = pc;
    if (count < stableFrames) return null;
    armed = false; lastPc = pc; floor = level; count = 0;
    return midi;
  };
}
