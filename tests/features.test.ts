import test from "node:test";
import assert from "node:assert/strict";
import { FEATURES } from "../src/config/features";
import { MessageService } from "../src/modules/message/message.service";
import { startLocationSession, clearLocationSession, hasActiveLocationSession } from "../src/modules/reminder/reminder.session";
import { EquranClient } from "../src/modules/reminder/api/equran.client";

test("FEATURES default values", () => {
    assert.strictEqual(FEATURES.tracking, false);
    assert.strictEqual(FEATURES.generalCommands, false);
    assert.strictEqual(FEATURES.groupScheduler, false);
    assert.strictEqual(FEATURES.reminder, true);
});

test("MessageService gates generalCommands when disabled", async () => {
    const service = new MessageService();
    let replied = false;
    const message = {
        from: "user@c.us",
        body: "akr-ping",
        type: "chat",
        getContact: async () => ({ id: { _serialized: "user@c.us" }, pushname: "User" }),
        reply: async () => {
            replied = true;
        },
    } as any;

    await service.handle(message);
    assert.strictEqual(replied, false);
});

test("MessageService does not execute tracking when FEATURES.tracking is false", async () => {
    const service = new MessageService();
    // Tracking on group message would fail with DB error if not gated
    const groupMessage = {
        from: "123456789@g.us",
        body: "hello world",
        type: "chat",
        getContact: async () => ({ id: { _serialized: "user@c.us" }, pushname: "User" }),
        getChat: async () => ({
            id: { _serialized: "123456789@g.us" },
            name: "Group",
            isGroup: true,
        }),
    } as any;

    // Should not throw or fail tracking
    await service.handle(groupMessage);
});

test("MessageService allows reminder command and DM location session when FEATURES.reminder is true", async () => {
    const service = new MessageService();
    const waId = "628999000111@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta"],
        getKabKota: async () => ["Kota Jakarta Selatan"],
    } as unknown as EquranClient;

    await startLocationSession(waId, mockClient);
    assert.strictEqual(hasActiveLocationSession(waId), true);

    let repliedText = "";
    const sessionMsg = {
        from: waId,
        body: "1",
        type: "chat",
        getContact: async () => ({ id: { _serialized: waId }, pushname: "User" }),
        reply: async (text: string) => {
            repliedText = text;
        },
    } as any;

    await service.handle(sessionMsg);
    assert.match(repliedText, /Pilih Kota\/Kabupaten/);
});
