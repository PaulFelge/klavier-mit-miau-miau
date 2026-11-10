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

// File name of the recorded voice clip for a spoken line: "Das ist ein Cis!" -> "das-ist-ein-cis".
export const clipName = (text) => text.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');

// "ti-ti ta" -> note lengths in beats: [0.5, 0.5, 1]. "ta-a" is a half note (2 beats).
export const parseBeat = (beat) => beat.split(' ').flatMap((t) => ({ ta: [1], 'ti-ti': [0.5, 0.5], 'ta-a': [2] })[t]
  ?? (() => { throw new Error(`unknown beat "${t}"`); })());

// Did the note start times (ms) follow these lengths? Any steady tempo counts; each gap may be off by `tol`.
// The last note's length can't be heard (nothing follows it), so only the gaps between notes are checked.
export function rhythmOk(times, beats, tol = 0.35) {
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const want = beats.slice(0, gaps.length);
  const msPerBeat = gaps.reduce((a, b) => a + b, 0) / want.reduce((a, b) => a + b, 0);
  if (!(msPerBeat > 200 && msPerBeat < 2000)) return false;
  return gaps.every((g, i) => Math.abs(g - want[i] * msPerBeat) <= tol * want[i] * msPerBeat);
}

// Gebunden or not, from the mic: if the sound dropped well below the last note's peak before the next note
// started, the finger came up early (ungebunden). Call every frame; returns true/false on a new note.
// shortcut: `dip` is a first guess for an acoustic piano without pedal; tune it on her real piano.
export function createTouchTracker({ dip = 0.2, gate = 0.01 } = {}) {
  let peak = 0, dipped = false;
  return function feed(level, isNewNote) {
    if (isNewNote) { const linked = !dipped; peak = level; dipped = false; return linked; }
    peak = Math.max(peak, level);
    if (peak > 0 && level < Math.max(gate, peak * dip)) dipped = true;
    return undefined;
  };
}
