# Learning stages

What Miau Miau teaches, in order. Stages 1–3 are in the app; 4–6 are the draft for what comes next.

Each stage adds **one** new idea and reuses what she already knows: new rhythms come on the C she can already find, and gebunden/ungebunden come on the five-finger position she already knows. Songs come last in every stage, as the reward.

## 1. Where the keys are (built)

Lessons 0–7: Freies Spiel, Finde das C, C D E, Fünf Pfoten, then four songs with every note the same length.

## 2. Ti-ti-ta: rhythm (built)

Rhythm syllables as in Kodály teaching: **Ta** is one beat (quarter note), **Ti-ti** is two half beats (two eighth notes). She hears the pattern first, then plays it back like an echo.

| Lesson | What she plays | New idea |
|---|---|---|
| Ta Ta Ta | `ta ta ta ta` on C, then on C D E F | a steady beat, "like a clock" |
| Ti-ti und Ta | `ta ta ti-ti ta`, `ti-ti ta ti-ti ta`, `ti-ti ti-ti ta ta` on C | two quick notes in one beat |
| Rhythmus-Echo | three short patterns on C, D, E, F, G | rhythm and pitch together |
| Hänschen klein im Rhythmus | the song she knows, now in its real rhythm | the reward |

On screen: a big dot is Ta, a small dot is Ti, with the syllable written underneath. During the demo, each dot pulses as its note plays. Miau Miau claps (new clip) after each correct phrase.

How it's judged: only the gaps between note starts are measured, against whatever tempo she chose, and each gap may be off by 35%. A phrase never ends on a Ti, because the last note's length can't be heard.

## 3. Gebunden und ungebunden: legato and detached (built)

| Lesson | What she plays | Picture |
|---|---|---|
| Schleichkatze | C D E F G and back, **gebunden**: the next key goes down before the last comes up | a cat sneaking (new clip), a slur (Bogen) over the dots |
| Hüpfkatze | the same, **ungebunden**: lift each finger before the next key | a cat hopping (new clip), dots spread apart |
| Schleichen und Hüpfen | phrases switch between the two | "Bogen = schleichen, kein Bogen = hüpfen" |

How it's judged:
- **On-screen keys:** another finger still on a key when the next goes down = gebunden. A mouse can only play ungebunden; a touch screen does both.
- **Real piano (mic):** if the sound dropped below 20% of the last note's peak before the next note, the finger came up early. One slip in four is forgiven. **This threshold is a first guess and needs tuning on her piano** (`dip` in `createTouchTracker`, `pitch.js`). The sustain pedal makes everything sound gebunden, so keep it off.

## 4. Ta-a and the pause (draft)

- **Ta-a** (half note, 2 beats): "Ta-a, hold it". `parseBeat` already understands `ta-a`. A held note is only measured when another note follows it, so the patterns need Ta-a in the middle (`ta ta-a ta`), not at the end.
- **Pause "Sch"** (quarter rest): a beat with no note. This needs a rest token in `beat` (for example `sch`) that adds time without expecting a note.
- Song: Alle meine Entchen in its real rhythm (`ta ta ta ta ta-a ta-a`).
- New clips: the kitten holding a long note (eyes closed, swaying), and the kitten with a paw on its lips for "Sch".

## 5. Laut und leise: forte and piano (draft)

- "Löwe" (loud) and "Maus" (quiet). The mic already measures loudness (`rms`). The levels need calibrating per piano and room: a first "play your loudest, now your quietest" step stores her own range.
- New clips: the kitten roaring like a little lion, and the kitten tiptoeing like a mouse.

## 6. Both hands (draft)

- Left-hand thumb on the C below, five-finger position in the bass. The mic already hears the low notes (60–1500 Hz covers it), but the on-screen keyboard has one octave, so it needs a second octave or a switch.
- Then simple songs with a held bass note under the melody.

## Assets per stage

Voice lines: Tilly Bramble (ElevenLabs v4 via Magnific), see the README. Kitten clips: Seedance 2.5, 4 s, 1:1, with the kitten's front-facing frame as both start and end frame, so every clip blends back into the turning kitten.

| Stage | Voice lines | Clips |
|---|---|---|
| 2 | 4 intros, "Genau im Rhythmus!", "Fast! …", "Noch mal von vorne!" | klatschen |
| 3 | 3 intros, praise and corrections for each touch, the "Bogen" announcements | schleichen, hüpfen |
| 4–6 | about 6 lines each | about 2 each |
