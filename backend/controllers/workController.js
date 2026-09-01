const Work = require("../models/Work");
const Portfolio = require("../models/Portfolio");
const WorkLike = require("../models/WorkLike");
const {
    WORK_CATEGORIES, cleanText, validObjectId, validSlug, validCategory,
    hasOnlyKeys, parsePagination, fieldError
} = require("../utils/validation");
const { removeUpload, removeUploadedRequestFiles } = require("../services/storageService");
const { withSignedWorkMedia } = require("../services/mediaAccessService");

const WORK_FIELDS = ["title", "description", "category", "projectName", "year", "tags", "isPublished", "featured"];
const visitorPattern = /^[A-Za-z0-9_-]{16,80}$/;

const parseTags = (value) => {
    if (value === undefined || value === "") return [];
    let list = value;
    if (typeof value === "string") {
        if (value.length > 1000) return null;
        try { list = JSON.parse(value); } catch { list = value.split(","); }
    }
    if (!Array.isArray(list) || list.length > 10) return null;
    const cleaned = [];
    const seen = new Set();
    for (const item of list) {
        const tag = cleanText(item, 30);
        if (!tag || tag.length > 30) return null;
        const normalized = tag.toLocaleLowerCase("en-US");
        if (!seen.has(normalized)) { seen.add(normalized); cleaned.push(normalized); }
    }
    return cleaned;
};

const normalizeCategory = (value) => {
    const category = cleanText(value, 60);
    if (!validCategory(category)) return null;
    if (!category) return "";
    return WORK_CATEGORIES.find((item) => item.toLocaleLowerCase("en-US") === category.toLocaleLowerCase("en-US")) || category;
};

const parseWork = (body, { partial = false } = {}) => {
    if (!hasOnlyKeys(body, WORK_FIELDS)) return { error: "The request contains unsupported work fields" };
    const out = {};
    if (!partial || body.title !== undefined) {
        const title = cleanText(body.title, 120);
        if (!title || title.length < 2 || title.length > 120) return { error: "Title must be between 2 and 120 characters", field: "title" };
        out.title = title;
    }
    for (const [field, max, label] of [["description", 1000, "Description"], ["projectName", 120, "Project or client"]]) {
        if (body[field] === undefined) continue;
        const value = cleanText(body[field], max);
        if (value === null || value.length > max) return { error: `${label} cannot exceed ${max} characters`, field };
        out[field] = value;
    }
    if (body.category !== undefined) {
        const category = normalizeCategory(body.category);
        if (category === null) return { error: "Category must be empty or between 2 and 60 characters", field: "category" };
        out.category = category;
    }
    if (body.year !== undefined && body.year !== "") {
        const year = Number(body.year);
        const maximum = new Date().getFullYear();
        if (!Number.isInteger(year) || year < 1800 || year > maximum) return { error: `Year must be a whole number between 1800 and ${maximum}`, field: "year" };
        out.year = year;
    } else if (body.year === "") out.year = null;
    if (body.tags !== undefined) {
        const tags = parseTags(body.tags);
        if (!tags) return { error: "Use at most 10 unique tags of 30 characters or fewer", field: "tags" };
        out.tags = tags;
    }
    for (const field of ["isPublished", "featured"]) {
        if (body[field] === undefined) continue;
        const value = body[field] === true || body[field] === "true" ? true : body[field] === false || body[field] === "false" ? false : null;
        if (value === null) return { error: `${field} must be true or false`, field };
        out[field] = value;
    }
    if (partial && !Object.keys(out).length) return { error: "No supported work changes were provided" };
    return { out };
};

const validationResponse = (res, checked) => checked.field ? fieldError(res, checked.field, checked.error) : res.status(400).json({ success: false, message: checked.error });

const createWork = async (req, res, next) => {
    try {
        const checked = parseWork(req.body || {});
        if (checked.error || !req.files?.media?.[0]) {
            await removeUploadedRequestFiles(req);
            if (checked.error) return validationResponse(res, checked);
            return fieldError(res, "media", "Media file is required");
        }
        const portfolio = await Portfolio.findOne({ user: req.user._id });
        if (!portfolio) { await removeUploadedRequestFiles(req); return res.status(404).json({ success: false, message: "Create your portfolio first" }); }
        const file = req.files.media[0];
        const thumbnail = req.files.thumbnail?.[0];
        const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
        const displayOrder = await Work.countDocuments({ portfolio: portfolio._id });
        const work = await Work.create({
            user: req.user._id, portfolio: portfolio._id, ...checked.out, mediaType,
            fileName: file.filename, filePath: `/uploads/${file.filename}`, mimeType: file.mimetype,
            fileSize: file.size, thumbnailPath: thumbnail ? `/uploads/${thumbnail.filename}` : "", displayOrder
        });
        res.status(201).json({ success: true, work: withSignedWorkMedia(work) });
    } catch (error) {
        await removeUploadedRequestFiles(req);
        next(error);
    }
};

