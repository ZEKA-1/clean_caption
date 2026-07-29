# CleanCaption

CleanCaption is a video moderation platform: users upload a video, the
system detects offensive language, replaces it with a beep, blurs the
speaker's mouth, and returns a cleaned version ready to download — no
account required.

This repository contains the **front-end** only, built with React.

## Features

- Drag-and-drop or manual video upload, with a live local preview
- Output quality selection (Original / 1080p / 720p / 480p)
- Processing screen with progress and estimated time remaining
- Download screen showing the user's actual uploaded video
- Local-only "recent videos" history (never sent to a server)
- Responsive navigation with a mobile menu
- Light/dark appearance follows the system theme automatically

## Privacy by design

Videos are never uploaded to any server by this front-end. The video
preview uses a temporary in-memory reference
(`src/utils/currentVideo.js`) that only exists while the tab is open.
The "recent videos" history (`src/utils/localHistory.js`) stores only
text (file name, quality, date) in the browser's `localStorage` — never
the video itself.

## Tech stack

- [React](https://react.dev) — UI components
- [React Router](https://reactrouter.com) — page navigation
- [Vite](https://vitejs.dev) — dev server and build tool
- [Lucide](https://lucide.dev) — icons
- Plain CSS with variables (no framework) — see `src/index.css`

## Getting started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Project structure

```
src/
  components/   Reusable pieces shared across pages
    Navbar.jsx, Footer.jsx, ScrollToTop.jsx
    Hero.jsx, Comparison.jsx, Features.jsx, HowItWorks.jsx
    UploadBox.jsx
  pages/        One file per screen
    Landing.jsx, Upload.jsx, Processing.jsx, Download.jsx, About.jsx
  utils/        Logic with no UI
    currentVideo.js   in-memory reference to the user's uploaded video
    localHistory.js   local-only "recent videos" list
  App.jsx       Routes (URL → page)
  main.jsx      React entry point
  index.css     All styling (CSS variables + dark theme override)
public/
  videos/       Demo clips used on the landing page (before/after, hero example)
```

## Routes

| URL | Page |
|---|---|
| `/` | Landing |
| `/upload` | Upload |
| `/processing` | Processing |
| `/download` | Download |
| `/about` | About / FAQ |

## Backend integration

This front-end currently simulates processing (a progress bar with no
real AI behind it) and shows the uploaded video as-is on the Download
page. See **`BACKEND_INTEGRATION.md`** for exactly what the backend
needs to provide — endpoints, expected data shapes, and where in the
code to plug them in.

## Documentation in this repo

- `BACKEND_INTEGRATION.md` — spec for the backend team
- `VIDEO_DEMO_GUIDE.md` — explains the demo video files
- `CODE_GUIDE.md` — quick file-by-file overview
- `EXPLICATION_CODE.md` — full line-by-line code walkthrough (French)

# CleanCaption Backend

A FastAPI backend implementing exactly what `BACKEND_INTEGRATION.md` in
the frontend repo asks for: upload a video, get back a version with
profane words beeped out and the speaker's mouth blurred at those
moments.

## How it works

```
POST /api/process              →  upload video, kick off a background job, get a jobId
GET  /api/process/{id}/status  →  { status, progress, message }  — poll this from /processing
DELETE /api/process/{id}       →  cancel a running job
GET  /api/process/{id}/result  →  { videoUrl, detections }       — call once status is "done"
```

Each upload runs through a pipeline (`app/pipeline/pipeline.py`):

1. **Extract audio** from the video (ffmpeg)
2. **Transcribe** it with word-level timestamps (`faster-whisper`, runs on CPU)
3. **Flag profanity** by matching transcribed words against a curated
   wordlist (`better-profanity`)
4. **Censor audio** — mute each flagged word's time range and layer a
   1kHz beep tone over it (ffmpeg filter graph)
5. **Censor video** — for frames inside a flagged interval, find the
   speaker's mouth with MediaPipe's Face Landmarker (Tasks API) and
   Gaussian-blur it
6. **Mux** the censored video + censored audio into the final MP4

Progress is reported at each stage so `/processing` shows real status
instead of the old fake `setInterval`.

## Running it

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The frontend's `fetch("/api/process", ...)` calls need to reach this
server — either proxy `/api` to `localhost:8000` in `vite.config.js`
during dev, or set `VITE_API_URL` and point `fetch` calls at it.

**First run needs internet access, twice:**
- `faster-whisper` downloads its speech model (~150MB) from Hugging
  Face the first time it transcribes something.
- MediaPipe's face landmark model (a few MB) downloads from Google's
  model repo the first time it blurs a mouth.

Both are cached to disk after that first download, so only the very
first processed video needs internet — everything after runs offline.
If your machine is behind a restrictive firewall/proxy, make sure it
can reach `huggingface.co` and `storage.googleapis.com`.

## What I verified in this sandbox

This sandbox's network is locked down to a small allowlist that
doesn't include Hugging Face or Google's model storage, so I couldn't
download either model here — but I ran every other stage against one
of your own demo clips (`public/videos/before.mp4`) end-to-end: audio
extraction, muting + beep overlay, and the final mux all completed
successfully and produced a valid MP4 with both a video and audio
track. The mouth-blur code itself is straightforward MediaPipe Tasks
API usage (`FaceLandmarker.detect_for_video`) — the same pattern used
in MediaPipe's own official examples — but the actual model download
+ inference needs to happen on a machine with normal internet access.

## Notes / things to decide before production

- **Job store is in-memory** (`app/jobs.py`). Fine for a single
  instance; swap for Redis + a real task queue (Celery/RQ/Arq) if you
  need multiple backend workers.
- **`quality` param** is accepted from the upload form but not yet
  wired to actual downscaling — add an ffmpeg `-vf scale=...` pass if
  you want 1080p/720p/480p to actually resize the output.
- **Profanity wordlist** is `better-profanity`'s default English list.
  Swap in your own via `profanity.load_censor_words([...])` in
  `app/pipeline/profanity.py` if you need different coverage.
- **CORS** is wide open (`allow_origins=["*"]`) for easy local dev —
  lock this down to your real frontend origin before deploying.
- **Whisper model size** is `"base"` (good speed/accuracy balance on
  CPU). Bump to `"small"` or `"medium"` in `transcribe.py` for better
  accuracy if you have the compute budget.