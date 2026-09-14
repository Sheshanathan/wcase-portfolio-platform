const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { getCloudinary } = require("./cloudinaryService");
const { parseCloudinaryReference, cloudinaryReference } = require("../utils/mediaReference");
const uploadsRoot = path.resolve(__dirname, "..", "uploads");

const removeUpload = async (publicPath) => {
    const cloudAsset = parseCloudinaryReference(publicPath);
    if (cloudAsset) {
        await getCloudinary().uploader.destroy(cloudAsset.publicId, {
            resource_type: cloudAsset.resourceType,
            type: "authenticated",
            invalidate: true
        });
        return;
    }
    if (typeof publicPath !== "string" || !publicPath.startsWith("/uploads/")) return;
    const fileName = path.basename(publicPath);
    const target = path.resolve(uploadsRoot, fileName);
    if (path.dirname(target) !== uploadsRoot) return;
    try { await fs.unlink(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
};

const persistUploadedFile = async (file) => {
    if (!file?.path || !file?.filename) throw new Error("UPLOAD_FILE_REQUIRED");
    if ((process.env.MEDIA_STORAGE_PROVIDER || "local") !== "cloudinary") return `/uploads/${file.filename}`;
    const resourceType = file.mimetype?.startsWith("video/") ? "video" : "image";
    try {
        const result = await getCloudinary().uploader.upload(file.path, {
            resource_type: resourceType,
            type: "authenticated",
            folder: "wcase",
            public_id: crypto.randomUUID(),
            overwrite: false
        });
        const reference = cloudinaryReference({ resourceType, publicId: result.public_id, format: result.format });
        file.storageReference = reference;
        return reference;
    } finally {
        await fs.unlink(file.path).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
};

const requestFiles = (req) => {
    const files = [];
    if (req?.file) files.push(req.file);
    if (req?.files && !Array.isArray(req.files)) Object.values(req.files).forEach((items) => files.push(...items));
    if (Array.isArray(req?.files)) files.push(...req.files);
    return files;
};

const removeUploadedRequestFiles = async (req) => {
    await Promise.allSettled(requestFiles(req).map((file) => removeUpload(file.storageReference || `/uploads/${file.filename}`)));
};

module.exports = { uploadsRoot, removeUpload, persistUploadedFile, requestFiles, removeUploadedRequestFiles };
