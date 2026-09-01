const trimTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

const safeApiBase = (value) => {
    const normalized = trimTrailingSlash(value);
    if (!normalized) return "";
    if (/^\/[A-Za-z0-9/_-]*$/.test(normalized) && !normalized.startsWith("//")) return normalized;
    try {
        const url = new URL(normalized);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new Error("unsafe API URL");
        if (import.meta.env.PROD && url.protocol !== "https:") throw new Error("production API URL must use HTTPS");
        return normalized;
    } catch {
        throw new Error("VITE_API_URL must be a same-origin path or an HTTP(S) URL without credentials");
    }
};

const safeMediaOrigin = (value) => {
    const normalized = trimTrailingSlash(value);
    if (!normalized) return "";
    try {
        const url = new URL(normalized);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.origin !== normalized) throw new Error("unsafe media origin");
        if (import.meta.env.PROD && url.protocol !== "https:") throw new Error("production media origin must use HTTPS");
        return normalized;
    } catch {
        throw new Error("VITE_MEDIA_URL must be an explicit HTTP(S) origin without credentials");
    }
};

const configuredApi = safeApiBase(import.meta.env.VITE_API_URL);

export const API_BASE_URL = configuredApi || (import.meta.env.PROD ? "/api" : "http://localhost:5050/api");

const inferredMediaOrigin = API_BASE_URL.startsWith("http") ? new URL(API_BASE_URL).origin : "";
export const MEDIA_ORIGIN = safeMediaOrigin(import.meta.env.VITE_MEDIA_URL) || inferredMediaOrigin;

export const mediaUrl = (path) => path ? `${MEDIA_ORIGIN}${path}` : "";
