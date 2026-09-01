const express =
    require("express");

const {
    requestRegistrationOtp, register, login, forgotPassword, validateResetToken, resetPassword, requestDeleteAccountOtp, deleteAccount
} = require(
    "../controllers/authController"
);

const {
    protect
} = require(
    "../middleware/authMiddleware"
);

const router =
    express.Router();
const rateLimit = require("../middleware/rateLimit");
const noQuery = require("../middleware/noQuery");
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const forgotIpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: (req) => `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}` });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const registrationOtpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}` });
const registrationIpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });
const deleteOtpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => `${req.ip}:${req.user?._id || "anonymous"}` });

router.use(noQuery);
router.post("/register/request-otp", registrationIpLimiter, registrationOtpLimiter, requestRegistrationOtp);

router.post(
    "/register",
    authLimiter, register
);

router.post(
    "/login",
    authLimiter, login
);
router.post("/forgot-password", forgotIpLimiter, forgotLimiter, forgotPassword);
router.get("/reset-password/:token", resetLimiter, validateResetToken);
router.post("/reset-password/:token", resetLimiter, resetPassword);
router.post("/delete-account/request-otp", protect, deleteOtpLimiter, requestDeleteAccountOtp);
router.delete("/delete-account", protect, deleteOtpLimiter, deleteAccount);

router.get(
    "/profile",
    protect,
    (req, res) => {
        return res.status(200).json({
            success: true,

            user: {
                id:
                    req.user._id,

                name:
                    req.user.name,

                email:
                    req.user.email,

                role:
                    req.user.role
            }
        });
    }
);

module.exports = router;
