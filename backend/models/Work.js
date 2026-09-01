const mongoose = require("mongoose");
const { validCategory } = require("../utils/validation");
const mediaPath = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/;
const imagePath = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp)$/;

const workSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        portfolio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Portfolio",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        category: { type: String, trim: true, maxlength: 60, default: "", validate: { validator: validCategory, message: "Invalid category" } },
        projectName: { type: String, trim: true, maxlength: 120, default: "" },
        year: { type: Number, min: 1, default: null },
        tags: { type: [String], validate: [{ validator: (value) => value.length <= 10 && value.every((tag) => typeof tag === "string" && tag.length > 0 && tag.length <= 30), message: "Use at most 10 valid tags" }, { validator: (value) => new Set(value).size === value.length, message: "Tags must be unique" }] },
        thumbnailPath: { type: String, default: "", validate: { validator: (value) => !value || imagePath.test(value), message: "Invalid thumbnail path" } },
        featured: { type: Boolean, default: false, index: true },
        displayOrder: { type: Number, min: 0, default: 0, index: true },
        viewCount: { type: Number, default: 0, min: 0 },
        likeCount: { type: Number, default: 0, min: 0 },

        mediaType: {
            type: String,
            enum: ["video", "image"],
            required: true
        },

        fileName: {
            type: String,
            required: true,
            match: /^[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/
        },

        filePath: {
            type: String,
            required: true,
            match: mediaPath
        },

        mimeType: {
            type: String,
            required: true,
            enum: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]
        },

        fileSize: {
            type: Number,
            required: true,
            min: 1
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
workSchema.index({ portfolio: 1, isPublished: 1, featured: -1, displayOrder: 1 });

const Work =
    mongoose.models.Work ||
    mongoose.model("Work", workSchema);

module.exports = Work;
