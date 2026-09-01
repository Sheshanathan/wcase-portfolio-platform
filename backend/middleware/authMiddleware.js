const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validObjectId } = require("../utils/validation");
const { logError } = require("../utils/safeLog");

const protect = async (req, res, next) => {
    try {
        const authHeader =
            req.headers.authorization;

        if (!authHeader || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authHeader)) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required"
            });
        }

        const token = authHeader.slice(7);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication token missing"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );
        if (!decoded || !validObjectId(decoded.userId) || !Number.isInteger(decoded.sessionVersion || 0)) return res.status(401).json({ success: false, message: "Invalid token" });

        const user = await User.findById(decoded.userId).select("+sessionVersion +isActive");

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User associated with this token no longer exists"
            });
        }
        if (user.isActive === false) return res.status(401).json({ success: false, message: "Session is no longer valid. Please login again" });
        if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) return res.status(401).json({ success: false, message: "Session is no longer valid. Please login again" });

        req.user = user;

        next();
    } catch (error) {
        if (
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Session expired. Please login again"
            });
        }

        if (
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        if (process.env.NODE_ENV !== "test") logError("authentication_failure", error, req.requestId);

        return res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (
            !req.user ||
            !roles.includes(req.user.role)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to access this resource"
            });
        }

        next();
    };
};

const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return protect(req, res, next);
};

module.exports = {
    protect,
    optionalAuth,
    authorize
};
