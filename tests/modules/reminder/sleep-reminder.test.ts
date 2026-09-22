import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../../src/modules/reminder/reminder.repository";
import { reminderCommand } from "../../../src/modules/reminder/reminder.commands";
import { ReminderScheduler } from "../../../src/modules/reminder/reminder.scheduler";
import { ReminderProfileWithUser } from "../../../src/modules/reminder/reminder.types";

test("a) reminderService.getSleepReminderMessage(name) returns sleep reminder message", () => {
    const service = new ReminderService();
    const msgWithName = service.getSleepReminderMessage("Alice");
    assert.match(msgWithName, /Alice/);
    assert.match(msgWithName, /tidur|istirahat/i);

    const msgNoName = service.getSleepReminderMessage();
    assert.match(msgNoName, /tidur|istirahat/i);
});

test("b) reminderService.getStatus(profile) displays sleep reminder status and time", async () => {
    const mockProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
        sleepTime: "22:00",
        sleepEnabled: true,
        lastSentSleep: null,
        lastSleepDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    const mockRepo = {
        getOrCreate: async () => mockProfile,
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const status = await service.getStatus("628123456789@c.us", "Alice");

    assert.match(status, /Tidur\s*:\s*22:00\s*\(aktif\)/i);
});

test("c) reminderService.getHelpMessage() includes sleep reminder usage", () => {
    const service = new ReminderService();
    const help = service.getHelpMessage();
    assert.match(help, /!reminder set sleep <HH:mm>/i);
    assert.match(help, /!reminder toggle sleep/i);
    assert.match(help, /sleep/i);
});

test("d) reminderRepository.updateSettings handles sleepTime/sleepEnabled and markSleepSent updates lastSentSleep & lastSleepDate", async () => {
    let updatedData: any = null;
    let markSleepData: any = null;

    const mockDb = {
        reminderProfile: {
            update: async ({ where, data }: any) => {
                if ("sleepTime" in data || "sleepEnabled" in data) {
                    updatedData = data;
                }
                if ("lastSentSleep" in data || "lastSleepDate" in data) {
                    markSleepData = data;
                }
                return { userId: where.userId, ...data };
            },
        },
    };

    const repo = new ReminderRepository(mockDb as any);
    await repo.updateSettings(1, { sleepTime: "23:00", sleepEnabled: false });
    assert.equal(updatedData.sleepTime, "23:00");
    assert.equal(updatedData.sleepEnabled, false);

    await repo.markSleepSent(1, "23:00", "2026-09-22");
    assert.equal(markSleepData.lastSentSleep, "23:00");
    assert.equal(markSleepData.lastSleepDate, "2026-09-22");
});

test("e) reminderCommand handles set sleep 23:00, toggle sleep, test sleep", async () => {
    let updatedSettings: any = null;
    let toggledSleep: boolean | undefined = undefined;
    const mockProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
        sleepTime: "22:00",
        sleepEnabled: true,
        lastSentSleep: null,
        lastSleepDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123@c.us", name: "Alice" },
    };

    const mockDb = {
        user: {
            findUnique: async () => ({ id: 1, waId: "628123@c.us", name: "Alice" }),
        },
        reminderProfile: {
            findUnique: async () => mockProfile,
            update: async ({ data }: any) => {
                if (data.sleepTime !== undefined) updatedSettings = data;
                if (data.sleepEnabled !== undefined) {
                    toggledSleep = data.sleepEnabled;
                    mockProfile.sleepEnabled = data.sleepEnabled;
                }
                return { ...mockProfile, ...data };
            },
        },
    };

    const mockService = new ReminderService(new ReminderRepository(mockDb as any));

    const replies: string[] = [];
    const mockMessage = {
        getContact: async () => ({ id: { _serialized: "628123@c.us" }, pushname: "Alice" }),
        reply: async (text: string) => {
            replies.push(text);
        },
    } as any;

    await reminderCommand(mockMessage, "!reminder set sleep 23:00", mockService);
    assert.match(replies[replies.length - 1], /23:00/);

    await reminderCommand(mockMessage, "!reminder toggle sleep", mockService);
    assert.match(replies[replies.length - 1], /tidur/i);

    await reminderCommand(mockMessage, "!reminder test sleep", mockService);
    assert.match(replies[replies.length - 1], /\[TEST NOTIFICATION\]/);
    assert.match(replies[replies.length - 1], /tidur|istirahat/i);
});

test("f) reminderScheduler triggers sleep message when current time matches sleepTime and user is enabled, and does not re-dispatch on duplicate check", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
        sleepTime: "22:00",
        sleepEnabled: true,
        lastSentSleep: null,
        lastSleepDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    let markedSleepTime: string | null = null;
    let markedDate: string | null = null;

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
        markSholatSent: async () => {},
        markSleepSent: async (_userId: number, sleepTime: string, date: string) => {
            markedSleepTime = sleepTime;
            markedDate = date;
        },
    } as any;

    const sentMessages: { target: string; content: string }[] = [];
    const service = new ReminderService();
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        sentMessages.push({ target, content });
    });

    // 22:00 WIB is 15:00 UTC
    const fixedUtc = new Date("2026-09-22T15:00:00Z");
    const count1 = await scheduler.tick(fixedUtc);

    assert.equal(count1, 1);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].content, /tidur|istirahat/i);
    assert.equal(markedSleepTime, "22:00");
    assert.equal(markedDate, "2026-09-22");

    // Second tick on same time should deduplicate
    const count2 = await scheduler.tick(fixedUtc);
    assert.equal(count2, 0);
    assert.equal(sentMessages.length, 1);
});
