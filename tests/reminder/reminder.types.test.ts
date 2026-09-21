import test from "node:test";
import assert from "node:assert/strict";
import { isValidSholatPrayer, SHOLAT_PRAYERS, SholatPrayer } from "../../src/modules/reminder/reminder.types";

test("isValidSholatPrayer identifies all 5 fardhu prayers", () => {
    assert.equal(SHOLAT_PRAYERS.length, 5);
    const expectedPrayers: SholatPrayer[] = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

    for (const prayer of expectedPrayers) {
        assert.equal(isValidSholatPrayer(prayer), true);
        assert.equal(isValidSholatPrayer(prayer.toUpperCase()), true);
    }

    assert.equal(isValidSholatPrayer("imsak"), false);
    assert.equal(isValidSholatPrayer("terbit"), false);
    assert.equal(isValidSholatPrayer("dhuha"), false);
    assert.equal(isValidSholatPrayer("invalid"), false);
});
