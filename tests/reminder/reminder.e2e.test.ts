import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { SholatRepository } from "../../src/modules/reminder/sholat.repository";

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
                    sholatEnabled: true,
                    provinsi: "DKI Jakarta",
                    kabkota: "Kota Jakarta Pusat",
                    lastSentSholat: null,
                    lastSholatDate: null,
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
        async updateSholatSettings(userId: number, data: any) {
            const item = db.get(userId);
            Object.assign(item, data);
            return item;
        },
    } as unknown as ReminderRepository;

    const mockSholatRepo = {
        async getScheduleForDate() {
            return {
                subuh: "04:35",
                dzuhur: "11:55",
                ashar: "15:08",
                maghrib: "17:58",
                isya: "19:07",
            };
        },
    } as unknown as SholatRepository;

    const service = new ReminderService(mockRepo, mockSholatRepo);
    const userWaId = "12345678@c.us";

    // 1. Initial status shows both meals and sholat
    const initialStatus = await service.getStatus(userWaId, "TestUser");
    assert.match(initialStatus, /08:00/);
    assert.match(initialStatus, /12:30/);
    assert.match(initialStatus, /19:00/);
    assert.match(initialStatus, /Meal Reminders: ON/);
    assert.match(initialStatus, /Sholat Reminders: ON/);
    assert.match(initialStatus, /Kota Jakarta Pusat, DKI Jakarta/);
    assert.match(initialStatus, /Subuh\s+:\s+04:35 WIB/);
    assert.match(initialStatus, /Maghrib\s+:\s+17:58 WIB/);

    // 2. Change breakfast to 07:45
    const setRes = await service.setTime(userWaId, "breakfast", "07:45");
    assert.match(setRes, /07:45/);

    // 3. Toggle sholat off
    const toggleOff = await service.toggleSholat(userWaId, false);
    assert.match(toggleOff, /dinonaktifkan/);

    const statusAfterSholatToggle = await service.getStatus(userWaId);
    assert.match(statusAfterSholatToggle, /Sholat Reminders: PAUSED/);
    assert.match(statusAfterSholatToggle, /Meal Reminders: ON/);

    // 4. Disable master meal reminders
    const pauseRes = await service.setEnabled(userWaId, false);
    assert.match(pauseRes, /PAUSED/);

    // 5. Verify updated status
    const updatedStatus = await service.getStatus(userWaId);
    assert.match(updatedStatus, /07:45/);
    assert.match(updatedStatus, /Meal Reminders: PAUSED/);

    // 6. Test prayer message generation
    const maghribMsg = service.getSholatReminderMessage("maghrib", "TestUser");
    assert.match(maghribMsg, /adzan Maghrib/);
});
