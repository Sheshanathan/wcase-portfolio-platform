const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema({
    key: { type: String, maxlength: 64, unique: true, sparse: true },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 150, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    purpose: { type: String, required: true, enum: ["registration", "account_deletion"], index: true },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    lastSentAt: { type: Date, required: true },
    sendCount: { type: Number, default: 1, min: 1 },
    windowStartedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true, strict: "throw" });

emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
emailOtpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.models.EmailOtp || mongoose.model("EmailOtp", emailOtpSchema);
