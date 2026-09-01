const { findUnsafeInput } = require("../utils/validation");

const requestSafety = (req, res, next) => {
    const unsafeBody = findUnsafeInput(req.body);
    const unsafeQuery = findUnsafeInput(req.query);
    if (unsafeBody || unsafeQuery) return res.status(400).json({ success: false, message: unsafeBody || unsafeQuery || "Invalid request" });
    next();
};

module.exports = requestSafety;
