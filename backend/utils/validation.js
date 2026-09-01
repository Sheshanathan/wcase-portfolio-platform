const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^[+()\-\s.0-9]{7,25}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const CONTROL_CHARACTER_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const RESERVED_SLUGS = new Set(["admin", "login", "register", "dashboard", "api", "uploads", "support", "terms", "privacy", "forgot-password", "reset-password"]);
const WORK_CATEGORIES = ["Weddings", "Events", "Commercial", "Travel", "Reels", "Photography", "Corporate", "Other"];
const REPORT_REASONS = ["inappropriate content", "copyright concern", "spam", "other"];

const isPlainObject = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const cleanText = (value, max = 1000) => {
    if (typeof value !== "string" || CONTROL_CHARACTER_REGEX.test(value)) return null;
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max + 1) : trimmed;
};
const normalizeEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (value) => typeof value === "string" && value.length <= 150 && EMAIL_REGEX.test(value);
const validPassword = (value) => {
    if (typeof value !== "string" || value.length < 8 || value.length > 72 || value.trim().length === 0) return false;
    if (Buffer.byteLength(value, "utf8") > 72) return false;
    return /[A-Za-z]/.test(value) && /\d/.test(value);
};
const validLoginPassword = (value) => typeof value === "string" && value.length > 0 && value.length <= 100 && Buffer.byteLength(value, "utf8") <= 100;
const validUrl = (value) => {
    if (!value) return true;
    if (typeof value !== "string" || value.length > 300) return false;
    try { const parsed = new URL(value); return ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.hostname); } catch { return false; }
};
const validPhone = (value) => !value || (typeof value === "string" && PHONE_REGEX.test(value));
const validObjectId = (value) => typeof value === "string" && OBJECT_ID_REGEX.test(value);
const validSlug = (value) => typeof value === "string" && value.length >= 3 && value.length <= 60 && SLUG_REGEX.test(value) && !RESERVED_SLUGS.has(value);
const validCategory = (value, { optional = true } = {}) => {
    if (value === "") return optional;
    const category = cleanText(value, 60);
    return category !== null && category.length >= 2 && category.length <= 60;
};

const hasOnlyKeys = (value, allowedKeys) => {
    if (!isPlainObject(value)) return false;
    const allowed = allowedKeys instanceof Set ? allowedKeys : new Set(allowedKeys);
    return Object.keys(value).every((key) => allowed.has(key));
};

const findUnsafeInput = (value, depth = 0) => {
    if (depth > 12) return "Request nesting is too deep";
    if (Array.isArray(value)) {
        if (value.length > 500) return "Request contains too many values";
        for (const item of value) { const error = findUnsafeInput(item, depth + 1); if (error) return error; }
        return "";
    }
    if (!value || typeof value !== "object") return "";
    if (!isPlainObject(value)) return "Invalid request object";
    for (const [key, item] of Object.entries(value)) {
        if (UNSAFE_KEYS.has(key) || key.startsWith("$") || key.includes(".")) return "Unsafe request field";
        const error = findUnsafeInput(item, depth + 1);
        if (error) return error;
    }
    return "";
};

const parsePagination = (query, { defaultLimit = 12, maxLimit = 24 } = {}) => {
    if (!isPlainObject(query) || !hasOnlyKeys(query, ["page", "limit", "category"])) return { error: "Invalid query parameters" };
    const parseInteger = (value, fallback, maximum) => {
        if (value === undefined || value === "") return fallback;
        if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return null;
        const number = Number(value);
        return Number.isSafeInteger(number) && number <= maximum ? number : null;
    };
    const page = parseInteger(query.page, 1, 100000);
    const limit = parseInteger(query.limit, defaultLimit, maxLimit);
    if (page === null || limit === null) return { error: "Page and limit must be valid positive numbers" };
    const category = query.category === undefined ? "" : cleanText(query.category, 60);
    if (category === null || !validCategory(category)) return { error: "Invalid category filter" };
    return { page, limit, category };
};

const fieldError = (res, field, message, status = 400) => res.status(status).json({ success: false, message, errors: { [field]: message } });

module.exports = { WORK_CATEGORIES, REPORT_REASONS, RESERVED_SLUGS, cleanText, normalizeEmail, validEmail, validPassword, validLoginPassword, validUrl, validPhone, validObjectId, validSlug, validCategory, isPlainObject, hasOnlyKeys, findUnsafeInput, parsePagination, fieldError };
