const mongoose = require("mongoose");
const { validEmail } = require("../utils/validation");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 150,
            validate: { validator: validEmail, message: "Enter a valid email address" }
        },

        password: {
            type: String,
            required: true,
            minlength: 8,
            maxlength: 100,
            select: false
        },

        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
            immutable: true
        },
        isActive: { type: Boolean, default: true, select: false },
        passwordResetTokenHash: { type: String, select: false, index: true, default: null },
        passwordResetExpiresAt: { type: Date, select: false, default: null },
        sessionVersion: { type: Number, default: 0, select: false }
    },
    {
        timestamps: true,
        strict: "throw",
        toJSON: { transform(doc, value) { delete value.password; delete value.passwordResetTokenHash; delete value.passwordResetExpiresAt; delete value.sessionVersion; delete value.isActive; return value; } }
    }
);

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

module.exports = User;
