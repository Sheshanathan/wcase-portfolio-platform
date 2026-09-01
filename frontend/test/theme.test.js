import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, readExplicitThemePreference, saveExplicitThemePreference } from "../src/utils/theme.js";

const makeStorage = (initial) => {
    const values = new Map(Object.entries(initial || {}));
    return {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
        value: (key) => values.get(key)
    };
};

test("a missing preference starts in Default Mode without creating a preference", () => {
    const storage = makeStorage();
    globalThis.localStorage = storage;
    assert.equal(readExplicitThemePreference(), DEFAULT_THEME);
    assert.equal(storage.value("wcase-theme"), undefined);
});

test("legacy, null, malformed and unsupported preferences fall back safely", () => {
    for (const value of ["space", "null", "{broken", JSON.stringify({ version: 0, explicit: true, theme: "space" }), JSON.stringify({ version: 1, explicit: false, theme: "space" }), JSON.stringify({ version: 1, explicit: true, theme: "unknown" })]) {
        const storage = makeStorage({ "wcase-theme": value });
        globalThis.localStorage = storage;
        assert.equal(readExplicitThemePreference(), DEFAULT_THEME);
        assert.equal(storage.value("wcase-theme"), undefined);
    }
});

test("only a current explicitly saved preference is restored", () => {
    const storage = makeStorage({ "wcase-theme": JSON.stringify({ version: 1, explicit: true, theme: "space" }) });
    globalThis.localStorage = storage;
    assert.equal(readExplicitThemePreference(), "space");
    assert.equal(saveExplicitThemePreference("default"), true);
    assert.deepEqual(JSON.parse(storage.value("wcase-theme")), { version: 1, explicit: true, theme: "default" });
    assert.equal(saveExplicitThemePreference("invalid"), false);
});