const getMyWorks = async (req, res, next) => {
    try {
        const [works, totals] = await Promise.all([
            Work.find({ user: req.user._id }).sort({ displayOrder: 1, createdAt: -1 }),
            Work.aggregate([
                { $match: { user: req.user._id } },
                { $group: { _id: null, totalViews: { $sum: { $ifNull: ["$viewCount", 0] } }, totalLikes: { $sum: { $ifNull: ["$likeCount", 0] } } } }
            ])
        ]);
        const summary = totals[0] || { totalViews: 0, totalLikes: 0 };
        res.json({ success: true, works: works.map(withSignedWorkMedia), summary: { totalViews: summary.totalViews, totalLikes: summary.totalLikes } });
    } catch (error) { next(error); }
};

const owned = async (id, userId) => {
    if (!validObjectId(id)) return { invalid: true };
    const work = await Work.findById(id);
    if (!work) return {};
    if (!work.user.equals(userId)) return { forbidden: true };
    return { work };
};

const updateWork = async (req, res, next) => {
    try {
        const found = await owned(req.params.id, req.user._id);
        if (found.invalid) return res.status(400).json({ success: false, message: "Invalid work ID" });
        if (found.forbidden) return res.status(403).json({ success: false, message: "You do not have permission to modify this work" });
        if (!found.work) return res.status(404).json({ success: false, message: "Work not found" });
        const checked = parseWork(req.body || {}, { partial: true });
        if (checked.error) return validationResponse(res, checked);
        Object.assign(found.work, checked.out);
        await found.work.save();
        res.json({ success: true, work: withSignedWorkMedia(found.work) });
    } catch (error) { next(error); }
};

const deleteWork = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) return res.status(400).json({ success: false, message: "Request body is not allowed" });
        const found = await owned(req.params.id, req.user._id);
        if (found.invalid) return res.status(400).json({ success: false, message: "Invalid work ID" });
        if (found.forbidden) return res.status(403).json({ success: false, message: "You do not have permission to delete this work" });
        if (!found.work) return res.status(404).json({ success: false, message: "Work not found" });
        await Promise.all([found.work.deleteOne(), WorkLike.deleteMany({ work: found.work._id })]);
        await Promise.allSettled([removeUpload(found.work.filePath), removeUpload(found.work.thumbnailPath)]);
        res.json({ success: true, message: "Work deleted" });
    } catch (error) { next(error); }
};

const updateThumbnail = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) { await removeUploadedRequestFiles(req); return res.status(400).json({ success: false, message: "Upload request contains unsupported fields" }); }
        if (!req.file) return fieldError(res, "thumbnail", "Thumbnail image required");
        const found = await owned(req.params.id, req.user._id);
        if (found.invalid) { await removeUploadedRequestFiles(req); return res.status(400).json({ success: false, message: "Invalid work ID" }); }
        if (found.forbidden || !found.work) { await removeUploadedRequestFiles(req); return res.status(found.forbidden ? 403 : 404).json({ success: false, message: found.forbidden ? "You do not have permission to modify this work" : "Work not found" }); }
        const old = found.work.thumbnailPath;
        found.work.thumbnailPath = `/uploads/${req.file.filename}`;
        await found.work.save();
        await Promise.allSettled([removeUpload(old)]);
        res.json({ success: true, work: withSignedWorkMedia(found.work) });
    } catch (error) {
        await removeUploadedRequestFiles(req);
        next(error);
    }
};

