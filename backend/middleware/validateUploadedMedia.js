const fs = require("fs/promises");
const { removeUploadedRequestFiles, requestFiles } = require("../services/storageService");
const { imageMimeTypes, videoMimeTypes, unsupportedMedia } = require("./uploadSupport");

const detectType = (buffer) => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"))) return "video/webm";
    if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") return "video/iso-base-media";
    return "";
};

const compatible = (declared, detected) => detected === "video/iso-base-media"
    ? ["video/mp4", "video/quicktime", "video/x-m4v"].includes(declared)
    : declared === detected;

const validateUploadedMedia = ({ imagesOnly = false } = {}) => async (req, res, next) => {
    try {
        for (const file of requestFiles(req)) {
            if (!file.size) throw unsupportedMedia("The selected file is empty");
            const handle = await fs.open(file.path, "r");
            const buffer = Buffer.alloc(32);
            let bytesRead;
            try { ({ bytesRead } = await handle.read(buffer, 0, buffer.length, 0)); } finally { await handle.close(); }
            const detected = detectType(buffer.subarray(0, bytesRead));
            if (!detected || !compatible(file.mimetype, detected)) throw unsupportedMedia("The uploaded file is malformed or its content does not match its type");
            if (imagesOnly && !imageMimeTypes.has(file.mimetype)) throw unsupportedMedia("Only supported image files are allowed");
            if (!imagesOnly && file.fieldname === "media" && !imageMimeTypes.has(file.mimetype) && !videoMimeTypes.has(file.mimetype)) throw unsupportedMedia("File type not supported");
            if (file.fieldname === "thumbnail" && !imageMimeTypes.has(file.mimetype)) throw unsupportedMedia("Thumbnail must be a supported image");
        }
        next();
    } catch (error) {
        await removeUploadedRequestFiles(req);
        next(error);
    }
};

module.exports = validateUploadedMedia;
module.exports.detectType = detectType;
module.exports.compatible = compatible;
