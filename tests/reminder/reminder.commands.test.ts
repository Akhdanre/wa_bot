import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { reminderCommand } from "../../src/modules/reminder/reminder.commands";
import { isValidSholatPrayer } from "../../src/modules/reminder/reminder.types";

test("reminderCommand handles test prayer preview", async () => {
    let repliedText = "";
    const mockMessage = {
        getContact: async () => ({ id: { _serialized: "628123@c.us" }, pushname: "Alice" }),
        reply: async (text: string) => {
            repliedText = text;
        },
    } as any;

    await reminderCommand(mockMessage, "!reminder test subuh");
    assert.match(repliedText, /\[TEST NOTIFICATION\]/);
    assert.match(repliedText, /adzan Subuh nih/);
});

test("reminderCommand handles toggle sholat", async () => {
    let repliedText = "";
    const mockMessage = {
        getContact: async () => ({ id: { _serialized: "628123@c.us" }, pushname: "Alice" }),
        reply: async (text: string) => {
            repliedText = text;
        },
    } as any;

    await reminderCommand(mockMessage, "!reminder toggle sholat");
    assert.match(repliedText, /Pengingat sholat/);
});
