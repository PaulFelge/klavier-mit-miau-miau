import { NOTE_NAMES, clipName, detectPitch, freqToMidi, midiToFreq, pitchClass, rms, createNoteTracker, parseBeat, rhythmOk, createTouchTracker } from './pitch.js';

const $ = (id) => document.getElementById(id);
const FINGER = { C: 1, D: 2, E: 3, F: 4, G: 5, A: 5 }; // right hand, thumb on C
// Black-key lessons say which hand plays each note (L = bear, R = bird), as in her book.
const HAND = { L: { label: '🐻 Finger', Cis: 3, Dis: 2 }, R: { label: '🐦 Finger', Cis: 2, Dis: 3 } };

// Songs are public domain. The first songs leave rhythm out: at 6 she learns where the keys are first.
// Later lessons are split into short `phrases` that are judged as a whole:
//   beat: 'ti-ti ta' (ta = one beat, ti = half). Without notes, every note is a C.
//   touch: 'legato' (gebunden: next key goes down before the last comes up) or 'detached' (ungebunden).
//     A repeated note can't be gebunden (same key), so legato only judges the steps.
// Plan for these and later stages: docs/stages.md
const LESSONS = [
  { title: 'Freies Spiel', free: true, intro: 'Spiel irgendeine Taste und ich sage dir, wie sie heißt!' },
  { title: 'Finde das C', intro: 'Such zwei schwarze Tasten nebeneinander. Das C wohnt direkt links davon! Spiel das C mit dem Daumen.', notes: 'C C C' },
  { title: 'C D E', intro: 'Daumen auf das C. Lauf mit drei Fingern nach oben: C, D, E. Und wieder zurück!', notes: 'C D E E D C' },
  { title: 'Fünf Pfoten', intro: 'Ein Finger auf jede Taste, von C bis G. Die Treppe hoch und wieder runter!', notes: 'C D E F G G F E D C' },
  { title: 'Hänschen klein', intro: 'Unser erstes Lied! Tipp auf Anhören, dann hörst du es zuerst.', notes: 'G E E F D D C D E F G G G G E E F D D C E G G C' },
  { title: 'Alle meine Entchen', intro: 'Alle meine Entchen! Für das A streckst du den kleinen Finger.', notes: 'C D E F G G A A A A G A A A A G F F F F E E D D D D C' },
  { title: 'Funkel, funkel, kleiner Stern', intro: 'Funkel, funkel, kleiner Stern! Für das A streckst du den kleinen Finger.', notes: 'C C G G A A G F F E E D D C' },
  { title: 'Ode an die Freude', intro: 'Ein ganz berühmtes Lied von Beethoven. Du schaffst das!', notes: 'E E F G G F E D C C D E E D D' },
  // From her book (page 17); only the notes, the lyrics stay in the book. Added last so saved stars keep their index.
  {
    title: 'Gespräch in der Höhle',
    intro: 'Heute spielen wir nur auf den zwei schwarzen Tasten! Der Bär spielt mit der linken Hand, der Vogel mit der rechten.',
    phrases: [
      { notes: 'Cis Dis Cis Dis Cis Dis Cis Dis Cis Dis Cis Dis ' + 'Dis Cis Dis Dis Cis Dis Cis Dis Dis Cis', hands: 'L'.repeat(12) + 'R'.repeat(10) },
      // Last line, as marked in her book: steps gebunden, repeated notes ungebunden.
      { touch: 'legato', notes: 'Dis Dis Cis Cis Dis Dis Cis Dis Dis Cis Cis Dis Dis Cis', hands: 'L'.repeat(14),
        tip: 'Jetzt der Bär mit Bogen: Beim Schritt schleichen, bei zwei gleichen Tönen hüpfen!' },
    ],
  },
  // Stage 2: Ti-ti-ta. A phrase never ends on a ti: nothing follows the last note, so its length can't be heard.
  { title: 'Ta Ta Ta', intro: 'Jetzt kommt der Rhythmus! Ein großer Punkt heißt Ta. Spiel immer gleich schnell, wie eine Uhr: Ta, Ta, Ta, Ta.',
    phrases: [{ beat: 'ta ta ta ta' }, { beat: 'ta ta ta ta', notes: 'C D E F' }] },
  { title: 'Ti-ti und Ta', intro: 'Zwei kleine Punkte heißen Ti-ti. Ti-ti ist doppelt so schnell wie Ta. Hör gut zu und spiel es nach!',
    phrases: [{ beat: 'ta ta ti-ti ta' }, { beat: 'ti-ti ta ti-ti ta' }, { beat: 'ti-ti ti-ti ta ta' }] },
  { title: 'Rhythmus-Echo', intro: 'Ich spiele dir einen Rhythmus vor, und du spielst ihn genau so nach. Wie ein Echo!',
    phrases: [{ beat: 'ta ti-ti ta ta', notes: 'C D D E E' }, { beat: 'ti-ti ti-ti ta', notes: 'E D C D E' }, { beat: 'ti-ti ta ti-ti ta', notes: 'G G E F F D' }] },
  { title: 'Hänschen klein im Rhythmus', intro: 'Hänschen klein, jetzt mit Ti-ti und Ta! Hör erst gut zu.',
    phrases: [
      { beat: 'ti-ti ta ti-ti ta', notes: 'G E E F D D' }, { beat: 'ti-ti ti-ti ti-ti ta', notes: 'C D E F G G G' },
      { beat: 'ti-ti ta ti-ti ta', notes: 'G E E F D D' }, { beat: 'ti-ti ti-ti ta', notes: 'C E G G C' },
    ] },
  // Stage 3: gebunden und ungebunden
  { title: 'Schleichkatze', touch: 'legato', intro: 'Gebunden spielen heißt: Der Finger bleibt unten, bis der nächste Finger drückt. Ganz leise, wie eine Katze, die schleicht.',
    phrases: [{ notes: 'C D E F G' }, { notes: 'G F E D C' }] },
  { title: 'Hüpfkatze', touch: 'detached', intro: 'Ungebunden spielen heißt: Heb den Finger kurz hoch, bevor der nächste drückt. Wie eine Katze, die hüpft!',
    phrases: [{ notes: 'C D E F G' }, { notes: 'G F E D C' }] },
  { title: 'Schleichen und Hüpfen', intro: 'Jetzt wechseln wir ab! Mit Bogen wird geschlichen, ohne Bogen wird gehüpft.',
    phrases: [{ touch: 'legato', notes: 'C D E F G' }, { touch: 'detached', notes: 'G G E E C' }, { touch: 'legato', notes: 'C E D F E' }, { touch: 'detached', notes: 'D D C C' }] },
];

