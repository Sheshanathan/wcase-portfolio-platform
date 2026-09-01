const fs = require("fs/promises");
const path = require("path");
const uploadsRoot = path.resolve(__dirname, "..", "uploads");

const removeUpload = async (publicPath) => {
    if (typeof publicPath !== "string" || !publicPath.startsWith("/uploads/")) return;
    const fileName = path.basename(publicPath);
    const target = path.resolve(uploadsRoot, fileName);
    if (path.dirname(target) !== uploadsRoot) return;
    try { await fs.unlink(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
};

const requestFiles = (req) => {
    const files = [];
    if (req?.file) files.push(req.file);
    if (req?.files && !Array.isArray(req.files)) Object.values(req.files).forEach((items) => files.push(...items));
    if (Array.isArray(req?.files)) files.push(...req.files);
    return files;
};

const removeUploadedRequestFiles = async (req) => {
    await Promise.allSettled(requestFiles(req).map((file) => removeUpload(`/uploads/${file.filename}`)));
};

module.exports = { uploadsRoot, removeUpload, requestFiles, removeUploadedRequestFiles };
