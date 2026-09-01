const test = require("node:test");
const assert = require("node:assert/strict");
const {
    cleanText, findUnsafeInput, hasOnlyKeys, parsePagination,
    validObjectId, validPassword, validSlug
} = require("../utils/validation");
const { detectType, compatible } = require("../middleware/validateUploadedMedia");
const { validateEnvironment } = require("../config/environment");

test("text cleaning trims without corrupting ordinary angle-bracket text", () => {
    assert.equal(cleanText("  2 < 3 and 5 > 4  ", 100), "2 < 3 and 5 > 4");
    assert.equal(cleanText("bad\u0000text", 100), null);
    assert.equal(cleanText("abcdef", 5).length, 6);
});

test("request validation blocks NoSQL and prototype-style keys", () => {
    assert.match(findUnsafeInput({ email: { $gt: "" } }), /Unsafe/);
    assert.match(findUnsafeInput({ "profile.name": "x" }), /Unsafe/);
    assert.match(findUnsafeInput(JSON.parse('{"__proto__":{"admin":true}}')), /Unsafe/);
    assert.equal(findUnsafeInput({ name: "Creator", tags: ["one", "two"] }), "");
    assert.equal(hasOnlyKeys({ name: "Creator" }, ["name"]), true);
    assert.equal(hasOnlyKeys({ name: "Creator", role: "admin" }, ["name"]), false);
});

test("identifiers, slugs, passwords and pagination are strict", () => {
    assert.equal(validObjectId("507f1f77bcf86cd799439011"), true);
    assert.equal(validObjectId("not-an-object-id"), false);
    assert.equal(validSlug("creator-name"), true);
    assert.equal(validSlug("admin"), false);
    assert.equal(validPassword("letters123"), true);
    assert.equal(validPassword("onlyletters"), false);
    assert.deepEqual(parsePagination({ page: "2", limit: "12", category: "Travel" }), { page: 2, limit: 12, category: "Travel" });
    assert.ok(parsePagination({ page: { $gt: "" } }).error);
    assert.ok(parsePagination({ page: "0" }).error);
    assert.ok(parsePagination({ unknown: "1" }).error);
});

test("upload signature detection matches declared media families", () => {
    assert.equal(detectType(Buffer.from("ffd8ff00", "hex")), "image/jpeg");
    assert.equal(detectType(Buffer.from("89504e470d0a1a0a00000000", "hex")), "image/png");
    assert.equal(detectType(Buffer.from("524946460000000057454250", "hex")), "image/webp");
    assert.equal(detectType(Buffer.from("1a45dfa300000000", "hex")), "video/webm");
    assert.equal(detectType(Buffer.from("000000186674797069736f6d", "hex")), "video/iso-base-media");
    assert.equal(compatible("video/quicktime", "video/iso-base-media"), true);
    assert.equal(compatible("image/png", "image/jpeg"), false);
    assert.equal(detectType(Buffer.from("plain text")), "");
});

test("production configuration requires HTTPS and independent non-placeholder secrets", () => {
    const keys = ["NODE_ENV", "MONGO_URI", "MONGO_SERVER_SELECTION_TIMEOUT_MS", "JWT_SECRET", "JWT_EXPIRES_IN", "OTP_HASH_SECRET", "MEDIA_SIGNING_SECRET", "MEDIA_URL_TTL_SECONDS", "FRONTEND_URL", "CORS_ORIGINS", "EMAIL_USER", "EMAIL_PASS", "PORT", "TRUST_PROXY"];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
        Object.assign(process.env, {
            NODE_ENV: "production",
            MONGO_URI: "mongodb://127.0.0.1:27017/wcase",
            MONGO_SERVER_SELECTION_TIMEOUT_MS: "10000",
            JWT_SECRET: "replace-with-a-random-secret-at-least-32-characters-long",
            JWT_EXPIRES_IN: "1h",
            OTP_HASH_SECRET: "replace-with-a-random-secret-at-least-32-characters-long",
            MEDIA_SIGNING_SECRET: "replace-with-a-random-secret-at-least-32-characters-long",
            MEDIA_URL_TTL_SECONDS: "3600",
            FRONTEND_URL: "http://localhost:5173",
            CORS_ORIGINS: "http://localhost:5173",
            EMAIL_USER: "operator@wcase.invalid",
            EMAIL_PASS: "not-a-real-password",
            PORT: "5050",
            TRUST_PROXY: "1"
        });
        assert.throws(validateEnvironment, /Invalid server configuration/);

        Object.assign(process.env, {
            JWT_SECRET: "a".repeat(48),
            OTP_HASH_SECRET: "b".repeat(48),
            MEDIA_SIGNING_SECRET: "c".repeat(48),
            FRONTEND_URL: "https://wcase.example",
            CORS_ORIGINS: "https://wcase.example"
        });
        assert.doesNotThrow(validateEnvironment);
    } finally {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    }
});
