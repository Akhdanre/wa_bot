import test from "node:test";
import assert from "node:assert/strict";
import { getCurrentTimeWIB, ReminderScheduler, startReminderScheduler } from "../../src/modules/reminder/reminder.scheduler";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderProfileWithUser } from "../../src/modules/reminder/reminder.types";

test("getCurrentTimeWIB formats UTC+7 time correctly", () => {
    // UTC 2026-09-20 01:00:00 is WIB 2026-09-20 08:00:00 (+7 hours)
    const fixedUtc = new Date("2026-09-20T01:00:00Z");
    const { timeStr, dateStr } = getCurrentTimeWIB(fixedUtc);
    assert.equal(timeStr, "08:00");
    assert.equal(dateStr, "2026-09-20");
});

test("ReminderScheduler dispatches reminder when current time matches profile", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Bob" },
    };

    let markedMeal: string | null = null;
    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async (_userId: number, meal: string, _date: string) => {
            markedMeal = meal;
        },
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const sentMessages: { target: string; content: string }[] = [];
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        sentMessages.push({ target, content });
    });

    // 01:00 UTC = 08:00 WIB (breakfast)
    const fixedUtc = new Date("2026-09-20T01:00:00Z");
    const sentCount = await scheduler.tick(fixedUtc);

    assert.equal(sentCount, 1);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].target, "628123456789@c.us");
    assert.match(sentMessages[0].content, /sarapan|pagi/i);
    assert.equal(markedMeal, "breakfast");
});

test("ReminderScheduler skips if already sent for same date and meal", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: "breakfast",
        lastSentDate: "2026-09-20",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Bob" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const sentMessages: { target: string; content: string }[] = [];
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        sentMessages.push({ target, content });
    });

    const fixedUtc = new Date("2026-09-20T01:00:00Z");
    const sentCount = await scheduler.tick(fixedUtc);

    assert.equal(sentCount, 0);
    assert.equal(sentMessages.length, 0);
});

test("ReminderScheduler in-memory dedup prevents duplicate sends even if repository does not update profile", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Bob" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const sentMessages: { target: string; content: string }[] = [];
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        sentMessages.push({ target, content });
    });

    const fixedUtc = new Date("2026-09-20T01:00:00Z");
    const firstCount = await scheduler.tick(fixedUtc);
    assert.equal(firstCount, 1);
    assert.equal(sentMessages.length, 1);

    // Second tick without DB profile change
    const secondCount = await scheduler.tick(fixedUtc);
    assert.equal(secondCount, 0);
    assert.equal(sentMessages.length, 1);
});

test("ReminderScheduler removes key from inMemorySent if sendMessage fails", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Bob" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    let shouldFail = true;
    const sentMessages: { target: string; content: string }[] = [];
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        if (shouldFail) {
            throw new Error("Network error");
        }
        sentMessages.push({ target, content });
    });

    const fixedUtc = new Date("2026-09-20T01:00:00Z");
    const failCount = await scheduler.tick(fixedUtc);
    assert.equal(failCount, 0);
    assert.equal(sentMessages.length, 0);

    // Next tick retry succeeds
    shouldFail = false;
    const retryCount = await scheduler.tick(fixedUtc);
    assert.equal(retryCount, 1);
    assert.equal(sentMessages.length, 1);
});

test("startReminderScheduler returns existing singleton task", () => {
    const task1 = startReminderScheduler();
    const task2 = startReminderScheduler();
    assert.strictEqual(task1, task2);
    task1.stop();
});

