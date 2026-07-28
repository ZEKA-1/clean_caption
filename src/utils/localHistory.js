const HISTORY_KEY = "cleanCaptionHistory";
const MAX_HISTORY_ITEMS = 3;

export function getLocalHistory() {
  const savedHistory = localStorage.getItem(HISTORY_KEY);

  if (!savedHistory) {
    return [];
  }

  try {
    const history = JSON.parse(savedHistory);

    if (!Array.isArray(history)) {
      return [];
    }

    // Always keep only the latest 3 videos.
    const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    // Clean old extra items from localStorage.
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));

    return limitedHistory;
  } catch {
    return [];
  }
}

export function addLocalHistoryEntry(entry) {
  const currentHistory = getLocalHistory();

  const newEntry = {
    name: entry.name,
    quality: entry.quality,
    date: new Date().toISOString(),
  };

  const updatedHistory = [newEntry, ...currentHistory].slice(
    0,
    MAX_HISTORY_ITEMS
  );

  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
}

export function clearLocalHistory() {
  localStorage.removeItem(HISTORY_KEY);
}