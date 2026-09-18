const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const { publicUser } = require("../controllers/authController");

test("existing users without a tour flag are not treated as pending", () => {
    const user = new User({ name: "Existing Creator", email: "existing@example.com", password: "hashed-password" });
    assert.equal(user.dashboardTourPending, undefined);
    assert.equal(publicUser(user).dashboardTourPending, false);
});

test("new users explicitly marked for onboarding are returned as pending", () => {
    const user = new User({ name: "New Creator", email: "new@example.com", password: "hashed-password", dashboardTourPending: true });
    assert.equal(publicUser(user).dashboardTourPending, true);
});
