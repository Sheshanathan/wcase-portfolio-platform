const crypto = require("crypto");
const Portfolio = require("../models/Portfolio");
const Work = require("../models/Work");
const {
    cleanText, normalizeEmail, validEmail, validUrl, validPhone, validSlug,
    hasOnlyKeys, isPlainObject, parsePagination, fieldError
} = require("../utils/validation");
const { removeUpload } = require("../services/storageService");
const { withSignedPortfolioMedia, withSignedWorkMedia } = require("../services/mediaAccessService");

const PORTFOLIO_FIELDS = ["title", "bio", "speciality", "location", "publicEmail", "publicPhone", "website", "socialLinks", "visibility", "publicSlug", "isPublished"];
const SOCIAL_FIELDS = ["instagram", "youtube", "facebook", "twitter", "vimeo", "linkedin"];
const VISIBILITY_FIELDS = ["profileImage", "coverImage", "bio", "location", "publicEmail", "publicPhone", "website", "socialLinks"];
const visitorPattern = /^[A-Za-z0-9_-]{16,80}$/;

const makeSlug = (name) => `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45) || "creator"}-${crypto.randomBytes(4).toString("hex").slice(0, 6)}`;

const publicDto = (portfolio) => {
    const visibility = portfolio.visibility || {};
    const dto = {
        id: portfolio._id,
        title: portfolio.title,
        publicSlug: portfolio.publicSlug,
        speciality: portfolio.speciality,
        creator: { name: portfolio.user?.name || "Creator" },
        viewCount: portfolio.viewCount || 0
    };
    if (visibility.bio !== false) dto.bio = portfolio.bio;
    if (visibility.location !== false) dto.location = portfolio.location;
    if (visibility.profileImage !== false) dto.profileImage = portfolio.profileImage;
    if (visibility.coverImage !== false) dto.coverImage = portfolio.coverImage;
    if (visibility.publicEmail) dto.publicEmail = portfolio.publicEmail;
    if (visibility.publicPhone) dto.publicPhone = portfolio.publicPhone;
    if (visibility.website !== false) dto.website = portfolio.website;
    if (visibility.socialLinks !== false) dto.socialLinks = portfolio.socialLinks;
    return dto;
};

const validateFields = (body) => {
    if (!hasOnlyKeys(body, PORTFOLIO_FIELDS)) return { error: "The request contains unsupported portfolio fields" };
    const out = {};
    const textFields = { title: [2, 100, "Portfolio title"], bio: [0, 500, "Bio"], speciality: [0, 80, "Speciality"], location: [0, 120, "Location"], publicPhone: [0, 25, "Phone number"] };
    for (const [field, [min, max, label]] of Object.entries(textFields)) {
        if (body[field] === undefined) continue;
        const value = cleanText(body[field], max);
        if (value === null || value.length < min || value.length > max) return { error: `${label} must be between ${min} and ${max} characters`, field };
        out[field] = value;
    }
    if (body.publicEmail !== undefined) {
        const value = normalizeEmail(body.publicEmail);
        if (value && !validEmail(value)) return { error: "Enter a valid public email", field: "publicEmail" };
        out.publicEmail = value;
    }
    if (body.website !== undefined) {
        const value = cleanText(body.website, 300);
        if (value === null || !validUrl(value)) return { error: "Website must use http:// or https://", field: "website" };
        out.website = value;
    }
    if (out.publicPhone && !validPhone(out.publicPhone)) return { error: "Enter a valid phone number", field: "publicPhone" };
    if (body.publicSlug !== undefined) {
        if (typeof body.publicSlug !== "string") return { error: "Invalid public slug", field: "publicSlug" };
        const slug = body.publicSlug.trim().toLowerCase();
        if (!validSlug(slug)) return { error: "Slug must be 3-60 lowercase letters, numbers and single hyphens, and not reserved", field: "publicSlug" };
        out.publicSlug = slug;
    }
    if (body.socialLinks !== undefined) {
        if (!isPlainObject(body.socialLinks) || !hasOnlyKeys(body.socialLinks, SOCIAL_FIELDS)) return { error: "Invalid social links", field: "socialLinks" };
        out.socialLinks = {};
        for (const key of SOCIAL_FIELDS) {
            if (body.socialLinks[key] === undefined) continue;
            const value = cleanText(body.socialLinks[key], 300);
            if (value === null || !validUrl(value)) return { error: `${key} must use http:// or https://`, field: `socialLinks.${key}` };
            out.socialLinks[key] = value;
        }
    }
    if (body.visibility !== undefined) {
        if (!isPlainObject(body.visibility) || !hasOnlyKeys(body.visibility, VISIBILITY_FIELDS)) return { error: "Invalid visibility settings", field: "visibility" };
        out.visibility = {};
        for (const key of VISIBILITY_FIELDS) {
            if (body.visibility[key] === undefined) continue;
            if (typeof body.visibility[key] !== "boolean") return { error: `${key} visibility must be true or false`, field: `visibility.${key}` };
            out.visibility[key] = body.visibility[key];
        }
    }
    if (body.isPublished !== undefined) {
        if (typeof body.isPublished !== "boolean") return { error: "Publishing status must be true or false", field: "isPublished" };
        out.isPublished = body.isPublished;
    }
    return { out };
};

