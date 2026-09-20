import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";

test("Full reminder configuration workflow via service", async () => {
    // In-memory fake repository for verification
    const db = new Map<number, any>();
    let idSeq = 1;

    const mockRepo = {
        async getOrCreate(waId: string, name?: string) {
            let item = Array.from(db.values()).find((p) => p.user.waId === waId);
            if (!item) {
                item = {
                    id: idSeq++,
                    userId: idSeq++,
                    enabled: true,
                    breakfastTime: "08:00",
                    lunchTime: "12:30",
                    dinnerTime: "19:00",
                    lastSentMeal: null,
                    lastSentDate: null,
                    user: { id: idSeq, waId, name: name || null },
                };
                db.set(item.userId, item);
            }
            return item;
        },
        async updateSettings(userId: number, data: any) {
            const item = db.get(userId);
            Object.assign(item, data);
            return item;
        },
    } as unknown as ReminderRepository;

    const service = new ReminderService(mockRepo);
    const userWaId = "12345678@c.us";

    // 1. Initial status
    const initialStatus = await service.getStatus(userWaId, "TestUser");
    assert.match(initialStatus, /08:00/);
    assert.match(initialStatus, /12:30/);
    assert.match(initialStatus, /19:00/);
    assert.match(initialStatus, /ACTIVE/);

    // 2. Change breakfast to 07:45
    const setRes = await service.setTime(userWaId, "breakfast", "07:45");
    assert.match(setRes, /07:45/);

    // 3. Disable reminders
    const pauseRes = await service.setEnabled(userWaId, false);
    assert.match(pauseRes, /PAUSED/);

    // 4. Verify updated status
    const updatedStatus = await service.getStatus(userWaId);
    assert.match(updatedStatus, /07:45/);
    assert.match(updatedStatus, /PAUSED/);
});
