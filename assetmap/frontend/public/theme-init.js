// IIFE — no dependencies, runs synchronously before React
(function() {
  try {
    // 1. Check localStorage for Zustand-persisted theme
    var raw = localStorage.getItem('assetmap-theme');
    var stored = null;
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        stored = parsed.state && parsed.state.mode;
      } catch {
        // Not JSON — treat as raw string
        stored = raw;
      }
    }

    // 2. Check system preference
    var prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 3. Determine active theme
    var theme;
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    } else if (stored === 'system' || !stored) {
      theme = prefersDark ? 'dark' : 'light';
    } else {
      theme = 'light';
    }

    // 4. Apply to <html> BEFORE render
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);

    // 5. Store resolved theme for React to read
    window.__INITIAL_THEME__ = theme;
  } catch {
    // localStorage blocked — default to light
    document.documentElement.setAttribute('data-theme', 'light');
    window.__INITIAL_THEME__ = 'light';
  }
})();
