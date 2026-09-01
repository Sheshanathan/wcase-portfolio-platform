const recentNotifications = new Map();
const listeners = new Set();
const DEDUPE_WINDOW_MS = 10000;
let notificationSequence = 0;

export function subscribeToNotifications(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function notify(type, message, options = {}) {
    if (!message) return;
    const normalizedMessage = String(message).trim();
    if (!normalizedMessage) return;
    const now = Date.now();
    const fingerprint = `${type}:${normalizedMessage}`;
    const lastShown = recentNotifications.get(fingerprint) || 0;
    if (now - lastShown < DEDUPE_WINDOW_MS) return;

    recentNotifications.set(fingerprint, now);
    const notification = {
        id: ++notificationSequence,
        type: ["success", "error", "warning", "info"].includes(type) ? type : "info",
        message: normalizedMessage,
        autoClose: options.autoClose ?? 3500
    };
    listeners.forEach((listener) => listener(notification));
    window.setTimeout(() => {
        if (recentNotifications.get(fingerprint) === now) recentNotifications.delete(fingerprint);
    }, DEDUPE_WINDOW_MS);
}
