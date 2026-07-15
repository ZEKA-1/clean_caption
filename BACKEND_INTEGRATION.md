# Backend Integration Guide

This document replaces the simulated/fake data that used to live inside
the frontend components. Instead of guessing from example UI, here is
exactly what the backend needs to provide.

## 1. Upload → send the video

**Where:** `src/components/UploadBox.jsx`, function `startProcessing()`

Currently this just stores the file name/quality in `sessionStorage`
and navigates to `/processing`. Replace it with an actual upload:

```js
const formData = new FormData();
formData.append("video", file);
formData.append("quality", quality);

const response = await fetch("/api/process", {
  method: "POST",
  body: formData,
});
const { jobId } = await response.json();
```

Keep the `jobId` (e.g. in `sessionStorage` or the `currentVideo.js`
store) so the Processing page can check on it.

## 2. Processing → real progress and errors

**Where:** `src/pages/Processing.jsx`

Right now the progress bar is a fake `setInterval` counting up to 100.
Replace it with either:
- Polling an endpoint like `GET /api/process/:jobId/status` every couple
  of seconds, returning something like `{ progress: 42, status: "running" }`
- Or a WebSocket/SSE connection pushing progress updates

**Two states the UI must support** (the error state was removed from
the demo code, but the backend WILL need to report failures):
- `status: "done"` → redirect to `/download`
- `status: "error"` → show an error message and a way to retry

**Cancel button:** already wired to navigate back to `/upload`. It
should also call something like `DELETE /api/process/:jobId` so the
backend actually stops the job.

## 3. Download → the real processed video and detection data

**Where:** `src/pages/Download.jsx`

Currently shows the video exactly as uploaded (no real processing).
Once the backend returns a processed video URL, use that instead of
`getCurrentVideoUrl()`.

**Detection details** (previously shown as a hard-coded example, now
removed from the UI) — if the API returns this data, a reasonable shape
would be:

```json
{
  "detections": [
    { "time": "0:04", "word": "s***" },
    { "time": "0:11", "word": "p*****" }
  ]
}
```

Each entry marks a moment where a word was beeped/blurred. The frontend
can re-add a list like this once real data is available — see git
history or ask the frontend team if you want the old example UI back
as a starting point.

## 4. Local-only history — no backend needed here

`src/utils/localHistory.js` intentionally stays client-side
(`localStorage`). Don't build a server endpoint for this — it's a
deliberate privacy choice (see `VIDEO_DEMO_GUIDE.md` / project FAQ):
videos and their history never leave the user's device.
