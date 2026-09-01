const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const crypto = require("crypto");
const { parseOrigins, validateEnvironment } = require("./config/environment");
const requestSafety = require("./middleware/requestSafety");
const rateLimit = require("./middleware/rateLimit");
const { removeUploadedRequestFiles } = require("./services/storageService");
const { logError } = require("./utils/safeLog");
dotenv.config({ quiet: true });

const app = express();
app.disable("x-powered-by");
app.set("query parser", "simple");
const configuredProxyHops = Number(process.env.TRUST_PROXY || 0);
app.set("trust proxy", Number.isInteger(configuredProxyHops) && configuredProxyHops >= 0 ? configuredProxyHops : 0);
mongoose.set("strictQuery", true);
const allowedOrigins = parseOrigins();
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); callback(new Error("Origin not allowed by CORS")); }, methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 86400 }));
app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY"); res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Origin-Agent-Cluster", "?1");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", req.path.startsWith("/uploads/") ? "cross-origin" : "same-origin");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (process.env.NODE_ENV === "production" && req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
});
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "128kb", parameterLimit: 100 }));
app.use(requestSafety);
app.use((req, res, next) => {
    if (["GET", "HEAD"].includes(req.method) && req.body && Object.keys(req.body).length) return res.status(400).json({ success: false, message: "Request body is not allowed for this endpoint" });
    next();
});
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 600, scope: "global" }));
app.use("/api", (req, res, next) => {
    if (req.method === "GET") res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    next();
});
app.use("/api/auth", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use("/uploads", require("./routes/mediaRoutes"));
app.get("/", (req, res) => res.json({ success: true, message: "WCase API running" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/portfolios", require("./routes/portfolioRoutes"));
app.use("/api/works", require("./routes/workRoutes"));
app.use("/api/enquiries", require("./routes/enquiryRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "API route not found" }));
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(async (error, req, res, next) => {
    await removeUploadedRequestFiles(req);
    if (error instanceof multer.MulterError) {
        const tooLarge = error.code === "LIMIT_FILE_SIZE";
        return res.status(tooLarge ? 413 : 400).json({ success: false, message: tooLarge ? "Uploaded file exceeds the allowed size" : "Invalid upload request" });
    }
    if (error?.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request body is too large" });
    if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ success: false, message: "Malformed JSON request" });
    if (error instanceof URIError) return res.status(400).json({ success: false, message: "Invalid request URL" });
    if (error?.status === 415 || error?.code === "UNSUPPORTED_MEDIA") return res.status(415).json({ success: false, message: error.message || "File type not supported" });
    if (error?.name === "ValidationError") {
        const first = Object.values(error.errors || {})[0]?.message;
        return res.status(400).json({ success: false, message: first || "Invalid request" });
    }
    if (error?.name === "CastError" || error?.name === "StrictModeError") return res.status(400).json({ success: false, message: "Invalid request" });
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A record with these details already exists" });
    if ([400, 401, 403, 404, 409, 413, 415, 429].includes(error?.status)) {
        const message = error.status === 404 ? "File not found" : error.message || "Invalid request";
        return res.status(error.status).json({ success: false, message });
    }
    const status = error.message === "Origin not allowed by CORS" ? 403 : 500;
    if (process.env.NODE_ENV !== "test") logError("request_failure", error, req.requestId);
    res.status(status).json({ success: false, message: status === 500 ? "Internal server error" : "Origin is not allowed" });
});

const startServer = async () => {
    const { mongoServerSelectionTimeoutMs } = validateEnvironment();
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: mongoServerSelectionTimeoutMs });
    const port = process.env.PORT || 5050;
    return app.listen(port, () => console.log(`WCase API listening on port ${port}`));
};
if (require.main === module) startServer().then((server) => {
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`Received ${signal}; shutting down WCase API`);
        const timeout = setTimeout(() => {
            console.error("Graceful shutdown timed out");
            server.closeAllConnections?.();
            process.exit(1);
        }, 10000).unref();
        server.close(async (error) => {
            try { await mongoose.disconnect(); } catch (disconnectError) { logError("database_disconnect_failure", disconnectError); }
            clearTimeout(timeout);
            if (error) { logError("server_close_failure", error); process.exit(1); }
            process.exit(0);
        });
    };
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
}).catch((error) => {
    const safeMessage = error.message?.startsWith("Invalid server configuration:") ? error.message : "Could not start the API. Check the database connection and server configuration.";
    console.error("Server startup error:", safeMessage);
    process.exit(1);
});
module.exports = { app, startServer };
