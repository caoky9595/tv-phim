// Watch history & continue-watching stored in localStorage
const Store = (() => {
  const HISTORY_KEY = 'tv_watch_history';
  const MAX_HISTORY = 30;

  function load() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
    catch { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(data)); }
    catch {}
  }

  return {
    // Save progress: { slug, name, thumb, episode, serverIdx, epIdx, currentTime, duration, timestamp }
    saveProgress(slug, info) {
      const data = load();
      data[slug] = { ...info, slug, updatedAt: Date.now() };
      save(data);
    },

    getProgress(slug) {
      return load()[slug] || null;
    },

    // Remove single entry
    removeProgress(slug) {
      const data = load();
      delete data[slug];
      save(data);
    },

    // Get all, sorted by most recent
    getContinueWatching() {
      const data = load();
      return Object.values(data)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_HISTORY);
    },

    // Mark episode as watched
    markWatched(slug, epKey) {
      const data = load();
      if (!data[slug]) data[slug] = { slug };
      if (!data[slug].watched) data[slug].watched = {};
      data[slug].watched[epKey] = true;
      save(data);
    },

    isWatched(slug, epKey) {
      const data = load();
      return !!(data[slug]?.watched?.[epKey]);
    },

    clearAll() {
      localStorage.removeItem(HISTORY_KEY);
    }
  };
})();
