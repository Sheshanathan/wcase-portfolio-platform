const bcrypt = require("bcrypt");
const crypto = require("crypto");
const EmailOtp = require("../models/EmailOtp");

const boundedNumber = (value, fallback, min, max) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback; };
const OTP_TTL_MINUTES = boundedNumber(process.env.OTP_EXPIRY_MINUTES, 10, 5, 30);
const RESEND_WAIT_SECONDS = boundedNumber(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60, 30, 300);
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;
const RESEND_WAIT_MS = RESEND_WAIT_SECONDS * 1000;
const MAX_SENDS = 5;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const generateOtp = () => crypto.randomInt(0, 1000000).toString().padStart(6, "0");
const otpKey = ({ email, purpose, user }) => crypto.createHash("sha256").update(`${purpose}:${email}:${user ? String(user) : ""}`).digest("hex");
const otpHash = ({ key, otp }) => {
    const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("OTP_HASH_SECRET_OR_JWT_SECRET_REQUIRED");
    return `v1:${crypto.createHmac("sha256", secret).update(`${key}:${otp}`).digest("hex")}`;
};
const cooldownError = (lastSentAt) => {
    const retryAfterSeconds = Math.max(1, Math.ceil((RESEND_WAIT_MS - (Date.now() - new Date(lastSentAt).getTime())) / 1000));
    return { error: "OTP_RESEND_TOO_SOON", status: 429, retryAfterSeconds, message: `Please wait ${retryAfterSeconds} seconds before requesting another code.` };
};

const issueOtp = async ({ email, purpose, user = null }) => {
    const now = new Date();
    const key = otpKey({ email, purpose, user });
    const latest = await EmailOtp.findOne({ key });
    if (latest && now - latest.lastSentAt < RESEND_WAIT_MS) return cooldownError(latest.lastSentAt);
    const inCurrentWindow = latest && now - latest.windowStartedAt < SEND_WINDOW_MS;
    if (inCurrentWindow && latest.sendCount >= MAX_SENDS) return { error: "OTP_RESEND_LIMIT", status: 429, retryAfterSeconds: Math.max(1, Math.ceil((SEND_WINDOW_MS - (now - latest.windowStartedAt)) / 1000)), message: "Too many verification codes requested. Please try again later." };
    const otp = generateOtp();
    const update = { email, user, purpose, otpHash: otpHash({ key, otp }), expiresAt: new Date(Date.now() + OTP_TTL_MS), usedAt: null, attempts: 0, lastSentAt: now, sendCount: inCurrentWindow ? latest.sendCount + 1 : 1, windowStartedAt: inCurrentWindow ? latest.windowStartedAt : now };
    let record;
    try {
        if (!latest) record = await EmailOtp.create({ key, ...update });
        else record = await EmailOtp.findOneAndUpdate({ _id: latest._id, lastSentAt: latest.lastSentAt, sendCount: latest.sendCount }, { $set: update }, { new: true });
    } catch (error) {
        if (error?.code !== 11000) throw error;
    }
    if (!record) {
        const current = await EmailOtp.findOne({ key });
        if (current && now - current.lastSentAt < RESEND_WAIT_MS) return cooldownError(current.lastSentAt);
        return { error: "OTP_RESEND_LIMIT", status: 429, retryAfterSeconds: RESEND_WAIT_SECONDS, message: "Another verification request is already being processed. Please try again shortly." };
    }
    return { record, otp, expiresInMinutes: OTP_TTL_MINUTES, resendAfterSeconds: RESEND_WAIT_SECONDS };
};

const verifyOtp = async ({ email, purpose, otp, user = null }) => {
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) return { error: "INVALID_OTP", status: 400, message: "Enter the valid 6-digit verification code." };
    const key = otpKey({ email, purpose, user });
    const record = await EmailOtp.findOne({ key }).select("+otpHash");
    if (!record) return { error: "INVALID_OTP", status: 400, message: "This verification code is invalid. Request a new code and try again." };
    if (record.usedAt) return { error: "OTP_ALREADY_USED", status: 409, message: "This verification code has already been used. Request a new code." };
    if (record.expiresAt <= new Date()) return { error: "OTP_EXPIRED", status: 410, message: "This verification code has expired. Request a new code." };
    if (record.attempts >= MAX_ATTEMPTS) return { error: "OTP_ATTEMPTS_EXCEEDED", status: 429, message: "Too many incorrect attempts. Request a new verification code." };
    let matches;
    if (record.otpHash.startsWith("v1:")) {
        const expected = Buffer.from(otpHash({ key, otp }));
        const stored = Buffer.from(record.otpHash);
        matches = expected.length === stored.length && crypto.timingSafeEqual(expected, stored);
    } else matches = await bcrypt.compare(otp, record.otpHash);
    if (!matches) {
        const updated = await EmailOtp.updateOne({ _id: record._id, otpHash: record.otpHash, usedAt: null, attempts: { $lt: MAX_ATTEMPTS } }, { $inc: { attempts: 1 } });
        if (!updated.matchedCount) return { error: "OTP_INVALIDATED", status: 409, message: "This verification code is no longer valid. Use the most recently sent code." };
        return { error: "INCORRECT_OTP", status: 400, message: "The verification code is incorrect." };
    }
    const claimed = await EmailOtp.findOneAndUpdate({ _id: record._id, otpHash: record.otpHash, usedAt: null, attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: new Date() } }, { usedAt: new Date() }, { new: true });
    if (!claimed) return { error: "OTP_INVALIDATED", status: 409, message: "This verification code is no longer valid. Use the most recently sent code." };
    return { record: claimed };
};

module.exports = { issueOtp, verifyOtp };
