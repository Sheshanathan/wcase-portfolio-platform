const jwt = require("jsonwebtoken");

const parseOrigins = () => (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

const validHttpOrigin = (value) => {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && url.origin === value;
    } catch {
        return false;
    }
};

const validateEnvironment = () => {
    const errors = [];
    const production = process.env.NODE_ENV === "production";
    if (process.env.NODE_ENV && !["development", "test", "production"].includes(process.env.NODE_ENV)) errors.push("NODE_ENV must be development, test or production");
    if (!process.env.MONGO_URI || !/^mongodb(?:\+srv)?:\/\//.test(process.env.MONGO_URI)) errors.push("MONGO_URI must be a valid MongoDB connection string");
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) errors.push("JWT_SECRET must contain at least 32 characters");
    if (process.env.OTP_HASH_SECRET && process.env.OTP_HASH_SECRET.length < 32) errors.push("OTP_HASH_SECRET must contain at least 32 characters");
    if (process.env.MEDIA_SIGNING_SECRET && process.env.MEDIA_SIGNING_SECRET.length < 32) errors.push("MEDIA_SIGNING_SECRET must contain at least 32 characters");
    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
    try { jwt.sign({ check: true }, "x".repeat(32), { expiresIn }); } catch { errors.push("JWT_EXPIRES_IN is invalid"); }

    const origins = parseOrigins();
    if (!origins.length || origins.some((origin) => origin === "*" || !validHttpOrigin(origin))) errors.push("CORS_ORIGINS must contain explicit HTTP(S) origins");
    if (production && !process.env.CORS_ORIGINS) errors.push("CORS_ORIGINS is required in production");
    if (production && origins.some((origin) => /:\/\/(localhost|127\.0\.0\.1)(:|$)/i.test(origin))) errors.push("CORS_ORIGINS cannot contain localhost in production");
    if (production && origins.some((origin) => !origin.startsWith("https://"))) errors.push("CORS_ORIGINS must use HTTPS in production");
    if (production && (!process.env.FRONTEND_URL || !validHttpOrigin(process.env.FRONTEND_URL.replace(/\/$/, "")) || !process.env.FRONTEND_URL.startsWith("https://"))) errors.push("FRONTEND_URL must be an explicit HTTPS origin in production");
    if (production && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) errors.push("EMAIL_USER and EMAIL_PASS are required in production");
    if (production && process.env.EMAIL_USER && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(process.env.EMAIL_USER)) errors.push("EMAIL_USER must be a valid email address");
    if (production && process.env.EMAIL_PASS && process.env.EMAIL_PASS.length < 8) errors.push("EMAIL_PASS must contain at least 8 characters");
    if (production && (!process.env.OTP_HASH_SECRET || !process.env.MEDIA_SIGNING_SECRET)) errors.push("OTP_HASH_SECRET and MEDIA_SIGNING_SECRET are required separately in production");
    const secrets = [process.env.JWT_SECRET, process.env.OTP_HASH_SECRET, process.env.MEDIA_SIGNING_SECRET].filter(Boolean);
    if (production && new Set(secrets).size !== secrets.length) errors.push("JWT_SECRET, OTP_HASH_SECRET and MEDIA_SIGNING_SECRET must be different values");
    if (production && secrets.some((value) => /replace|change.?me|your[-_ ]/i.test(value))) errors.push("Production secrets cannot use example placeholder values");
    if (production && [process.env.MONGO_URI, process.env.EMAIL_USER, process.env.EMAIL_PASS].filter(Boolean).some((value) => /replace|change.?me|your[-_ ]|example\.(com|org|net)/i.test(value))) errors.push("Production configuration cannot use example placeholder values");
    const mediaTtl = Number(process.env.MEDIA_URL_TTL_SECONDS || 3600);
    if (!Number.isInteger(mediaTtl) || mediaTtl < 300 || mediaTtl > 86400) errors.push("MEDIA_URL_TTL_SECONDS must be an integer between 300 and 86400");
    const mongoServerSelectionTimeoutMs = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000);
    if (!Number.isInteger(mongoServerSelectionTimeoutMs) || mongoServerSelectionTimeoutMs < 1000 || mongoServerSelectionTimeoutMs > 60000) errors.push("MONGO_SERVER_SELECTION_TIMEOUT_MS must be an integer between 1000 and 60000");
    const port = Number(process.env.PORT || 5050);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT must be an integer between 1 and 65535");
    const trustProxy = Number(process.env.TRUST_PROXY || 0);
    if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 10) errors.push("TRUST_PROXY must be an integer between 0 and 10");
    if (errors.length) throw new Error(`Invalid server configuration: ${errors.join("; ")}`);
    return { origins, production, expiresIn, mongoServerSelectionTimeoutMs };
};

module.exports = { parseOrigins, validateEnvironment };
