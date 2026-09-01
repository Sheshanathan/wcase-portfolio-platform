const express =
    require("express");

const {
    createPortfolio,
    getMyPortfolio,
    updateMyPortfolio,

    uploadProfileImage,
    removeProfileImage,

    uploadCoverImage,
    removeCoverImage,

    getPublicPortfolio,
    getPublicPortfolioPage, previewPortfolio, recordView
} = require(
    "../controllers/portfolioController"
);

const {
    protect, optionalAuth
} = require(
    "../middleware/authMiddleware"
);

const portfolioUpload =
    require(
        "../middleware/portfolioUploadMiddleware"
    );
const validateUploadedMedia = require("../middleware/validateUploadedMedia");
const noQuery = require("../middleware/noQuery");

const router =
    express.Router();
const rateLimit = require("../middleware/rateLimit");
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: (req) => `${req.ip}:${req.user?._id || "anonymous"}` });

router.post(
    "/",
    protect,
    noQuery,
    createPortfolio
);

router.get(
    "/me",
    protect,
    noQuery,
    getMyPortfolio
);

router.put(
    "/me",
    protect,
    noQuery,
    updateMyPortfolio
);
router.get("/preview", protect, noQuery, previewPortfolio);

router.put(
    "/me/profile-image",
    protect,
    noQuery,
    uploadLimiter,
    portfolioUpload.single(
        "image"
    ),
    validateUploadedMedia({ imagesOnly: true }),
    uploadProfileImage
);

router.delete(
    "/me/profile-image",
    protect,
    noQuery,
    removeProfileImage
);

router.put(
    "/me/cover-image",
    protect,
    noQuery,
    uploadLimiter,
    portfolioUpload.single(
        "image"
    ),
    validateUploadedMedia({ imagesOnly: true }),
    uploadCoverImage
);

router.delete(
    "/me/cover-image",
    protect,
    noQuery,
    removeCoverImage
);

router.get(
    "/public/:slug/page",
    getPublicPortfolioPage
);
router.post("/public/:slug/view", optionalAuth, noQuery, rateLimit({ windowMs: 30 * 60 * 1000, max: 1, key: (req) => `${req.ip}:${req.params.slug}:${String(req.body?.visitorId || "").slice(0, 80)}` }), recordView);

router.get(
    "/public/:slug",
    noQuery,
    getPublicPortfolio
);

module.exports = router;
