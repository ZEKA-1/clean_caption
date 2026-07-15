# Demonstration videos

There are two independent, unrelated groups of demo videos — none of
them share a file, so changing one never accidentally changes another.

**Landing page "See the difference" comparison** (`src/components/Comparison.jsx`):
- `public/videos/before.mp4`
- `public/videos/after.mp4`

**Landing page Hero example preview** (`src/components/Hero.jsx`):
- `public/videos/hero-example.mp4` — a generic "this is what a result
  looks like" illustration, intentionally separate from the before/after
  comparison above so the two sections stay independent.

## The Download page shows the real uploaded video instead

`src/pages/Download.jsx` does **not** use any of the files above. It
shows the actual video the user selected on the Upload screen, kept in
memory via `src/utils/currentVideo.js` (a temporary browser reference,
nothing written to disk or sent anywhere).

Right now there's no real backend, so the video shown on Download is
exactly the file as uploaded — no beep/blur has actually been applied
yet. Once the backend exists, replace the video source in
`Download.jsx` with the real processed video URL returned by the API.

To use your own demo videos later, replace the MP4 files above while
keeping the same file names, or update the `src` paths in the
corresponding components.
