const Report = require("../models/Report");
const Portfolio = require("../models/Portfolio");
const Work = require("../models/Work");
const { REPORT_REASONS, cleanText, validObjectId, hasOnlyKeys, fieldError } = require("../utils/validation");

const submit = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body, ["targetType", "targetId", "reason", "details"])) return res.status(400).json({ success: false, message: "Invalid report" });
        const { targetType, targetId, reason } = req.body;
        if (!["portfolio", "work"].includes(targetType) || !validObjectId(targetId) || !REPORT_REASONS.includes(reason)) return res.status(400).json({ success: false, message: "Invalid report" });
        const details = cleanText(req.body.details || "", 1000);
        if (details === null || details.length > 1000) return fieldError(res, "details", "Report details cannot exceed 1000 characters");
        let portfolio;
        let work = null;
        if (targetType === "portfolio") portfolio = await Portfolio.findOne({ _id: targetId, isPublished: true });
        else {
            work = await Work.findOne({ _id: targetId, isPublished: true });
            if (work) portfolio = await Portfolio.findOne({ _id: work.portfolio, isPublished: true });
        }
        if (!portfolio) return res.status(404).json({ success: false, message: "Content unavailable" });
        await Report.create({ portfolio: portfolio._id, work: work?._id || null, reason, details });
        res.status(201).json({ success: true, message: "Report received for review." });
    } catch (error) { next(error); }
};

module.exports = { submit };
