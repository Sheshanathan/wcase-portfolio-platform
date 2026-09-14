const LOCAL_MEDIA_PATTERN = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/;
const LOCAL_IMAGE_PATTERN = /^\/uploads\/[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp)$/;
const CLOUDINARY_REFERENCE_PATTERN = /^cloudinary:\/\/(image|video)\/(wcase\/[A-Za-z0-9-]+)\.(jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/;

const parseCloudinaryReference = (value) => {
    const match = CLOUDINARY_REFERENCE_PATTERN.exec(value || "");
    return match ? { resourceType: match[1], publicId: match[2], format: match[3] } : null;
};

const cloudinaryReference = ({ resourceType, publicId, format }) => {
    const value = `cloudinary://${resourceType}/${publicId}.${String(format || "").toLowerCase()}`;
    if (!CLOUDINARY_REFERENCE_PATTERN.test(value)) throw new Error("INVALID_CLOUDINARY_MEDIA_REFERENCE");
    return value;
};

const validMediaReference = (value) => LOCAL_MEDIA_PATTERN.test(value || "") || CLOUDINARY_REFERENCE_PATTERN.test(value || "");
const validImageReference = (value) => LOCAL_IMAGE_PATTERN.test(value || "") || parseCloudinaryReference(value)?.resourceType === "image";

module.exports = {
    LOCAL_MEDIA_PATTERN,
    LOCAL_IMAGE_PATTERN,
    CLOUDINARY_REFERENCE_PATTERN,
    parseCloudinaryReference,
    cloudinaryReference,
    validMediaReference,
    validImageReference
};
