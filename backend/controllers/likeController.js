const crypto = require("crypto");
const Work = require("../models/Work");
const WorkLike = require("../models/WorkLike");
const Portfolio = require("../models/Portfolio");
const { validObjectId, hasOnlyKeys } = require("../utils/validation");

const visitorPattern = /^[A-Za-z0-9_-]{16,80}$/;

const toggleLike = async (req, res, next) => {
    try {
        const visitorId = req.body?.visitorId;
        if (!hasOnlyKeys(req.body, ["visitorId"]) || !validObjectId(req.params.id) || typeof visitorId !== "string" || !visitorPattern.test(visitorId)) return res.status(400).json({ success: false, message: "Invalid like request" });
        const work = await Work.findOne({ _id: req.params.id, isPublished: true });
        if (!work || !(await Portfolio.exists({ _id: work.portfolio, isPublished: true }))) return res.status(404).json({ success: false, message: "Work unavailable" });
        const visitorHash = crypto.createHash("sha256").update(visitorId).digest("hex");
        const removed = await WorkLike.findOneAndDelete({ work: work._id, visitorHash });
        let liked;
        if (removed) {
            await Work.updateOne({ _id: work._id, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } });
            liked = false;
        } else {
            try {
                await WorkLike.create({ work: work._id, visitorHash });
                await Work.updateOne({ _id: work._id }, { $inc: { likeCount: 1 } });
            } catch (error) {
                if (error.code !== 11000) throw error;
            }
            liked = true;
        }
        const updated = await Work.findById(work._id).select("likeCount");
        res.json({ success: true, liked, likeCount: updated.likeCount });
    } catch (error) { next(error); }
};

module.exports = { toggleLike };
