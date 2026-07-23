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
