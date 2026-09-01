const path = require("path");
const Portfolio = require("../models/Portfolio");
const Work = require("../models/Work");
const { uploadsRoot } = require("../services/storageService");
const { MEDIA_PATH_PATTERN, verifySignedMediaPath } = require("../services/mediaAccessService");
const { hasOnlyKeys } = require("../utils/validation");

const unavailable = (res) => res.status(404).json({ success: false, message: "File not found" });

const isPublicMedia = async (publicPath) => {
    const portfolio = await Portfolio.findOne({
        isPublished: true,
        $or: [{ profileImage: publicPath }, { coverImage: publicPath }]
    }).select("profileImage coverImage visibility");
    if (portfolio) {
        if (portfolio.profileImage === publicPath && portfolio.visibility?.profileImage !== false) return true;
        if (portfolio.coverImage === publicPath && portfolio.visibility?.coverImage !== false) return true;
    }

    const work = await Work.findOne({
        isPublished: true,
        $or: [{ filePath: publicPath }, { thumbnailPath: publicPath }]
    }).select("portfolio");
    return Boolean(work && await Portfolio.exists({ _id: work.portfolio, isPublished: true }));
};

const serveMedia = async (req, res, next) => {
    try {
        const fileName = req.params.fileName;
        const publicPath = `/uploads/${fileName}`;
        if (path.basename(fileName || "") !== fileName || !MEDIA_PATH_PATTERN.test(publicPath)) return unavailable(res);

        const queryKeys = Object.keys(req.query || {});
        const hasSignedShape = queryKeys.length === 2 && hasOnlyKeys(req.query, ["expires", "signature"]);
        const signed = hasSignedShape && verifySignedMediaPath(publicPath, req.query.expires, req.query.signature);
        if ((queryKeys.length && !signed) || (!signed && !(await isPublicMedia(publicPath)))) return unavailable(res);

        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Content-Disposition", "inline");
        return res.sendFile(fileName, { root: uploadsRoot, dotfiles: "deny", acceptRanges: true, lastModified: true }, (error) => {
            if (error) next(error);
        });
    } catch (error) { next(error); }
};

module.exports = { serveMedia, isPublicMedia };
