<img src="assets/icon.svg" width="64" height="64" alt="">

# Klavier mit Miau Miau

A piano app (in German) for a 6-year-old. Miau Miau the cat watches the screen, speaks each instruction aloud, listens to a real piano through the microphone, and cheers when the right key is played.

- Works on phone and desktop in the browser, and can be installed to the home screen.
- Pitch detection runs on the device. No audio is recorded or sent anywhere.
- Lessons: Freies Spiel, Finde das C, C D E, Fünf Pfoten, then Hänschen klein, Alle meine Entchen, Funkel funkel kleiner Stern and Ode an die Freude. Notes use German names (H, not B).
- No microphone? Tap the on-screen keys instead.

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

Scrubbing needs a server that supports HTTP range requests (`npm start`, GitHub Pages and Netlify all do).

On a phone, the mic only works over HTTPS, so host the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages). There is no build step.
