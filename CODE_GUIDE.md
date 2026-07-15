# Code Guide

- `main.jsx`: starts the React application.
- `App.jsx`: defines page navigation with React Router.
- `Navbar.jsx`: navigation shared by all pages.
- `Hero.jsx`: main message and call-to-action.
- `UploadBox.jsx`: file picker and move to processing.
- `Comparison.jsx`: before-and-after placeholders.
- `Features.jsx`: three feature cards generated with `map()`.
- `HowItWorks.jsx`: upload, process and download steps.
- `Footer.jsx`: shared footer.
- `Landing.jsx`: combines landing page components.
- `Upload.jsx`: dedicated upload screen.
- `Processing.jsx`: simulated progress with state and effects.
- `Download.jsx`: download screen ready for backend URL.
- `About.jsx`: project description and FAQ.

The code intentionally avoids Redux, authentication and complicated state management.

## For the backend team

See `BACKEND_INTEGRATION.md` for exactly what needs to be built —
upload handling, processing status, the download endpoint, and the
expected data shapes. It replaces the fake example data that used to
be hard-coded in the UI.