// shortcut: progress lives in this browser only; fine for one child on one device.
const store = {
  get() { try { return JSON.parse(localStorage.getItem('miau-done') || '[]'); } catch { return []; } },
  add(i) { try { localStorage.setItem('miau-done', JSON.stringify([...new Set([...this.get(), i])])); } catch {} },
};

/* ---------------- Sound ---------------- */
let ctx;
let quietUntil = 0; // ignore the mic while our own speaker is making sound
function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(midi, at = 0, len = 0.9) {
  const ac = audio();
  const t = ac.currentTime + at;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  gain.connect(ac.destination);
  for (const [type, mult, vol] of [['triangle', 1, 1], ['sine', 2, 0.3]]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = midiToFreq(midi) * mult;
    g.gain.value = vol;
    o.connect(g).connect(gain);
    o.start(t);
    o.stop(t + len);
  }
  quietUntil = Math.max(quietUntil, performance.now() + (at + len) * 1000 + 250);
}

function meow() {
  const ac = audio();
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(550, t);
  o.frequency.linearRampToValueAtTime(900, t + 0.15);
  o.frequency.linearRampToValueAtTime(480, t + 0.5);
  f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(f).connect(g).connect(ac.destination);
  o.start(t); o.stop(t + 0.6);
  quietUntil = Math.max(quietUntil, performance.now() + 850);
}

