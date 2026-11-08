// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, freqToMidi, createNoteTracker, rms, clipName, parseBeat, rhythmOk, createTouchTracker } from './pitch.js';

const SR = 48000;
function tone(f, harmonics = [1], n = 2048) {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++)
    harmonics.forEach((amp, h) => { b[i] += amp * 0.3 * Math.sin((2 * Math.PI * f * (h + 1) * i) / SR); });
  return b;
}

test('detects middle C and A4', () => {
  assert.equal(freqToMidi(detectPitch(tone(261.63), SR)), 60);
  assert.equal(freqToMidi(detectPitch(tone(440), SR)), 69);
});

test('piano-like tone with strong overtones stays on the right note', () => {
  assert.equal(freqToMidi(detectPitch(tone(329.63, [1, 0.8, 0.5, 0.3]), SR)), 64);
});

test('silence has no level', () => {
  assert.equal(rms(new Float32Array(2048)), 0);
});

test('tracker: stable note fires once, re-strike fires again, new note fires', () => {
  const feed = createNoteTracker();
  const out = [];
  const step = (m, l) => { const r = feed(m, l); if (r != null) out.push(r); };
  [0.3, 0.25, 0.2, 0.15, 0.1].forEach((l) => step(60, l)); // one C, decaying
  [0.3, 0.3, 0.3].forEach((l) => step(60, l));             // C struck again
  [0.3, 0.3, 0.3].forEach((l) => step(76, l));             // E (other octave ok)
  step(64, 0.25);                                            // octave slip of same E: no event
  step(null, 0.001);                                         // silence
  [0.2, 0.2, 0.2].forEach((l) => step(64, l));              // E again after silence
  assert.deepEqual(out, [60, 60, 76, 64]);
});

test('tracker ignores a one-frame blip', () => {
  const feed = createNoteTracker();
  assert.equal(feed(62, 0.3), null);
  assert.equal(feed(null, 0.3), null);
  assert.equal(feed(62, 0.3), null);
});

test('voice clip names are plain, short and keep notes apart', () => {
  assert.equal(clipName('Das ist ein Cis!'), 'das-ist-ein-cis');
  assert.equal(clipName('Okay, ich höre nicht mehr zu.'), 'okay-ich-hore-nicht-mehr-zu');
  assert.notEqual(clipName('Das ist ein C!'), clipName('Das ist ein Cis!'));
  assert.equal(clipName('Spiel irgendeine Taste und ich sage dir, wie sie heißt!'), 'spiel-irgendeine-taste-und-ich-sage-dir-wie-sie-heisst');
  assert.equal(clipName('Daumen auf das C. Lauf mit drei Fingern nach oben: C, D, E. Und wieder zurück!'), 'daumen-auf-das-c-lauf-mit-drei-fingern-nach-oben-c-d-e-und-w');
});

test('beat words become note lengths', () => {
  assert.deepEqual(parseBeat('ti-ti ta ta-a'), [0.5, 0.5, 1, 2]);
  assert.throws(() => parseBeat('tu'));
});

test('rhythm check accepts any steady tempo and catches ti played as ta', () => {
  const beats = parseBeat('ta ta ti-ti ta');
  assert.ok(rhythmOk([0, 600, 1200, 1500, 1800], beats));
  assert.ok(rhythmOk([0, 900, 1800, 2250, 2700], beats), 'slower is fine');
  assert.ok(rhythmOk([0, 640, 1180, 1530, 1800], beats), 'a little sloppy is fine');
  assert.ok(!rhythmOk([0, 600, 1200, 1800, 2400], beats), 'all even is wrong');
  assert.ok(!rhythmOk([0, 50, 100, 125, 150], beats), 'too fast to be real');
});

test('touch tracker tells gebunden from ungebunden', () => {
  const linked = (levels) => { const t = createTouchTracker(); t(0.3, true); levels.forEach((l) => t(l, false)); return t(0.3, true); };
  assert.equal(linked([0.3, 0.25, 0.2, 0.15]), true, 'held note fades a little');
  assert.equal(linked([0.3, 0.2, 0.02, 0.005]), false, 'released before the next');
});
