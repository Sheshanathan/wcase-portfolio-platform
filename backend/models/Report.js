const mongoose = require("mongoose");
const schema = new mongoose.Schema({
    portfolio: { type: mongoose.Schema.Types.ObjectId, ref: "Portfolio", required: true, index: true },
    work: { type: mongoose.Schema.Types.ObjectId, ref: "Work", default: null, index: true },
    reason: { type: String, enum: ["inappropriate content", "copyright concern", "spam", "other"], required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["open", "reviewed", "closed"], default: "open", index: true }
}, { timestamps: true, strict: "throw" });
module.exports = mongoose.models.Report || mongoose.model("Report", schema);