// Recorded lines live in assets/voice/ (see README). `parts` lets one sentence be built from two clips.
const voice = new Audio(); // one reused element: iOS keeps letting it play once a tap has started it
let sayId = 0;
// `done` runs once the line has been spoken, unless something else was said meanwhile.
function say(text, parts = [text], done) {
  $('bubble').textContent = text;
  hush();
  const id = ++sayId;
  const live = () => id === sayId;
  let spoken = false; // fell back to the device voice
  const queue = parts.map((p) => `assets/voice/${clipName(p)}.mp3`);
  const finish = () => {
    if (!live()) return;
    quietUntil = Math.max(quietUntil, performance.now() + 250);
    done?.();
  };
  const fallback = () => { if (live() && !spoken) { spoken = true; speak(text, finish); } }; // clip missing or blocked
  const next = () => {
    if (!live() || spoken) return;
    if (!queue.length) return finish();
    voice.src = queue.shift();
    voice.play().catch(fallback);
  };
  voice.onended = next;
  voice.onerror = fallback;
  next();
}

function speak(text, onend) {
  if (!('speechSynthesis' in window)) return onend?.();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'♯]/gu, ''));
  u.lang = 'de-DE'; u.pitch = 1.6; u.rate = 0.95;
  u.onend = onend;
  speechSynthesis.speak(u);
}

function hush() {
  voice.pause();
  window.speechSynthesis?.cancel();
}

/* ---------------- Cat ---------------- */
const cat = $('cat');
let moodTimer;
function mood(name, ms = 1400) {
  cat.classList.remove('happy', 'hmm');
  void cat.getBoundingClientRect(); // restart the hop animation
  cat.classList.add(name);
  clearTimeout(moodTimer);
  moodTimer = setTimeout(() => cat.classList.remove(name), ms);
}

// Video kitten: the pointer picks a frame between "looking left" and "looking right".
const kitten = $('kitten');
let wantTime = null;
function useKitten() {
  cat.classList.add('video');
  kitten.currentTime = +kitten.dataset.left || 0;
  (function scrub() {
    requestAnimationFrame(scrub);
    if (wantTime == null || kitten.seeking) return;
    const d = wantTime - kitten.currentTime;
    if (Math.abs(d) > 0.02) kitten.currentTime += d * 0.35; // ease toward the target frame
  })();
}
// iOS won't paint the clip (and in Low Power Mode won't even load it) until it has played once.
const wakeKitten = () => kitten.play().then(() => kitten.pause(), () => {});
wakeKitten();
addEventListener('pointerdown', wakeKitten, { once: true });
// The clip may finish loading before this module runs, so check before waiting for the event.
if (kitten.readyState >= 1) useKitten();
else kitten.addEventListener('loadedmetadata', useKitten, { once: true });

// Plays a reaction clip over the kitten. Returns the clip, or null when the drawn cat is shown instead.
function react(name) {
  if (!cat.classList.contains('video')) return null;
  document.querySelectorAll('video.react.on').forEach((o) => { o.pause(); o.classList.remove('on'); });
  const v = $(`react-${name}`);
  v.currentTime = 0;
  v.play().then(() => v.classList.add('on'), () => {});
  return v;
}
document.querySelectorAll('video.react').forEach((v) => v.addEventListener('ended', () => v.classList.remove('on')));

function lookAt(x, y) {
  const r = cat.getBoundingClientRect();
  if (cat.classList.contains('video')) {
    const left = +kitten.dataset.left || 0;
    const right = +kitten.dataset.right || kitten.duration;
    const t = Math.max(0, Math.min(1, 0.5 + (x - (r.left + r.width / 2)) / innerWidth));
    wantTime = left + (right - left) * t;
    return;
  }
  const dx = x - (r.left + r.width / 2);
  const dy = y - (r.top + r.height * 0.5);
  const dist = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, dist / 200) * 7; // pupils move at most 7 units
  cat.querySelector('.pupils').style.translate = `${(dx / dist) * k}px ${(dy / dist) * k}px`;
  if (!cat.classList.contains('hmm'))
    cat.querySelector('.head').style.rotate = `${Math.max(-8, Math.min(8, dx / 40))}deg`;
}
addEventListener('pointermove', (e) => lookAt(e.clientX, e.clientY));
addEventListener('pointerdown', (e) => lookAt(e.clientX, e.clientY));

function lookAtKey(midi) {
  const k = document.querySelector(`.key[data-midi="${midi}"]`);
  if (!k) return;
  const r = k.getBoundingClientRect();
  lookAt(r.left + r.width / 2, r.top + r.height / 2);
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.textContent = i % 3 ? '🐾' : '⭐';
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 2600);
}

