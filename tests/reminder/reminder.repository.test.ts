import test from "node:test";
import assert from "node:assert/strict";
import { MealType, isValidMeal, isValidTime } from "../../src/modules/reminder/reminder.types";

test("isValidMeal returns true for valid meals", () => {
    assert.equal(isValidMeal("breakfast"), true);
    assert.equal(isValidMeal("lunch"), true);
    assert.equal(isValidMeal("dinner"), true);
    assert.equal(isValidMeal("supper"), false);
    assert.equal(isValidMeal(""), false);
});

test("isValidTime validates HH:mm in 24h format", () => {
    assert.equal(isValidTime("08:00"), true);
    assert.equal(isValidTime("00:00"), true);
    assert.equal(isValidTime("23:59"), true);
    assert.equal(isValidTime("24:00"), false);
    assert.equal(isValidTime("8:00"), false);
    assert.equal(isValidTime("12:60"), false);
    assert.equal(isValidTime("invalid"), false);
});
