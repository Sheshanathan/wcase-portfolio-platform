const test = require("node:test");
const assert = require("node:assert/strict");
const Enquiry = require("../models/Enquiry");
const Portfolio = require("../models/Portfolio");
const { list } = require("../controllers/enquiryController");
const { recordView } = require("../controllers/portfolioController");

const response = () => ({
    statusCode: 200,
    payload: null,
    ended: false,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.payload = value; return this; },
    end() { this.ended = true; return this; }
});

test("creator enquiry analytics are counted only with the authenticated user filter", async () => {
    const originalFind = Enquiry.find;
    const originalCount = Enquiry.countDocuments;
    const userId = "507f1f77bcf86cd799439011";
    const filters = [];
    Enquiry.find = (filter) => {
        filters.push(filter);
        return { sort() { return this; }, limit: async () => [{ _id: "one" }] };
    };
    Enquiry.countDocuments = async (filter) => { filters.push(filter); return 241; };
    const res = response();
    try {
        await list({ user: { _id: userId } }, res, (error) => { throw error; });
        assert.equal(res.statusCode, 200);
        assert.equal(res.payload.total, 241);
        assert.equal(res.payload.enquiries.length, 1);
        assert.deepEqual(filters, [{ user: userId }, { user: userId }]);
    } finally {
        Enquiry.find = originalFind;
        Enquiry.countDocuments = originalCount;
    }
});

test("authenticated creator and admin portfolio visits do not increment public views", async () => {
    const originalUpdate = Portfolio.updateOne;
    let updateCalls = 0;
    Portfolio.updateOne = async () => { updateCalls += 1; return { matchedCount: 1 }; };
    const res = response();
    try {
        await recordView({ params: { slug: "creator-name" }, body: { visitorId: "visitor_identifier_123456" }, user: { _id: "507f1f77bcf86cd799439011", role: "admin" } }, res, (error) => { throw error; });
        assert.equal(res.statusCode, 204);
        assert.equal(res.ended, true);
        assert.equal(updateCalls, 0);
    } finally {
        Portfolio.updateOne = originalUpdate;
    }
});
