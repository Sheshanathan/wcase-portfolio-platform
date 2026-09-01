module.exports = (req, res, next) => {
    if (Object.keys(req.query || {}).length) return res.status(400).json({ success: false, message: "This endpoint does not accept query parameters" });
    next();
};
