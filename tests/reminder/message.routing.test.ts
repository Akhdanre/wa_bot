import test from "node:test";
import assert from "node:assert/strict";
import { MessageService } from "../../src/modules/message/message.service";
import {
    startLocationSession,
    clearLocationSession,
    hasActiveLocationSession,
} from "../../src/modules/reminder/reminder.session";
import { EquranClient } from "../../src/modules/reminder/api/equran.client";

test("MessageService location session routing and command bypass", async () => {
    const waId = "628999111222@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta", "Jawa Barat"],
        getKabKota: async () => ["Kota Jakarta Pusat"],
    } as unknown as EquranClient;

    await startLocationSession(waId, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);

    const service = new MessageService();

    // 1. Group message does NOT intercept location session even if waId has active session
    let groupReplied = false;
    const groupMessage = {
        from: "123456789@g.us",
        body: "1",
        type: "chat",
        getContact: async () => ({ id: { _serialized: waId }, pushname: "User" }),
        getChat: async () => ({
            id: { _serialized: "123456789@g.us" },
            name: "Test Group",
            isGroup: true,
        }),
        reply: async () => {
            groupReplied = true;
        },
    } as any;

    await service.handle(groupMessage);
    assert.equal(groupReplied, false);
    // Session is still active at step 1
    assert.equal(hasActiveLocationSession(waId), true);

    // 2. Command (!reminder help) bypasses session interception
    let commandReplyText = "";
    const commandMessage = {
        from: waId,
        body: "!reminder help",
        type: "chat",
        getContact: async () => ({ id: { _serialized: waId }, pushname: "User" }),
        reply: async (text: string) => {
            commandReplyText = text;
        },
    } as any;

    await service.handle(commandMessage);
    assert.match(commandReplyText, /Reminder Help/);
    // Session is still active at step 1
    assert.equal(hasActiveLocationSession(waId), true);

    // 3. Normal text input in DM intercepts and progresses session
    let sessionReplyText = "";
    const inputMessage = {
        from: waId,
        body: "1",
        type: "chat",
        getContact: async () => ({ id: { _serialized: waId }, pushname: "User" }),
        reply: async (text: string) => {
            sessionReplyText = text;
        },
    } as any;

    await service.handle(inputMessage);
    assert.match(sessionReplyText, /Pilih Kota\/Kabupaten di \*DKI Jakarta\*/);
});
