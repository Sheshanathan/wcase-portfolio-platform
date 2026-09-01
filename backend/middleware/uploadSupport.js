const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoMimeTypes = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"]);
const canonicalExtension = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/x-m4v": ".m4v"
};

const unsupportedMedia = (message) => {
    const error = new Error(message);
    error.status = 415;
    error.code = "UNSUPPORTED_MEDIA";
    return error;
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => callback(null, uploadDirectory),
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${canonicalExtension[file.mimetype] || ""}`)
});

const accepts = ({ imagesOnly = false } = {}) => (req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const isImage = imageExtensions.has(extension);
    const isVideo = videoExtensions.has(extension);
    if (!extension || (!isImage && !isVideo) || (imagesOnly && !isImage)) return callback(unsupportedMedia(imagesOnly ? "Only JPG, PNG and WebP images are supported" : "File type not supported"));
    if ((isImage && !imageMimeTypes.has(file.mimetype)) || (isVideo && !videoMimeTypes.has(file.mimetype))) return callback(unsupportedMedia("The file extension and media type do not match"));
    if (file.fieldname === "thumbnail" && !isImage) return callback(unsupportedMedia("Thumbnail must be a JPG, PNG or WebP image"));
    callback(null, true);
};

const createUpload = ({ imagesOnly = false, maxFileSize, maxFiles }) => multer({
    storage,
    fileFilter: accepts({ imagesOnly }),
    limits: { fileSize: maxFileSize, files: maxFiles, fields: 20, parts: 24, fieldNameSize: 50, fieldSize: 16 * 1024 }
});

module.exports = { createUpload, imageMimeTypes, videoMimeTypes, unsupportedMedia };