const respondValidation = (res, checked) => checked.field ? fieldError(res, checked.field, checked.error) : res.status(400).json({ success: false, message: checked.error });

const createPortfolio = async (req, res, next) => {
    try {
        if (await Portfolio.exists({ user: req.user._id })) return res.status(409).json({ success: false, message: "You already have a portfolio" });
        const checked = validateFields(req.body || {});
        if (checked.error) return respondValidation(res, checked);
        if (!checked.out.title) return fieldError(res, "title", "Portfolio title is required");
        let publicSlug = makeSlug(req.user.name);
        while (await Portfolio.exists({ publicSlug })) publicSlug = makeSlug(req.user.name);
        const allowed = { ...checked.out };
        delete allowed.publicSlug;
        const portfolio = await Portfolio.create({ user: req.user._id, ...allowed, publicSlug });
        res.status(201).json({ success: true, portfolio: withSignedPortfolioMedia(portfolio) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "Portfolio slug is already in use" });
        next(error);
    }
};

const getMyPortfolio = async (req, res, next) => {
    try {
        const portfolio = await Portfolio.findOne({ user: req.user._id });
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });
        res.json({ success: true, portfolio: withSignedPortfolioMedia(portfolio) });
    } catch (error) { next(error); }
};

const updateMyPortfolio = async (req, res, next) => {
    try {
        const portfolio = await Portfolio.findOne({ user: req.user._id });
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });
        const checked = validateFields(req.body || {});
        if (checked.error) return respondValidation(res, checked);
        if (!Object.keys(checked.out).length) return res.status(400).json({ success: false, message: "No supported portfolio changes were provided" });
        const { socialLinks, visibility, ...fields } = checked.out;
        Object.assign(portfolio, fields);
        if (socialLinks) Object.assign(portfolio.socialLinks, socialLinks);
        if (visibility) Object.assign(portfolio.visibility, visibility);
        await portfolio.save();
        res.json({ success: true, portfolio: withSignedPortfolioMedia(portfolio), message: "Portfolio updated successfully" });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "Portfolio slug is already in use" });
        next(error);
    }
};

const replaceImage = (field) => async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) throw Object.assign(new Error("Upload request contains unsupported fields"), { status: 400 });
        if (!req.file || req.file.size <= 0) return res.status(400).json({ success: false, message: "A valid image is required" });
        const portfolio = await Portfolio.findOne({ user: req.user._id });
        if (!portfolio) { await removeUpload(`/uploads/${req.file.filename}`); return res.status(404).json({ success: false, message: "Portfolio not found" }); }
        const old = portfolio[field];
        portfolio[field] = `/uploads/${req.file.filename}`;
        await portfolio.save();
        await Promise.allSettled([removeUpload(old)]);
        res.json({ success: true, portfolio: withSignedPortfolioMedia(portfolio) });
    } catch (error) {
        if (req.file) await removeUpload(`/uploads/${req.file.filename}`);
        next(error);
    }
};