/* ---------------- Keyboard ---------------- */
const WHITE = [60, 62, 64, 65, 67, 69, 71, 72];
const BLACK = [[61, 1], [63, 2], [66, 4], [68, 5], [70, 6]]; // [midi, sits after this many white keys]
const name = (m) => NOTE_NAMES[pitchClass(m)];
const keyFor = (letter) => [...WHITE, ...BLACK.map(([m]) => m)].find((m) => name(m) === letter);

const held = new Set(); // pointers pressing on-screen keys right now (a mouse can only play ungebunden)
for (const type of ['pointerup', 'pointercancel']) addEventListener(type, (e) => held.delete(e.pointerId));

function buildKeys() {
  const kb = document.createElement('div');
  kb.className = 'kb';
  kb.style.setProperty('--w', `${100 / WHITE.length}%`);
  const mk = (m, cls) => {
    const b = document.createElement('button');
    b.className = `key ${cls}`;
    b.dataset.midi = m;
    b.setAttribute('aria-label', name(m));
    const press = (linked) => { playTone(m); flash(m); onNote(m, linked); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const linked = held.size > 0; // another finger still down = gebunden
      held.add(e.pointerId);
      press(linked);
    });
    b.addEventListener('click', (e) => { if (e.detail === 0) press(false); }); // keyboard Enter/Space
    return b;
  };
  for (const m of WHITE) {
    const b = mk(m, 'white');
    b.textContent = name(m);
    b.style.setProperty('--note', `var(--${name(m)})`);
    kb.append(b);
  }
  for (const [m, after] of BLACK) {
    const b = mk(m, 'black');
    b.style.setProperty('--note', `var(--${name(m)}, #fff)`);
    b.style.left = `calc(var(--w) * ${after})`;
    kb.append(b);
  }
  $('keys').append(kb);
}

function flash(midi) {
  const pc = pitchClass(midi);
  document.querySelectorAll('.key').forEach((k) => {
    if (pitchClass(+k.dataset.midi) !== pc) return;
    k.classList.add('down');
    setTimeout(() => k.classList.remove('down'), 250);
  });
}

/* ---------------- Lessons ---------------- */
let current = null; // { index, phrases, ph, phrase, notes: [letter], pos, times: [ms], links: [gebunden?] }

function enterPhrase(ph) {
  const phrase = current.phrases[ph];
  Object.assign(current, { ph, phrase, notes: phrase?.notes ?? [], pos: 0, times: [], links: [] });
}

function renderHome() {
  const done = store.get();
  $('lessons').replaceChildren(...LESSONS.map((l, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.innerHTML = `<span class="num">${l.free ? '🎹' : done.includes(i) ? '⭐' : i}</span>`;
    b.append(l.title);
    if (done.includes(i)) b.classList.add('done');
    b.addEventListener('click', () => startLesson(i));
    li.append(b);
    return li;
  }));
}

function show(screen) {
  $('home').hidden = screen !== 'home';
  $('lesson').hidden = screen !== 'lesson';
  $('back').hidden = screen === 'home';
}

function startLesson(i) {
  const l = LESSONS[i];
  const phrases = l.free ? [] : (l.phrases ?? [{ notes: l.notes }]).map((p) => {
    const beats = p.beat ? parseBeat(p.beat) : null;
    return { beats, touch: p.touch ?? l.touch ?? null, notes: p.notes ? p.notes.split(' ') : beats.map(() => 'C'), hands: p.hands, tip: p.tip };
  });
  current = { index: i, phrases };
  enterPhrase(0);
  $('title').textContent = l.title;
  $('next').hidden = true;
  $('hear').hidden = !!l.free;
  $('target').hidden = !!l.free;
  show('lesson');
  renderTarget();
  // Speak inside the tap: iOS blocks the first speech otherwise. Echo lessons play the first phrase right after.
  say(l.intro, undefined, l.phrases && playDemo);
}

function goHome() {
  current = null;
  $('title').textContent = 'Klavier mit Miau Miau';
  document.querySelectorAll('.goal').forEach((k) => k.classList.remove('goal'));
  show('home');
  renderHome();
  say('Such dir eine Lektion aus!');
}

