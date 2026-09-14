const test = require("node:test");
const assert = require("node:assert/strict");
const { sendOtpEmail } = require("../services/mailService");

test("transactional email uses Brevo HTTPS API without putting its key in the payload", async () => {
    const previous = {
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
        BREVO_API_KEY: process.env.BREVO_API_KEY,
        FRONTEND_URL: process.env.FRONTEND_URL,
        fetch: global.fetch
    };
    let request;
    try {
        process.env.EMAIL_USER = "sender@example.com";
        process.env.EMAIL_FROM_NAME = "WCase";
        process.env.BREVO_API_KEY = "test-brevo-api-key-value-123456";
        process.env.FRONTEND_URL = "https://wcase.example";
        global.fetch = async (url, options) => {
            request = { url, options };
            return { ok: true, status: 201 };
        };

        await sendOtpEmail({ to: "creator@example.com", otp: "123456", purpose: "registration" });

        assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
        assert.equal(request.options.method, "POST");
        assert.equal(request.options.headers["api-key"], process.env.BREVO_API_KEY);
        const body = JSON.parse(request.options.body);
        assert.deepEqual(body.sender, { name: "WCase", email: "sender@example.com" });
        assert.deepEqual(body.to, [{ email: "creator@example.com" }]);
        assert.match(body.textContent, /123456/);
        assert.equal(request.options.body.includes(process.env.BREVO_API_KEY), false);
    } finally {
        for (const key of ["EMAIL_USER", "EMAIL_FROM_NAME", "BREVO_API_KEY", "FRONTEND_URL"]) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
        global.fetch = previous.fetch;
    }
});
