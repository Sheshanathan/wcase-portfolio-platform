import test from "node:test";
import assert from "node:assert/strict";
import { calculateTourPosition } from "../src/utils/tourPosition.js";

test("tour card uses its preferred side when that side fits", () => {
    const target = { top: 200, right: 300, bottom: 260, left: 200, width: 100, height: 60 };
    const card = { width: 240, height: 160 };
    assert.deepEqual(calculateTourPosition(target, card, "right", { width: 900, height: 700 }), {
        placement: "right",
        top: 150,
        left: 316
    });
});

test("tour card chooses a fitting side when the preferred side is off screen", () => {
    const target = { top: 200, right: 880, bottom: 260, left: 780, width: 100, height: 60 };
    const card = { width: 240, height: 160 };
    const position = calculateTourPosition(target, card, "right", { width: 900, height: 700 });
    assert.equal(position.placement, "left");
    assert.equal(position.left, 524);
});

test("tour card remains inside a compact viewport", () => {
    const target = { top: 5, right: 315, bottom: 55, left: 5, width: 310, height: 50 };
    const card = { width: 296, height: 250 };
    const position = calculateTourPosition(target, card, "top", { width: 320, height: 480 });
    assert.ok(position.top >= 12);
    assert.ok(position.left >= 12);
    assert.ok(position.top + card.height <= 468);
    assert.ok(position.left + card.width <= 308);
});
