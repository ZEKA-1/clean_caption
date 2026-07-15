// Keeps the selected video in memory so Download can show it later.
// Not localStorage, not sessionStorage, not written to disk — just a
// variable that lives here while the tab is open.

let currentFile = null;
let currentUrl = null;

export function setCurrentVideo(file) {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentFile = file;
  currentUrl = file ? URL.createObjectURL(file) : null;
}

export function getCurrentVideoUrl() {
  return currentUrl;
}

export function getCurrentVideoFile() {
  return currentFile;
}

export function clearCurrentVideo() {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentFile = null;
  currentUrl = null;
}
