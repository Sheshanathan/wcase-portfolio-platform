const crypto = require("crypto");

const MEDIA_PATH_PATTERN = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const mediaUrlTtlSeconds = () => {
    const value = Number(process.env.MEDIA_URL_TTL_SECONDS || 3600);
    return Number.isInteger(value) && value >= 300 && value <= 86400 ? value : 3600;
};

const signingSecret = () => {
    const secret = process.env.MEDIA_SIGNING_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("MEDIA_SIGNING_SECRET_REQUIRED");
    return secret;
};

const signatureFor = (publicPath, expires) => crypto
    .createHmac("sha256", signingSecret())
    .update(`${publicPath}\n${expires}`)
    .digest("base64url");

const signMediaPath = (publicPath) => {
    if (!MEDIA_PATH_PATTERN.test(publicPath || "")) return publicPath || "";
    const expires = Math.floor(Date.now() / 1000) + mediaUrlTtlSeconds();
    return `${publicPath}?expires=${expires}&signature=${signatureFor(publicPath, expires)}`;
};

const verifySignedMediaPath = (publicPath, expiresValue, signature) => {
    if (!MEDIA_PATH_PATTERN.test(publicPath || "") || typeof expiresValue !== "string" || !/^\d{10}$/.test(expiresValue) || !SIGNATURE_PATTERN.test(signature || "")) return false;
    const expires = Number(expiresValue);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(expires) || expires <= now || expires > now + 86460) return false;
    const expected = Buffer.from(signatureFor(publicPath, expires));
    const received = Buffer.from(signature);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

const plainObject = (value) => value && typeof value.toObject === "function" ? value.toObject() : { ...(value || {}) };

const withSignedPortfolioMedia = (portfolio) => {
    const value = plainObject(portfolio);
    value.profileImage = signMediaPath(value.profileImage);
    value.coverImage = signMediaPath(value.coverImage);
    return value;
};

const withSignedWorkMedia = (work) => {
    const value = plainObject(work);
    value.filePath = signMediaPath(value.filePath);
    value.thumbnailPath = signMediaPath(value.thumbnailPath);
    return value;
};

module.exports = {
    MEDIA_PATH_PATTERN,
    signMediaPath,
    verifySignedMediaPath,
    withSignedPortfolioMedia,
    withSignedWorkMedia
};