const removeImage = (field) => async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) return res.status(400).json({ success: false, message: "Request body is not allowed" });
        const portfolio = await Portfolio.findOne({ user: req.user._id });
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });
        const old = portfolio[field];
        portfolio[field] = "";
        await portfolio.save();
        await Promise.allSettled([removeUpload(old)]);
        res.json({ success: true, portfolio: withSignedPortfolioMedia(portfolio) });
    } catch (error) { next(error); }
};

const findPublic = async (slug) => validSlug(slug) ? Portfolio.findOne({ publicSlug: slug, isPublished: true }).populate("user", "name") : null;

const getPublicPortfolio = async (req, res, next) => {
    try {
        if (!validSlug(req.params.slug)) return res.status(400).json({ success: false, message: "Invalid portfolio link" });
        const portfolio = await findPublic(req.params.slug);
        if (!portfolio) return res.status(404).json({ success: false, code: "PORTFOLIO_UNAVAILABLE", message: "This portfolio is private or unavailable." });
        res.json({ success: true, portfolio: publicDto(portfolio) });
    } catch (error) { next(error); }
};

const getPublicPortfolioPage = async (req, res, next) => {
    try {
        if (!validSlug(req.params.slug)) return res.status(400).json({ success: false, message: "Invalid portfolio link" });
        const paging = parsePagination(req.query);
        if (paging.error) return res.status(400).json({ success: false, message: paging.error });
        const portfolio = await findPublic(req.params.slug);
        if (!portfolio) return res.status(404).json({ success: false, code: "PORTFOLIO_UNAVAILABLE", message: "This portfolio is private or unavailable." });
        const filter = { portfolio: portfolio._id, isPublished: true };
        if (paging.category) filter.category = paging.category;
        const baseFilter = { portfolio: portfolio._id, isPublished: true };
        const [works, total, rawCategories] = await Promise.all([
            Work.find(filter).sort({ featured: -1, displayOrder: 1, createdAt: -1 }).skip((paging.page - 1) * paging.limit).limit(paging.limit).select("title description category projectName year tags mediaType filePath mimeType thumbnailPath featured displayOrder likeCount"),
            Work.countDocuments(filter),
            Work.distinct("category", baseFilter)
        ]);
        const categories = rawCategories.filter((value) => typeof value === "string" && value.trim()).sort((a, b) => a.localeCompare(b));
        res.json({ success: true, portfolio: publicDto(portfolio), works, categories, pagination: { page: paging.page, limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } });
    } catch (error) { next(error); }
};

const previewPortfolio = async (req, res, next) => {
    try {
        const portfolio = await Portfolio.findOne({ user: req.user._id }).populate("user", "name");
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio not found" });
        const works = await Work.find({ portfolio: portfolio._id }).sort({ featured: -1, displayOrder: 1 });
        res.json({
            success: true,
            portfolio: withSignedPortfolioMedia(publicDto(portfolio)),
            works: works.map(withSignedWorkMedia),
            preview: true
        });
    } catch (error) { next(error); }
};

const recordView = async (req, res, next) => {
    try {
        const visitorId = req.body?.visitorId;
        if (!hasOnlyKeys(req.body || {}, ["visitorId"]) || !validSlug(req.params.slug) || typeof visitorId !== "string" || !visitorPattern.test(visitorId)) return res.status(400).json({ success: false, message: "Invalid portfolio view request" });
        if (req.user) return res.status(204).end();
        const updated = await Portfolio.updateOne({ publicSlug: req.params.slug, isPublished: true }, { $inc: { viewCount: 1 } });
        if (!updated.matchedCount) return res.status(404).json({ success: false, message: "Portfolio unavailable" });
        res.status(204).end();
    } catch (error) { next(error); }
};

module.exports = {
    createPortfolio, getMyPortfolio, updateMyPortfolio,
    uploadProfileImage: replaceImage("profileImage"), removeProfileImage: removeImage("profileImage"),
    uploadCoverImage: replaceImage("coverImage"), removeCoverImage: removeImage("coverImage"),
    getPublicPortfolio, getPublicPortfolioPage, previewPortfolio, recordView
};
