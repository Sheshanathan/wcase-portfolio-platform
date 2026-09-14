const { v2: cloudinary } = require("cloudinary");

let configuredFor = "";

const getCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) throw new Error("CLOUDINARY_NOT_CONFIGURED");
    const fingerprint = `${cloudName}:${apiKey}`;
    if (configuredFor !== fingerprint) {
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        configuredFor = fingerprint;
    }
    return cloudinary;
};

module.exports = { getCloudinary };
