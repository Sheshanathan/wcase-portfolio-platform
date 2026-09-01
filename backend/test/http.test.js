const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-that-is-at-least-32-characters";
process.env.CORS_ORIGINS = "http://localhost:5173";
const { app } = require("../server");

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => { await new Promise((resolve) => server.close(resolve)); });

test("unknown API routes return a safe 404 response", async () => {
    const response = await fetch(`${baseUrl}/api/not-a-route`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { success: false, message: "API route not found" });
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-permitted-cross-domain-policies"), "none");
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("malformed upload paths are not served directly", async () => {
    const response = await fetch(`${baseUrl}/uploads/not_a_valid_upload.png`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { success: false, message: "File not found" });

    const traversal = await fetch(`${baseUrl}/uploads/%2e%2e%2fserver.js`);
    assert.ok([400, 404].includes(traversal.status));
});

test("malformed JSON and unsafe operators return 400, not 500", async () => {
    const malformed = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).message, "Malformed JSON request");
    const unsafe = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: { $gt: "" }, password: "anything" }) });
    assert.equal(unsafe.status, 400);
});

test("malformed bearer tokens are rejected without a database query", async () => {
    const response = await fetch(`${baseUrl}/api/auth/profile`, { headers: { Authorization: "Bearer malformed" } });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
});

test("unapproved browser origins are rejected safely", async () => {
    const response = await fetch(`${baseUrl}/api/not-a-route`, { headers: { Origin: "https://attacker.example" } });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).message, "Origin is not allowed");
});

test("oversized JSON payloads are rejected with 413", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "person@example.com", password: "x".repeat(270_000) })
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).message, "Request body is too large");
});

test("malformed public parameters and unknown query fields fail before database access", async () => {
    const invalidSlug = await fetch(`${baseUrl}/api/enquiries/public/not%20a%20slug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    assert.equal(invalidSlug.status, 400);

    const invalidQuery = await fetch(`${baseUrl}/api/portfolios/public/creator-name/page?unknown=true`);
    assert.equal(invalidQuery.status, 400);
    assert.equal((await invalidQuery.json()).message, "Invalid query parameters");

    const invalidWorkView = await fetch(`${baseUrl}/api/works/public/creator-name/not-a-work-id/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: "visitor_identifier_123456" })
    });
    assert.equal(invalidWorkView.status, 400);
    assert.equal((await invalidWorkView.json()).message, "Invalid work view request");

    const invalidPortfolioView = await fetch(`${baseUrl}/api/portfolios/public/creator-name/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: "too-short" })
    });
    assert.equal(invalidPortfolioView.status, 400);
    assert.equal((await invalidPortfolioView.json()).message, "Invalid portfolio view request");
});

test("authenticated view tracking rejects invalid sessions before counting", async () => {
    const response = await fetch(`${baseUrl}/api/portfolios/public/creator-name/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer malformed" },
        body: JSON.stringify({ visitorId: "visitor_identifier_123456" })
    });
    assert.equal(response.status, 401);
});

test("authentication inputs are independently validated by the API", async () => {
    const register = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Creator", email: "creator@example.com", password: "Secure123", confirmPassword: "Different123", otp: "123456" })
    });
    assert.equal(register.status, 400);
    assert.ok((await register.json()).errors.confirmPassword);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "anything" })
    });
    assert.equal(login.status, 400);

    const forgot = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" })
    });
    assert.equal(forgot.status, 400);

    const reset = await fetch(`${baseUrl}/api/auth/reset-password/not-a-token`);
    assert.equal(reset.status, 400);
});
