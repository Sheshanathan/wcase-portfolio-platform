const mongoose = require("mongoose");
const { validEmail, validPhone, validSlug, validUrl } = require("../utils/validation");
const uploadPath = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp)$/;

const portfolioSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        bio: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },
        speciality: { type: String, trim: true, maxlength: 80, default: "" },
        location: { type: String, trim: true, maxlength: 120, default: "" },
        publicEmail: { type: String, trim: true, lowercase: true, maxlength: 150, default: "", validate: { validator: (value) => !value || validEmail(value), message: "Enter a valid public email" } },
        publicPhone: { type: String, trim: true, maxlength: 25, default: "", validate: { validator: validPhone, message: "Enter a valid phone number" } },
        website: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "Website must use http:// or https://" } },
        socialLinks: {
            instagram: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "Instagram URL must use http:// or https://" } },
            youtube: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "YouTube URL must use http:// or https://" } },
            facebook: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "Facebook URL must use http:// or https://" } },
            twitter: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "X / Twitter URL must use http:// or https://" } },
            vimeo: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "Vimeo URL must use http:// or https://" } },
            linkedin: { type: String, trim: true, maxlength: 300, default: "", validate: { validator: validUrl, message: "LinkedIn URL must use http:// or https://" } }
        },
        visibility: {
            profileImage: { type: Boolean, default: true }, coverImage: { type: Boolean, default: true },
            bio: { type: Boolean, default: true }, location: { type: Boolean, default: true },
            publicEmail: { type: Boolean, default: false }, publicPhone: { type: Boolean, default: false },
            website: { type: Boolean, default: true }, socialLinks: { type: Boolean, default: true }
        },
        viewCount: { type: Number, default: 0, min: 0 },

        publicSlug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            minlength: 3,
            maxlength: 60,
            validate: { validator: validSlug, message: "Invalid public slug" }
        },

        profileImage: {
            type: String,
            default: "",
            validate: { validator: (value) => !value || uploadPath.test(value), message: "Invalid profile image path" }
        },

        coverImage: {
            type: String,
            default: "",
            validate: { validator: (value) => !value || uploadPath.test(value), message: "Invalid cover image path" }
        },

        isPublished: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        strict: "throw"
    }
);

const Portfolio =
    mongoose.models.Portfolio ||
    mongoose.model(
        "Portfolio",
        portfolioSchema
    );

module.exports = Portfolio;