function renderTarget() {
  const { notes, pos, phrase } = current;
  const letter = notes[pos];
  $('dots').className = `dots ${phrase?.beats ? 'beat' : ''} ${phrase?.touch ?? ''}`;
  $('dots').replaceChildren(...notes.map((n, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--note', `var(--${n})`);
    if (i < pos) li.classList.add('on');
    if (i === pos) li.classList.add('now');
    if (phrase?.touch === 'legato' && n === notes[i - 1]) li.classList.add('lift'); // gap before a repeated note
    const b = phrase?.beats?.[i];
    if (b) li.dataset.syl = b < 1 ? 'ti' : b > 1 ? 'ta-a' : 'ta';
    if (b < 1) li.classList.add('ti');
    return li;
  }));
  document.querySelectorAll('.goal').forEach((k) => k.classList.remove('goal'));
  if (!letter) return;
  $('target').style.setProperty('--note', `var(--${letter})`);
  $('t-note').textContent = letter;
  const hand = HAND[phrase?.hands?.[pos]];
  const finger = hand ? hand[letter] : FINGER[letter];
  $('t-finger').textContent = finger ? `${hand?.label ?? 'Finger'} ${finger}` : '';
  const key = keyFor(letter);
  document.querySelector(`.key[data-midi="${key}"]`)?.classList.add('goal');
  lookAtKey(key);
}

