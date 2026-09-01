(() => {
  try {
    const raw = localStorage.getItem("wcase-theme");
    const saved = raw ? JSON.parse(raw) : null;
    const valid = saved?.version === 1 && saved?.explicit === true && ["default", "space"].includes(saved.theme);
    const theme = valid ? saved.theme : "default";
    if (raw && !valid) localStorage.removeItem("wcase-theme");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "space" ? "dark" : "light";
  } catch {
    try { localStorage.removeItem("wcase-theme"); } catch { /* Storage may be unavailable. */ }
    document.documentElement.dataset.theme = "default";
    document.documentElement.style.colorScheme = "light";
  }
})();