const removeThumbnail = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) return res.status(400).json({ success: false, message: "Request body is not allowed" });
        const found = await owned(req.params.id, req.user._id);
        if (found.invalid) return res.status(400).json({ success: false, message: "Invalid work ID" });
        if (found.forbidden || !found.work) return res.status(found.forbidden ? 403 : 404).json({ success: false, message: found.forbidden ? "You do not have permission to modify this work" : "Work not found" });
        const old = found.work.thumbnailPath;
        found.work.thumbnailPath = "";
        await found.work.save();
        await Promise.allSettled([removeUpload(old)]);
        res.json({ success: true, work: withSignedWorkMedia(found.work) });
    } catch (error) { next(error); }
};

const reorderWorks = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body, ["ids"])) return res.status(400).json({ success: false, message: "Invalid work order" });
        const ids = req.body.ids;
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200 || new Set(ids).size !== ids.length || ids.some((id) => !validObjectId(id))) return res.status(400).json({ success: false, message: "Invalid work order" });
        const ownedCount = await Work.countDocuments({ _id: { $in: ids }, user: req.user._id });
        if (ownedCount !== ids.length) return res.status(403).json({ success: false, message: "You can only reorder your own work" });
        await Work.bulkWrite(ids.map((id, displayOrder) => ({ updateOne: { filter: { _id: id, user: req.user._id }, update: { $set: { displayOrder } } } })));
        res.json({ success: true });
    } catch (error) { next(error); }
};

const publicWorkFields = "title description category projectName year tags mediaType filePath mimeType thumbnailPath featured displayOrder likeCount createdAt";

const getPublicWorks = async (req, res, next) => {
    try {
        if (!validSlug(req.params.slug)) return res.status(400).json({ success: false, message: "Invalid portfolio link" });
        const paging = parsePagination(req.query);
        if (paging.error) return res.status(400).json({ success: false, message: paging.error });
        const portfolio = await Portfolio.findOne({ publicSlug: req.params.slug, isPublished: true });
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio unavailable" });
        const filter = { portfolio: portfolio._id, isPublished: true };
        if (paging.category) filter.category = paging.category;
        const works = await Work.find(filter).sort({ featured: -1, displayOrder: 1 }).skip((paging.page - 1) * paging.limit).limit(paging.limit).select(publicWorkFields);
        res.json({ success: true, works });
    } catch (error) { next(error); }
};

const getPublicWork = async (req, res, next) => {
    try {
        if (!validSlug(req.params.slug)) return res.status(400).json({ success: false, message: "Invalid portfolio link" });
        if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, code: "INVALID_WORK_ID", message: "Invalid work ID" });
        const portfolio = await Portfolio.findOne({ publicSlug: req.params.slug, isPublished: true }).select("_id");
        if (!portfolio) return res.status(404).json({ success: false, code: "WORK_UNAVAILABLE", message: "Work unavailable" });
        const ordered = await Work.find({ portfolio: portfolio._id, isPublished: true }).sort({ featured: -1, displayOrder: 1, createdAt: -1 }).select(publicWorkFields);
        const index = ordered.findIndex((item) => item._id.equals(req.params.id));
        if (index < 0) return res.status(404).json({ success: false, code: "WORK_UNAVAILABLE", message: "Work unavailable" });
        res.json({ success: true, work: ordered[index], navigation: { previousId: index > 0 ? ordered[index - 1]._id : null, nextId: index < ordered.length - 1 ? ordered[index + 1]._id : null } });
    } catch (error) { next(error); }
};

const recordWorkView = async (req, res, next) => {
    try {
        const visitorId = req.body?.visitorId;
        if (!hasOnlyKeys(req.body, ["visitorId"]) || !validSlug(req.params.slug) || !validObjectId(req.params.id) || typeof visitorId !== "string" || !visitorPattern.test(visitorId)) return res.status(400).json({ success: false, message: "Invalid work view request" });
        if (req.user) return res.status(204).end();
        const portfolio = await Portfolio.findOne({ publicSlug: req.params.slug, isPublished: true }).select("_id");
        if (!portfolio) return res.status(404).json({ success: false, message: "Work unavailable" });
        const updated = await Work.updateOne({ _id: req.params.id, portfolio: portfolio._id, isPublished: true }, { $inc: { viewCount: 1 } });
        if (!updated.matchedCount) return res.status(404).json({ success: false, message: "Work unavailable" });
        res.status(204).end();
    } catch (error) { next(error); }
};

module.exports = { createWork, getMyWorks, updateWork, deleteWork, getPublicWorks, getPublicWork, recordWorkView, updateThumbnail, removeThumbnail, reorderWorks };
