<img src="assets/icon.svg" width="64" height="64" alt="">

# Klavier mit Miau Miau

A piano app (in German) for a 6-year-old. Miau Miau the cat watches the screen, speaks each instruction aloud, listens to a real piano through the microphone, and cheers when the right key is played.

- Works on phone and desktop in the browser, and can be installed to the home screen.
- Pitch detection runs on the device. No audio is recorded or sent anywhere.
- Lessons: Freies Spiel, Finde das C, C D E, Fünf Pfoten, then Hänschen klein, Alle meine Entchen, Funkel funkel kleiner Stern and Ode an die Freude, and Gespräch in der Höhle (black keys, bear = left hand, bird = right hand). Then rhythm with Ti-ti-ta (Ta Ta Ta, Ti-ti und Ta, Rhythmus-Echo, Hänschen klein im Rhythmus) and gebunden vs. ungebunden (Schleichkatze, Hüpfkatze, Schleichen und Hüpfen). Notes use German names (H, not B). The plan for these and later stages is in [docs/stages.md](docs/stages.md).
- No microphone? Tap the on-screen keys instead.
- On a desktop, the 📱 button shows a QR code to open the app on a phone.

## Run

```sh
npm start        # http://localhost:5173 (the desktop mic works on localhost)
npm test         # pitch detection tests
```

## The kitten

Put a short clip at `assets/kitten.mp4` of a kitten turning its head from looking left to looking right, with a still camera and a plain background. The kitten scrubs through it to follow the finger or mouse. Without the clip, a drawn cat is shown instead. If the turn happens partway through the clip, set `data-left` and `data-right` (in seconds) on the `<video>` in `index.html`.

Re-encode so every frame is a keyframe, otherwise scrubbing stutters on phones:

```sh
ffmpeg -i in.mp4 -an -c:v libx264 -g 1 -crf 26 -pix_fmt yuv420p -vf scale=960:-2 -movflags +faststart assets/kitten.mp4
```

Short reaction clips play over the turning kitten and then fade back to it: `assets/kitten-ja.mp4` on each correct note, `assets/kitten-geschafft.mp4` when a lesson is finished, `assets/kitten-kuscheln.mp4` (with a purr) when she taps the kitten, `assets/kitten-klatschen.mp4` after a correct rhythm phrase, and `assets/kitten-schleichen.mp4` / `assets/kitten-huepfen.mp4` for gebunden / ungebunden. Each one starts and ends facing the front. They play straight through, so they need no keyframe re-encode.

## The voice

Every line Miau Miau says is a recorded clip in `assets/voice/`. The file name comes from the text through `clipName()` in `pitch.js` ("Das ist ein Cis!" becomes `das-ist-ein-cis.mp3`). "Das war ein X. Finde das Y!" is played as two clips. If a clip is missing, the device's built-in voice reads the line instead, so a new or changed line still works before its clip exists.

To add or change a line, generate it with ElevenLabs v4, voice "Tilly Bramble" (via Magnific), with the text prefixed by `[cheerful, playful, cute little kitten voice]`. Then trim the silence and save it under its `clipName()`:

```sh
T='silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05'
ffmpeg -i in.mp3 -af "$T,areverse,$T,areverse" -ac 1 -b:a 64k assets/voice/<clip-name>.mp3
```

Scrubbing needs a server that supports HTTP range requests (`npm start`, GitHub Pages and Netlify all do).

On a phone, the mic only works over HTTPS, so host the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages). There is no build step.
