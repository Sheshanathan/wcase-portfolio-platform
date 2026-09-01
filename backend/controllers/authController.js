const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EmailOtp = require("../models/EmailOtp");
const Portfolio = require("../models/Portfolio");
const Work = require("../models/Work");
const WorkLike = require("../models/WorkLike");
const Enquiry = require("../models/Enquiry");
const Report = require("../models/Report");
const { normalizeEmail, validEmail, validPassword, validLoginPassword, cleanText, hasOnlyKeys, fieldError } = require("../utils/validation");
const { sendPasswordReset, sendWelcomeEmail, sendOtpEmail } = require("../services/mailService");
const { issueOtp, verifyOtp } = require("../services/otpService");
const { removeUpload } = require("../services/storageService");
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });
const generateToken = (user) => jwt.sign({ userId: user._id, sessionVersion: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1h" });

const validateRegistration = (body, { withOtp = false } = {}) => {
    const allowed = withOtp ? ["name", "email", "password", "confirmPassword", "otp"] : ["name", "email", "password", "confirmPassword"];
    if (!hasOnlyKeys(body, allowed)) return { error: "Invalid registration request" };
    const name = cleanText(body.name, 80), email = normalizeEmail(body.email), password = body.password;
    if (!name || name.length < 2) return { error: "Name must be between 2 and 80 characters", field: "name" };
    if (!validEmail(email)) return { error: "Enter a valid email address", field: "email" };
    if (!validPassword(password)) return { error: "Password must be 8-72 characters and include a letter and a number", field: "password" };
    if (password !== body.confirmPassword) return { error: "Passwords do not match", field: "confirmPassword" };
    return { name, email, password };
};
const requestRegistrationOtp = async (req, res, next) => {
    try {
        const checked = validateRegistration(req.body);
        if (checked.error) return checked.field ? fieldError(res, checked.field, checked.error) : res.status(400).json({ success: false, message: checked.error });
        if (await User.exists({ email: checked.email })) return res.status(409).json({ success: false, code: "ACCOUNT_EXISTS", message: "An account with this email already exists" });
        const issued = await issueOtp({ email: checked.email, purpose: "registration" });
        if (issued.error) return res.status(issued.status).json({ success: false, code: issued.error, message: issued.message, retryAfterSeconds: issued.retryAfterSeconds });
        try { await sendOtpEmail({ to: checked.email, otp: issued.otp, purpose: "registration", expiresInMinutes: issued.expiresInMinutes }); }
        catch { await issued.record.deleteOne(); return res.status(503).json({ success: false, code: "OTP_EMAIL_UNAVAILABLE", message: "We could not send the verification email right now. Please try again shortly." }); }
        res.json({ success: true, message: "A verification code has been sent to your email.", expiresInMinutes: issued.expiresInMinutes, resendAfterSeconds: issued.resendAfterSeconds });
    } catch (error) { next(error); }
};
const register = async (req, res, next) => {
    try {
        const checked = validateRegistration(req.body, { withOtp: true });
        if (checked.error) return checked.field ? fieldError(res, checked.field, checked.error) : res.status(400).json({ success: false, message: checked.error });
        if (await User.exists({ email: checked.email })) return res.status(409).json({ success: false, code: "ACCOUNT_EXISTS", message: "An account with this email already exists" });
        const verified = await verifyOtp({ email: checked.email, purpose: "registration", otp: req.body?.otp });
        if (verified.error) return res.status(verified.status).json({ success: false, code: verified.error, message: verified.message });
        let user;
        try { user = await User.create({ name: checked.name, email: checked.email, password: await bcrypt.hash(checked.password, 12) }); }
        catch (error) { if (error?.code !== 11000) await EmailOtp.updateOne({ _id: verified.record._id }, { usedAt: null }); throw error; }
        sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => { /* Welcome mail remains best-effort. */ });
        res.status(201).json({ success: true, token: generateToken(user), user: publicUser(user) });
    } catch (error) { if (error?.code === 11000) return res.status(409).json({ success: false, message: "An account with this email already exists" }); next(error); }
};

const requestDeleteAccountOtp = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) return res.status(400).json({ success: false, message: "Invalid deletion verification request" });
        const issued = await issueOtp({ email: req.user.email, purpose: "account_deletion", user: req.user._id });
        if (issued.error) return res.status(issued.status).json({ success: false, code: issued.error, message: issued.message });
        try { await sendOtpEmail({ to: req.user.email, otp: issued.otp, purpose: "account_deletion", expiresInMinutes: issued.expiresInMinutes }); }
        catch { await issued.record.deleteOne(); return res.status(503).json({ success: false, code: "OTP_EMAIL_UNAVAILABLE", message: "We could not send the deletion code right now. Please try again shortly." }); }
        res.json({ success: true, message: "A deletion verification code has been sent to your registered email. It expires in 10 minutes." });
    } catch (error) { next(error); }
};

