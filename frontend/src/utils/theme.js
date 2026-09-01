export const THEME_STORAGE_KEY = "wcase-theme";
export const THEME_PREFERENCE_VERSION = 1;
export const DEFAULT_THEME = "default";
export const THEMES = new Set([DEFAULT_THEME, "space"]);

export function readExplicitThemePreference() {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (!raw) return DEFAULT_THEME;
        const saved = JSON.parse(raw);
        if (saved?.version === THEME_PREFERENCE_VERSION && saved?.explicit === true && THEMES.has(saved.theme)) return saved.theme;
        localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
        try { localStorage.removeItem(THEME_STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    }
    return DEFAULT_THEME;
}

export function saveExplicitThemePreference(theme) {
    if (!THEMES.has(theme)) return false;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ version: THEME_PREFERENCE_VERSION, explicit: true, theme }));
        return true;
    } catch {
        return false;
    }
}

export function applyTheme(theme) {
    const safeTheme = THEMES.has(theme) ? theme : DEFAULT_THEME;
    document.documentElement.dataset.theme = safeTheme;
    document.documentElement.style.colorScheme = safeTheme === "space" ? "dark" : "light";
    return safeTheme;
}
