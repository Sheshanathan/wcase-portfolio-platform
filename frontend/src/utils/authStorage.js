const TOKEN_KEY = "token";
const USER_KEY = "user";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return "";
    if (!TOKEN_PATTERN.test(token)) { clearSession(); return ""; }
    return token;
}

export function getStoredUser() {
    try {
        const value = JSON.parse(localStorage.getItem(USER_KEY) || "null");
        if (!value || typeof value !== "object" || typeof value.name !== "string" || typeof value.email !== "string") return null;
        return value;
    } catch {
        localStorage.removeItem(USER_KEY);
        return null;
    }
}

export function storeSession(token, user) {
    if (!TOKEN_PATTERN.test(String(token || "")) || !user || typeof user !== "object") throw new Error("Invalid authentication response");
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function storeUser(user) {
    if (user && typeof user === "object") localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function signalExpiredSession() {
    window.dispatchEvent(new CustomEvent("wcase:session-expired"));
}
