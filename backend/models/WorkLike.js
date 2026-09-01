const mongoose = require("mongoose");
const workLikeSchema = new mongoose.Schema({
    work: { type: mongoose.Schema.Types.ObjectId, ref: "Work", required: true, index: true },
    visitorHash: { type: String, required: true, minlength: 64, maxlength: 64, match: /^[a-f0-9]{64}$/ }
}, { timestamps: true, strict: "throw" });
workLikeSchema.index({ work: 1, visitorHash: 1 }, { unique: true });
module.exports = mongoose.models.WorkLike || mongoose.model("WorkLike", workLikeSchema);