const deleteAccount = async (req, res, next) => {
    let verified;
    try {
        if (!hasOnlyKeys(req.body, ["otp", "confirmation"]) || req.body.confirmation !== "DELETE") return fieldError(res, "confirmation", "Type DELETE to confirm permanent account deletion");
        const userId = req.user._id;
        verified = await verifyOtp({ email: req.user.email, purpose: "account_deletion", otp: req.body?.otp, user: userId });
        if (verified.error) return res.status(verified.status).json({ success: false, code: verified.error, message: verified.message });
        const [portfolio, works] = await Promise.all([Portfolio.findOne({ user: userId }), Work.find({ user: userId })]);
        const workIds = works.map((work) => work._id);
        const filePaths = works.flatMap((work) => [work.filePath, work.thumbnailPath]);
        if (portfolio) filePaths.push(portfolio.profileImage, portfolio.coverImage);
        await Promise.all([
            WorkLike.deleteMany({ work: { $in: workIds } }),
            Report.deleteMany({ $or: [{ work: { $in: workIds } }, ...(portfolio ? [{ portfolio: portfolio._id }] : [])] }),
            Enquiry.deleteMany({ user: userId }),
            Work.deleteMany({ user: userId })
        ]);
        if (portfolio) await Portfolio.deleteOne({ _id: portfolio._id, user: userId });
        await User.deleteOne({ _id: userId });
        await EmailOtp.deleteMany({ $or: [{ user: userId }, { email: req.user.email }] });
        await Promise.allSettled(filePaths.filter(Boolean).map(removeUpload));
        res.json({ success: true, message: "Your WCase account has been permanently deleted." });
    } catch (error) {
        if (verified?.record?._id && await User.exists({ _id: req.user._id })) await EmailOtp.updateOne({ _id: verified.record._id }, { usedAt: null }).catch(() => {});
        next(error);
    }
};
const login = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body, ["email", "password"])) return res.status(400).json({ success: false, message: "Invalid login request" });
        const email = normalizeEmail(req.body?.email), password = req.body?.password;
        if (!validEmail(email) || !validLoginPassword(password)) return res.status(400).json({ success: false, message: "Enter a valid email and password" });
        const user = await User.findOne({ email }).select("+password +sessionVersion +isActive");
        if (user && user.isActive === false) return res.status(401).json({ success: false, message: "Invalid email or password" });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid email or password" });
        res.json({ success: true, token: generateToken(user), user: publicUser(user) });
    } catch (error) { next(error); }
};
const forgotPassword = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body, ["email"])) return res.status(400).json({ success: false, message: "Invalid password reset request" });
        const email = normalizeEmail(req.body?.email);
        if (!validEmail(email)) return fieldError(res, "email", "Enter a valid email address");
        const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");
        const genericMessage = "If a WCase account exists for this email, a reset link will be sent shortly.";
        if (!user) return res.json({ success: true, message: genericMessage });
        const rawToken = crypto.randomBytes(32).toString("hex");
        user.passwordResetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
        try { await sendPasswordReset({ to: user.email, resetUrl: `${frontendUrl}/reset-password/${rawToken}` }); }
        catch (mailError) {
            user.passwordResetTokenHash = null; user.passwordResetExpiresAt = null; await user.save({ validateBeforeSave: false });
            return res.status(503).json({ success: false, code: "RESET_EMAIL_UNAVAILABLE", message: "We could not send the reset email right now. Please try again shortly." });
        }
        res.json({ success: true, message: genericMessage });
    } catch (error) { next(error); }
};
const resetQuery = (token) => typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? { passwordResetTokenHash: crypto.createHash("sha256").update(token).digest("hex"), passwordResetExpiresAt: { $gt: new Date() } } : null;
const invalidReset = (res) => res.status(400).json({ success: false, code: "INVALID_OR_EXPIRED_TOKEN", message: "This password reset link is invalid or has expired." });
const validateResetToken = async (req, res, next) => { try { const query = resetQuery(req.params.token); if (!query || !(await User.exists(query))) return invalidReset(res); res.json({ success: true }); } catch (error) { next(error); } };
const resetPassword = async (req, res, next) => {
    try {
        const query = resetQuery(req.params.token); if (!query) return invalidReset(res);
        if (!hasOnlyKeys(req.body, ["password", "confirmPassword"])) return res.status(400).json({ success: false, message: "Invalid password reset request" });
        const { password, confirmPassword } = req.body || {};
        if (!validPassword(password)) return fieldError(res, "password", "Password must be 8-72 characters and include a letter and a number");
        if (password !== confirmPassword) return fieldError(res, "confirmPassword", "Passwords do not match");
        const user = await User.findOne(query).select("+password +passwordResetTokenHash +passwordResetExpiresAt +sessionVersion");
        if (!user) return invalidReset(res);
        user.password = await bcrypt.hash(password, 12); user.passwordResetTokenHash = null; user.passwordResetExpiresAt = null; user.sessionVersion = (user.sessionVersion || 0) + 1;
        await user.save(); res.json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (error) { next(error); }
};
module.exports = { requestRegistrationOtp, register, login, forgotPassword, validateResetToken, resetPassword, requestDeleteAccountOtp, deleteAccount };
