const Enquiry = require("../models/Enquiry");
const Portfolio = require("../models/Portfolio");
const { cleanText, normalizeEmail, validEmail, validPhone, validObjectId, validSlug, hasOnlyKeys, fieldError } = require("../utils/validation");

const submit = async (req, res, next) => {
    try {
        if (!validSlug(req.params.slug)) return res.status(400).json({ success: false, message: "Invalid portfolio link" });
        if (!hasOnlyKeys(req.body, ["name", "email", "phone", "subject", "message"])) return res.status(400).json({ success: false, message: "The enquiry contains unsupported fields" });
        const portfolio = await Portfolio.findOne({ publicSlug: req.params.slug, isPublished: true });
        if (!portfolio) return res.status(404).json({ success: false, message: "Portfolio unavailable" });
        const name = cleanText(req.body.name, 80);
        const email = normalizeEmail(req.body.email);
        const phone = cleanText(req.body.phone || "", 25);
        const subject = cleanText(req.body.subject, 120);
        const message = cleanText(req.body.message, 2000);
        if (!name || name.length < 2 || name.length > 80) return fieldError(res, "name", "Name must be between 2 and 80 characters");
        if (!validEmail(email)) return fieldError(res, "email", "Enter a valid email address");
        if (phone === null || !validPhone(phone)) return fieldError(res, "phone", "Enter a valid phone number");
        if (!subject || subject.length < 2 || subject.length > 120) return fieldError(res, "subject", "Subject must be between 2 and 120 characters");
        if (!message || message.length < 10 || message.length > 2000) return fieldError(res, "message", "Message must be between 10 and 2000 characters");
        await Enquiry.create({ portfolio: portfolio._id, user: portfolio.user, name, email, phone, subject, message });
        res.status(201).json({ success: true, message: "Your enquiry has been sent." });
    } catch (error) { next(error); }
};

const list = async (req, res, next) => {
    try {
        const filter = { user: req.user._id };
        const [enquiries, total] = await Promise.all([
            Enquiry.find(filter).sort({ createdAt: -1 }).limit(200),
            Enquiry.countDocuments(filter)
        ]);
        res.json({ success: true, enquiries, total });
    } catch (error) { next(error); }
};

const markRead = async (req, res, next) => {
    try {
        if (!validObjectId(req.params.id) || !hasOnlyKeys(req.body, ["isRead"]) || typeof req.body.isRead !== "boolean") return res.status(400).json({ success: false, message: "Invalid request" });
        const item = await Enquiry.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { isRead: req.body.isRead } }, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ success: false, message: "Enquiry not found" });
        res.json({ success: true, enquiry: item });
    } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
    try {
        if (!hasOnlyKeys(req.body || {}, [])) return res.status(400).json({ success: false, message: "Request body is not allowed" });
        if (!validObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid enquiry ID" });
        const item = await Enquiry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!item) return res.status(404).json({ success: false, message: "Enquiry not found" });
        res.json({ success: true, message: "Enquiry deleted" });
    } catch (error) { next(error); }
};

module.exports = { submit, list, markRead, remove };
