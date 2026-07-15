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