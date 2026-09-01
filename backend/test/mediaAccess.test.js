const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-that-is-at-least-32-characters";
process.env.MEDIA_URL_TTL_SECONDS = "3600";

const {
    signMediaPath,
    verifySignedMediaPath,
    withSignedPortfolioMedia,
    withSignedWorkMedia
} = require("../services/mediaAccessService");
const Portfolio = require("../models/Portfolio");
const Work = require("../models/Work");
const { isPublicMedia } = require("../controllers/mediaController");

const parseSigned = (value) => {
    const parsed = new URL(value, "https://wcase.example");
    return { path: parsed.pathname, expires: parsed.searchParams.get("expires"), signature: parsed.searchParams.get("signature") };
};

test("owner media URLs are short-lived and tamper resistant", () => {
    const signed = parseSigned(signMediaPath("/uploads/550e8400-e29b-41d4-a716-446655440000.mp4"));
    assert.equal(verifySignedMediaPath(signed.path, signed.expires, signed.signature), true);
    assert.equal(verifySignedMediaPath("/uploads/another-file.mp4", signed.expires, signed.signature), false);
    const changed = `${signed.signature[0] === "a" ? "b" : "a"}${signed.signature.slice(1)}`;
    assert.equal(verifySignedMediaPath(signed.path, signed.expires, changed), false);
    assert.equal(signMediaPath("https://attacker.example/file.mp4"), "https://attacker.example/file.mp4");
});

test("owner DTO helpers sign only media fields and do not mutate source values", () => {
    const portfolio = { title: "Creator", profileImage: "/uploads/profile.png", coverImage: "" };
    const work = { title: "Film", filePath: "/uploads/work.mp4", thumbnailPath: "/uploads/thumb.jpg" };
    const signedPortfolio = withSignedPortfolioMedia(portfolio);
    const signedWork = withSignedWorkMedia(work);
    assert.match(signedPortfolio.profileImage, /^\/uploads\/profile\.png\?expires=/);
    assert.match(signedWork.filePath, /^\/uploads\/work\.mp4\?expires=/);
    assert.match(signedWork.thumbnailPath, /^\/uploads\/thumb\.jpg\?expires=/);
    assert.equal(portfolio.profileImage, "/uploads/profile.png");
    assert.equal(work.filePath, "/uploads/work.mp4");
});

test("unsigned media is available only while its owning content is public", async () => {
    const originalPortfolioFind = Portfolio.findOne;
    const originalPortfolioExists = Portfolio.exists;
    const originalWorkFind = Work.findOne;
    try {
        Portfolio.findOne = () => ({ select: async () => ({ profileImage: "/uploads/profile.png", coverImage: "", visibility: { profileImage: true } }) });
        Work.findOne = () => ({ select: async () => null });
        assert.equal(await isPublicMedia("/uploads/profile.png"), true);

        Portfolio.findOne = () => ({ select: async () => ({ profileImage: "/uploads/profile.png", coverImage: "", visibility: { profileImage: false } }) });
        assert.equal(await isPublicMedia("/uploads/profile.png"), false);

        Portfolio.findOne = () => ({ select: async () => null });
        Work.findOne = () => ({ select: async () => ({ portfolio: "507f1f77bcf86cd799439011" }) });
        Portfolio.exists = async () => ({ _id: "507f1f77bcf86cd799439011" });
        assert.equal(await isPublicMedia("/uploads/work.mp4"), true);
        Portfolio.exists = async () => null;
        assert.equal(await isPublicMedia("/uploads/work.mp4"), false);
    } finally {
        Portfolio.findOne = originalPortfolioFind;
        Portfolio.exists = originalPortfolioExists;
        Work.findOne = originalWorkFind;
    }
});
