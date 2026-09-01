export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(value) {
    const v = value.trim();
    if (!v) return "Name is required";
    if (v.length < 2) return "Name must be at least 2 characters";
    if (v.length > 80) return "Name cannot exceed 80 characters";
    return "";
}

export function validateEmail(value) {
    const v = value.trim();
    if (!v) return "Email is required";
    if (v.length > 150) return "Email cannot exceed 150 characters";
    if (!EMAIL_REGEX.test(v)) return "Enter a valid email address";
    return "";
}

export const passwordChecks = (value) => ({
    length: value.length >= 8 && value.length <= 72 && new TextEncoder().encode(value).length <= 72,
    letter: /[A-Za-z]/.test(value),
    number: /\d/.test(value),
    content: value.trim().length > 0
});

export function validatePassword(value) {
    if (!value) return "Password is required";
    const checks = passwordChecks(value);
    if (!Object.values(checks).every(Boolean)) return "Password must be 8-72 characters and include a letter and a number";
    return "";
}

export function validatePasswordConfirmation(password, confirmation) {
    if (!confirmation) return "Confirm your password";
    if (password !== confirmation) return "Passwords do not match";
    return "";
}

export function validatePortfolioTitle(value) {
    const v = value.trim();
    if (!v) return "Portfolio title is required";
    if (v.length < 2) return "Portfolio title must be at least 2 characters";
    if (v.length > 100) return "Portfolio title cannot exceed 100 characters";
    return "";
}

export function validateWorkTitle(value) {
    const v = value.trim();
    if (!v) return "Work title is required";
    if (v.length < 2) return "Work title must be at least 2 characters";
    if (v.length > 120) return "Work title cannot exceed 120 characters";
    return "";
}

export function validateYear(value) {
    const v = String(value ?? "").trim();
    if (!v) return "";
    if (!/^\d+$/.test(v)) return "Enter a year using numbers only";
    const year = Number(v);
    if (year < 1800) return "Year must be 1800 or later";
    if (year > new Date().getFullYear()) return "Year cannot be in the future";
    return "";
}

export function validateOptionalText(value, { label = "This field", max, min = 0 } = {}) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (text.length < min) return `${label} must be at least ${min} characters`;
    if (text.length > max) return `${label} cannot exceed ${max} characters`;
    return "";
}

export function validateOptionalUrl(value, label = "URL") {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (text.length > 300) return `${label} cannot exceed 300 characters`;
    try {
        const parsed = new URL(text);
        if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error("Invalid URL");
    } catch {
        return `${label} must use http:// or https://`;
    }
    return "";
}

export function validateCategory(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (text.length < 2) return "Category must be at least 2 characters";
    if (text.length > 60) return "Category cannot exceed 60 characters";
    return "";
}

export function validatePhone(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (!/^[+()\-\s.0-9]{7,25}$/.test(text)) return "Enter a valid phone number";
    return "";
}

export function validateSubject(value) {
    const text = String(value ?? "").trim();
    if (!text) return "Subject is required";
    if (text.length < 2) return "Subject must be at least 2 characters";
    if (text.length > 120) return "Subject cannot exceed 120 characters";
    return "";
}

export function validateMessage(value) {
    const text = String(value ?? "").trim();
    if (!text) return "Message is required";
    if (text.length < 10) return "Message must be at least 10 characters";
    if (text.length > 2000) return "Message cannot exceed 2000 characters";
    return "";
}

export function validateTags(value) {
    const tags = String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    if (tags.length > 10) return "Use no more than 10 tags";
    if (tags.some((tag) => tag.length > 30)) return "Each tag must be 30 characters or fewer";
    if (new Set(tags.map((tag) => tag.toLocaleLowerCase("en-US"))).size !== tags.length) return "Remove duplicate tags";
    return "";
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, "mp4", "webm", "mov", "m4v"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

function extension(file) {
    return file?.name?.split(".").pop()?.toLowerCase() || "";
}

export function validateImage(file) {
    if (!file) return "Please choose an image";
    if (!IMAGE_EXTENSIONS.includes(extension(file))) return "Use JPG, JPEG, PNG or WebP";
    if (!IMAGE_MIME_TYPES.includes(file.type)) return "The selected file is not a supported image";
    if (file.size <= 0) return "The selected file is empty";
    if (file.size > 5 * 1024 * 1024) return "Image must be 5 MB or smaller";
    return "";
}

export function validateMedia(file) {
    if (!file) return "Please choose an image or video";
    if (!MEDIA_EXTENSIONS.includes(extension(file))) return "Use MP4, WebM, MOV, M4V, JPG, PNG or WebP";
    const imageExtension = IMAGE_EXTENSIONS.includes(extension(file));
    const allowedMimeTypes = imageExtension ? IMAGE_MIME_TYPES : VIDEO_MIME_TYPES;
    if (!allowedMimeTypes.includes(file.type)) return "The file extension and media type do not match";
    if (file.size <= 0) return "The selected file is empty";
    if (file.size > 200 * 1024 * 1024) return "Media must be 200 MB or smaller";
    return "";
}

export function apiFieldErrors(error) {
    const errors = error?.response?.data?.errors;
    return errors && typeof errors === "object" && !Array.isArray(errors) ? errors : {};
}

export function formatFileSize(bytes = 0) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
