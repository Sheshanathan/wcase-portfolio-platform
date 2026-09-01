const mongoose = require("mongoose");
const { validEmail, validPhone } = require("../utils/validation");
const schema = new mongoose.Schema({
    portfolio: { type: mongoose.Schema.Types.ObjectId, ref: "Portfolio", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150, validate: { validator: validEmail, message: "Enter a valid email address" } },
    phone: { type: String, trim: true, maxlength: 25, default: "", validate: { validator: validPhone, message: "Enter a valid phone number" } },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true, strict: "throw" });
module.exports = mongoose.models.Enquiry || mongoose.model("Enquiry", schema);