const praise = ['Ja!', 'Super!', 'Toll gemacht!', 'Miau-tastisch!', 'Schnurr-fekt!', 'Genau!'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const CLIP = { legato: 'schleichen', detached: 'huepfen' };
const GOOD = { legato: 'Schön geschlichen!', detached: 'Schön gehüpft!' };
const NEXT = { legato: 'Jetzt mit Bogen: schleichen!', detached: 'Jetzt ohne Bogen: hüpfen!' };
const MISS = { legato: 'Da war eine Lücke. Lass den Finger unten, bis der nächste drückt!', detached: 'Das war noch gebunden. Heb den Finger kurz hoch, wie beim Hüpfen!' };

function onNote(midi, linked) {
  if (!current) return say(`Das ist ein ${name(midi)}!`);
  if (LESSONS[current.index].free) { mood('happy', 700); return say(`Das ist ein ${name(midi)}!`); }
  const want = current.notes[current.pos];
  if (!want) return;
  const { beats, touch } = current.phrase;
  const strict = beats || touch; // rhythm and touch are judged over the whole phrase
  if (pitchClass(midi) !== NOTE_NAMES.indexOf(want)) {
    mood('hmm');
    if (strict && current.pos > 0) {
      enterPhrase(current.ph);
      renderTarget();
      return say(`Das war ein ${name(midi)}. Noch mal von vorne!`, [`Das war ein ${name(midi)}.`, 'Noch mal von vorne!']);
    }
    return say(`Das war ein ${name(midi)}. Finde das ${want}!`, [`Das war ein ${name(midi)}.`, `Finde das ${want}!`]);
  }
  current.times.push(performance.now());
  if (current.pos > 0) current.links.push(linked);
  current.pos++;
  if (current.pos < current.notes.length) {
    if (strict) return renderTarget(); // stay calm while she plays the phrase
    mood('happy', 600);
    react('ja');
    if (current.pos === 1 || current.notes[current.pos] !== want) $('bubble').textContent = pick(praise);
    return renderTarget();
  }
  renderTarget();
  // One slip in four is forgiven: the mic's gebunden guess is not perfect.
  const notes = current.notes;
  const judged = current.links.filter((_, k) => !(touch === 'legato' && notes[k + 1] === notes[k])); // links[k]: note k → k+1
  const touchMiss = touch && judged.filter((l) => l !== (touch === 'legato')).length > Math.floor(judged.length / 4);
  const rhythmMiss = beats && !rhythmOk(current.times, beats);
  if (rhythmMiss || touchMiss) {
    mood('hmm');
    enterPhrase(current.ph);
    renderTarget();
    const line = rhythmMiss ? 'Fast! Der Rhythmus war noch nicht ganz richtig. Hör noch mal zu.' : MISS[touch];
    return say(line, undefined, playDemo);
  }
  if (current.ph + 1 < current.phrases.length) {
    mood('happy', 1200);
    react(CLIP[touch] ?? 'klatschen');
    const good = GOOD[touch] ?? (beats ? 'Genau im Rhythmus!' : null);
    enterPhrase(current.ph + 1);
    renderTarget();
    const next = current.phrase.touch;
    const then = current.phrase.tip ?? (next && next !== touch ? NEXT[next] : null);
    const parts = [good, then].filter(Boolean);
    return say(parts.join(' '), parts, playDemo);
  }
  store.add(current.index);
  mood('happy', 2500);
  react('geschafft');
  confetti();
  meow();
  setTimeout(() => say('Geschafft! Du bekommst einen Stern!'), 600);
  $('next').hidden = current.index + 1 >= LESSONS.length;
}

function playDemo() {
  hush();
  if (!current?.notes.length) return;
  const { notes, phrase: { beats, touch } } = current;
  const beat = beats ? 0.6 : 0.5; // seconds per ta
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (touch) react(CLIP[touch]);
  let t = 0;
  notes.forEach((letter, i) => {
    const step = (beats?.[i] ?? 1) * beat;
    const lift = touch === 'detached' || (touch === 'legato' && notes[i + 1] === letter);
    const len = lift ? step * 0.4 : touch === 'legato' ? step + 0.15 : 0.6; // gap vs. overlap
    const midi = keyFor(letter);
    playTone(midi, t, len);
    setTimeout(() => {
      flash(midi);
      if (!still) $('dots').children[i]?.animate([{ scale: 1.5 }, { scale: 1 }], { duration: 250, easing: 'ease-out' });
    }, t * 1000);
    t += step;
  });
}

/* ---------------- Microphone ---------------- */
let micStream = null;

async function toggleMic() {
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
    $('mic').setAttribute('aria-pressed', 'false');
    cat.classList.remove('listening');
    $('mic-why').hidden = false;
    return say('Okay, ich höre nicht mehr zu.');
  }
  try {
    // Browser clean-up filters treat piano as noise, so turn them off.
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch {
    return say('Ich kann dich nicht hören. Frag einen Erwachsenen, ob er das Mikrofon erlaubt.');
  }
  const ac = audio();
  await ac.resume();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  ac.createMediaStreamSource(micStream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const feed = createNoteTracker();
  const touch = createTouchTracker();
  $('mic').setAttribute('aria-pressed', 'true');
  cat.classList.add('listening');
  $('mic-why').hidden = true;
  say('Ich höre zu! Spiel eine Taste auf deinem Klavier.');

  const stream = micStream;
  const timer = setInterval(() => {
    if (micStream !== stream) return clearInterval(timer);
    if (performance.now() < quietUntil || !voice.paused || window.speechSynthesis?.speaking) return feed(null, 0);
    analyser.getFloatTimeDomainData(buf);
    const level = rms(buf);
    const hz = level > 0.01 ? detectPitch(buf, ac.sampleRate) : null;
    const midi = hz && hz > 60 && hz < 1500 ? freqToMidi(hz) : null;
    const hit = feed(midi, level);
    const linked = touch(level, hit != null);
    if (hit != null) { flash(hit); onNote(hit, linked); }
  }, 50);
}

/* ---------------- Wire up ---------------- */
buildKeys();
renderHome();
$('back').addEventListener('click', goHome);
$('mic').addEventListener('click', toggleMic);
$('share').addEventListener('click', async () => {
  const { default: qrcode } = await import('./assets/qrcode.mjs');
  const qr = qrcode(0, 'M');
  qr.addData(location.origin + location.pathname); // drop query/hash so the phone gets a clean start
  qr.make();
  $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  $('share-dialog').showModal();
});
// Light-dismiss fallback for browsers without <dialog closedby> (Safari).
if (!('closedBy' in HTMLDialogElement.prototype)) {
  $('share-dialog').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) e.currentTarget.close();
  });
}
$('hear').addEventListener('click', playDemo);
$('next').addEventListener('click', () => startLesson(current.index + 1));
cat.addEventListener('click', () => {
  // Kuscheln clip carries its own purr, so keep the mic deaf while it plays.
  if (react('kuscheln')) quietUntil = Math.max(quietUntil, performance.now() + 2400);
  else meow();
  mood('happy', 800);
});
