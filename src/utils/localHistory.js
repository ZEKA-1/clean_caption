// Small "recently processed" list, stored in localStorage. Nothing here
// gets sent to a server — just filenames and dates, kept on the device.

const STORAGE_KEY = "cleanCaptionHistory";
const MAX_ENTRIES = 8;

export function getLocalHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLocalHistoryEntry({ name, quality }) {
  const current = getLocalHistory();
  const entry = {
    name,
    quality,
    date: new Date().toISOString(),
  };
  const updated = [entry, ...current].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearLocalHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
