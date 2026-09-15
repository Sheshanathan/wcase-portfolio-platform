import test from "node:test";
import assert from "node:assert/strict";
import { PRIVACY_CHOICE_KEY, PRIVACY_CHOICES, clearOptionalStorage, readPrivacyChoice, savePrivacyChoice } from "../src/utils/privacyChoices.js";

const makeStorage = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        value: (key) => values.get(key)
    };
};

test("privacy choice accepts only supported values", () => {
    const storage = makeStorage();
    assert.equal(readPrivacyChoice(storage), "");
    assert.equal(savePrivacyChoice("unknown", storage), false);
    assert.equal(storage.value(PRIVACY_CHOICE_KEY), undefined);
    assert.equal(savePrivacyChoice(PRIVACY_CHOICES.OPTIONAL, storage), true);
    assert.equal(readPrivacyChoice(storage), PRIVACY_CHOICES.OPTIONAL);
});

test("essential-only choice removes optional identifiers", () => {
    const storage = makeStorage({
        wcaseVisitorId: "visitor-id",
        wcaseLikedWorks: "[]",
        wcaseWorkViews: "{}",
        wcasePortfolioViews: "{}"
    });
    assert.equal(savePrivacyChoice(PRIVACY_CHOICES.ESSENTIAL, storage), true);
    assert.equal(readPrivacyChoice(storage), PRIVACY_CHOICES.ESSENTIAL);
    for (const key of ["wcaseVisitorId", "wcaseLikedWorks", "wcaseWorkViews", "wcasePortfolioViews"]) assert.equal(storage.value(key), undefined);
});

test("optional storage can be cleared without removing the recorded choice", () => {
    const storage = makeStorage({ [PRIVACY_CHOICE_KEY]: PRIVACY_CHOICES.OPTIONAL, wcaseVisitorId: "visitor-id" });
    assert.equal(clearOptionalStorage(storage), true);
    assert.equal(storage.value(PRIVACY_CHOICE_KEY), PRIVACY_CHOICES.OPTIONAL);
    assert.equal(storage.value("wcaseVisitorId"), undefined);
});
