const express =
    require("express");

const {
    createWork,
    getMyWorks,
    updateWork,
    deleteWork,
    getPublicWorks, getPublicWork, recordWorkView, updateThumbnail, removeThumbnail, reorderWorks
} = require(
    "../controllers/workController"
);

const {
    protect, optionalAuth
} = require(
    "../middleware/authMiddleware"
);

const upload =
    require(
        "../middleware/uploadMiddleware"
    );
const validateUploadedMedia = require("../middleware/validateUploadedMedia");
const imageUpload = require("../middleware/portfolioUploadMiddleware");
const noQuery = require("../middleware/noQuery");

const router =
    express.Router();
const rateLimit = require("../middleware/rateLimit");
const { toggleLike } = require("../controllers/likeController");
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => `${req.ip}:${req.user?._id || "anonymous"}` });

router.post(
    "/",
    protect,
    noQuery,
    uploadLimiter,
    upload.fields([{ name: "media", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]),
    validateUploadedMedia(),
    createWork
);
router.put("/reorder", protect, noQuery, reorderWorks);
router.put("/:id/thumbnail", protect, noQuery, uploadLimiter, imageUpload.single("thumbnail"), validateUploadedMedia({ imagesOnly: true }), updateThumbnail);
router.delete("/:id/thumbnail", protect, noQuery, removeThumbnail);

router.get(
    "/me",
    protect,
    noQuery,
    getMyWorks
);

router.put(
    "/:id",
    protect,
    noQuery,
    updateWork
);

router.delete(
    "/:id",
    protect,
    noQuery,
    deleteWork
);

router.get(
    "/public/:slug",
    getPublicWorks
);
router.get("/public/:slug/:id", noQuery, getPublicWork);
router.post("/public/:slug/:id/view", optionalAuth, noQuery, rateLimit({ windowMs: 30 * 60 * 1000, max: 1, key: (req) => `${req.ip}:${req.params.id}:${String(req.body?.visitorId || "").slice(0, 80)}` }), recordWorkView);
router.post("/public/:id/like", noQuery, rateLimit({ windowMs: 60 * 1000, max: 120, key: (req) => `${req.ip}:${req.params.id}:${String(req.body?.visitorId || "").slice(0, 80)}` }), toggleLike);

module.exports = router;
