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
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
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
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
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
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
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
        sholatEnabled: false,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
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

test("ReminderScheduler dispatches sholat reminder when current time matches prayer time", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: true,
        provinsi: "DKI Jakarta",
        kabkota: "Kota Jakarta Pusat",
        lastSentSholat: null,
        lastSholatDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    let markedSholat: string | null = null;
    let markedDate: string | null = null;

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
        markSholatSent: async (_userId: number, prayer: string, date: string) => {
            markedSholat = prayer;
            markedDate = date;
        },
    } as any;

    const mockSholatRepo = {
        getScheduleForDate: async () => ({
            subuh: "04:35",
            dzuhur: "11:55",
            ashar: "15:08",
            maghrib: "17:58",
            isya: "19:07",
        }),
    } as any;

    const sentMessages: { target: string; content: string }[] = [];
    const service = new ReminderService();
    const scheduler = new ReminderScheduler(
        mockRepo,
        service,
        async (target, content) => {
            sentMessages.push({ target, content });
        },
        mockSholatRepo
    );

    // 04:35 WIB is 21:35 UTC previous day
    const fixedUtc = new Date("2026-09-20T21:35:00Z");
    const count = await scheduler.tick(fixedUtc);

    assert.equal(count, 1);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].target, "628123456789@c.us");
    assert.match(sentMessages[0].content, /adzan Subuh nih/);
    assert.equal(markedSholat, "subuh");
    assert.equal(markedDate, "2026-09-21");
});

test("ReminderScheduler skips sholat reminder if already sent today", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: true,
        provinsi: "DKI Jakarta",
        kabkota: "Kota Jakarta Pusat",
        lastSentSholat: "subuh",
        lastSholatDate: "2026-09-21",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
        markSholatSent: async () => {},
    } as any;

    const mockSholatRepo = {
        getScheduleForDate: async () => ({
            subuh: "04:35",
            dzuhur: "11:55",
            ashar: "15:08",
            maghrib: "17:58",
            isya: "19:07",
        }),
    } as any;

    const sentMessages: any[] = [];
    const service = new ReminderService();
    const scheduler = new ReminderScheduler(
        mockRepo,
        service,
        async (target, content) => {
            sentMessages.push({ target, content });
        },
        mockSholatRepo
    );

    const fixedUtc = new Date("2026-09-20T21:35:00Z");
    const count = await scheduler.tick(fixedUtc);

    assert.equal(count, 0);
    assert.equal(sentMessages.length, 0);
});

test("ReminderScheduler handles error gracefully when sholatRepo throws", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: true,
        provinsi: "DKI Jakarta",
        kabkota: "Kota Jakarta Pusat",
        lastSentSholat: null,
        lastSholatDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
        markSholatSent: async () => {},
    } as any;

    const mockSholatRepo = {
        getScheduleForDate: async () => {
            throw new Error("DB error");
        },
    } as any;

    const sentMessages: any[] = [];
    const service = new ReminderService();
    const scheduler = new ReminderScheduler(
        mockRepo,
        service,
        async (target, content) => {
            sentMessages.push({ target, content });
        },
        mockSholatRepo
    );

    const fixedUtc = new Date("2026-09-20T21:35:00Z");
    const count = await scheduler.tick(fixedUtc);

    assert.equal(count, 0);
    assert.equal(sentMessages.length, 0);
});

test("ReminderScheduler removes sholat key from inMemorySent if sendMessage fails", async () => {
    const testProfile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: true,
        provinsi: "DKI Jakarta",
        kabkota: "Kota Jakarta Pusat",
        lastSentSholat: null,
        lastSholatDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
        markSholatSent: async () => {},
    } as any;

    const mockSholatRepo = {
        getScheduleForDate: async () => ({
            subuh: "04:35",
            dzuhur: "11:55",
            ashar: "15:08",
            maghrib: "17:58",
            isya: "19:07",
        }),
    } as any;

    let shouldFail = true;
    const sentMessages: any[] = [];
    const service = new ReminderService();
    const scheduler = new ReminderScheduler(
        mockRepo,
        service,
        async (target, content) => {
            if (shouldFail) {
                throw new Error("Send failure");
            }
            sentMessages.push({ target, content });
        },
        mockSholatRepo
    );

    const fixedUtc = new Date("2026-09-20T21:35:00Z");
    const failCount = await scheduler.tick(fixedUtc);
    assert.equal(failCount, 0);
    assert.equal(sentMessages.length, 0);

    // Next tick retry succeeds
    shouldFail = false;
    const retryCount = await scheduler.tick(fixedUtc);
    assert.equal(retryCount, 1);
    assert.equal(sentMessages.length, 1);
});

test("ReminderScheduler prunes inMemorySent keys from previous dates on tick", async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Bob" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [testProfile],
        markSent: async () => {},
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const sentMessages: any[] = [];
    const scheduler = new ReminderScheduler(mockRepo, service, async (target, content) => {
        sentMessages.push({ target, content });
    });

    // Tick on day 1 (2026-09-20)
    const day1Utc = new Date("2026-09-20T01:00:00Z"); // 08:00 WIB
    await scheduler.tick(day1Utc);

    const inMemorySent = (scheduler as any).inMemorySent as Set<string>;
    assert.equal(inMemorySent.has("1:meal:breakfast:2026-09-20"), true);

    // Tick on day 2 (2026-09-21) at 08:00 WIB
    const day2Utc = new Date("2026-09-21T01:00:00Z"); // 08:00 WIB
    await scheduler.tick(day2Utc);

    // Day 1 key must be pruned
    assert.equal(inMemorySent.has("1:meal:breakfast:2026-09-20"), false);
    assert.equal(inMemorySent.has("1:meal:breakfast:2026-09-21"), true);
});

