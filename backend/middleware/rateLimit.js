const buckets = new Map();
const MAX_BUCKETS = 100000;

const sweepExpired = (now = Date.now()) => {
    for (const [key, item] of buckets) if (item.resetAt <= now) buckets.delete(key);
};

const rateLimit = ({ windowMs, max, key = (req) => req.ip, scope = "route" }) => (req, res, next) => {
    const now = Date.now();
    const rawKey = String(key(req) || "unknown").slice(0, 300);
    const routeScope = scope === "global" ? "api" : `${req.baseUrl}:${req.route?.path || req.path}`;
    const bucketKey = `${routeScope}:${rawKey}`;
    let item = buckets.get(bucketKey);
    if (!item || item.resetAt <= now) {
        if (!item && buckets.size >= MAX_BUCKETS) sweepExpired(now);
        if (!item && buckets.size >= MAX_BUCKETS) return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
        item = { count: 0, resetAt: now + windowMs };
    }
    item.count += 1;
    buckets.set(bucketKey, item);
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - item.count));
    res.setHeader("RateLimit-Reset", Math.ceil(item.resetAt / 1000));
    if (item.count > max) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil((item.resetAt - now) / 1000)));
        return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
    }
    next();
};

setInterval(() => {
    sweepExpired();
}, 10 * 60 * 1000).unref();

module.exports = rateLimit;
