import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { ReminderProfileWithUser } from "../../src/modules/reminder/reminder.types";

class MockReminderRepository extends ReminderRepository {
    public profile: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "08:00",
        lunchTime: "12:30",
        dinnerTime: "19:00",
        sholatEnabled: true,
        provinsi: null,
        kabkota: null,
        lastSentSholat: null,
        lastSholatDate: null,
        lastSentMeal: null,
        lastSentDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "628123456789@c.us", name: "Alice" },
    };

    override async getOrCreate(waId: string, name?: string): Promise<ReminderProfileWithUser> {
        return this.profile;
    }

    override async updateSettings(
        userId: number,
        data: { enabled?: boolean; breakfastTime?: string; lunchTime?: string; dinnerTime?: string }
    ): Promise<ReminderProfileWithUser> {
        this.profile = { ...this.profile, ...data };
        return this.profile;
    }
}

test("getReminderMessage returns meal-specific reminder message", () => {
    const service = new ReminderService(new MockReminderRepository());

    // With-name (Option B)
    const bfastWithName = service.getReminderMessage("breakfast", "Alice");
    assert.match(bfastWithName, /^\*Alice sayang, pagi!\*/);
    assert.doesNotMatch(bfastWithName, /☀️/);
    assert.match(bfastWithName, /sarapan/i);

    const lunchWithName = service.getReminderMessage("lunch", "Alice");
    assert.match(lunchWithName, /^\*Alice sayang, udah jam makan siang nih!\*/);
    assert.doesNotMatch(lunchWithName, /🍱/);
    assert.match(lunchWithName, /istirahat dulu/i);

    const dinnerWithName = service.getReminderMessage("dinner", "Alice");
    assert.match(dinnerWithName, /^\*Alice sayang, malam!\*/);
    assert.doesNotMatch(dinnerWithName, /🍲/);
    assert.match(dinnerWithName, /makan malam/i);

    // Without-name fallback (absent or empty)
    const bfastNoName = service.getReminderMessage("breakfast");
    assert.match(bfastNoName, /^\*Pagi sayang!\*/);
    assert.doesNotMatch(bfastNoName, /☀️/);

    const lunchEmptyName = service.getReminderMessage("lunch", "");
    assert.match(lunchEmptyName, /^\*Sayang, udah jam makan siang nih!\*/);
    assert.doesNotMatch(lunchEmptyName, /🍱/);

    const dinnerNullName = service.getReminderMessage("dinner", null);
    assert.match(dinnerNullName, /^\*Malam sayang!\*/);
    assert.doesNotMatch(dinnerNullName, /🍲/);
});

test("setTime rejects invalid meal name", async () => {
    const service = new ReminderService(new MockReminderRepository());
    const res = await service.setTime("628123456789@c.us", "brunch", "10:00");
    assert.match(res, /invalid meal/i);
});

test("setTime rejects invalid time format", async () => {
    const service = new ReminderService(new MockReminderRepository());
    const res = await service.setTime("628123456789@c.us", "breakfast", "8:00");
    assert.match(res, /invalid time/i);
});

test("setTime successfully updates meal time", async () => {
    const repo = new MockReminderRepository();
    const service = new ReminderService(repo);
    const res = await service.setTime("628123456789@c.us", "breakfast", "07:30");
    assert.match(res, /breakfast/i);
    assert.match(res, /07:30/);
    assert.equal(repo.profile.breakfastTime, "07:30");
});

test("setEnabled toggles active status", async () => {
    const repo = new MockReminderRepository();
    const service = new ReminderService(repo);
    await service.setEnabled("628123456789@c.us", false);
    assert.equal(repo.profile.enabled, false);
    await service.setEnabled("628123456789@c.us", true);
    assert.equal(repo.profile.enabled, true);
});

test("getSholatReminderMessage returns girlfriend persona messages with name and fallback", () => {
    const service = new ReminderService();

    // Subuh
    const subuhWithName = service.getSholatReminderMessage("subuh", "Alice");
    assert.match(subuhWithName, /^\*Alice sayang, udah adzan Subuh nih\.\.\. 🌅✨\*/);
    assert.match(subuhWithName, /wudhu terus sholat Subuh/);

    const subuhNoName = service.getSholatReminderMessage("subuh");
    assert.match(subuhNoName, /^\*Sayang, udah adzan Subuh nih\.\.\. 🌅✨\*/);

    // Dzuhur
    const dzuhurMsg = service.getSholatReminderMessage("dzuhur", "Alice");
    assert.match(dzuhurMsg, /^\*Sayang, udah masuk waktu Dzuhur lho! ☀️🌤️\*/);
    assert.match(dzuhurMsg, /langsung makan siang yaa/);

    // Ashar
    const asharMsg = service.getSholatReminderMessage("ashar", "Alice");
    assert.match(asharMsg, /^\*Alice sayang, waktu Ashar udah tiba nih 🌇💫\*/);

    // Maghrib
    const maghribMsg = service.getSholatReminderMessage("maghrib", "Alice");
    assert.match(maghribMsg, /^\*Sayangku, udah adzan Maghrib\.\.\. 🌆🌙\*/);

    // Isya
    const isyaMsg = service.getSholatReminderMessage("isya", "Alice");
    assert.match(isyaMsg, /^\*Alice sayang, udah masuk waktu Isya nih 🌃✨\*/);
    assert.match(isyaMsg, /Good night nanti yaa cintaku!/);
});

test("toggleSholat updates sholatEnabled flag and returns message", async () => {
    let updatedEnabled: boolean | undefined;
    const mockRepo = {
        getOrCreate: async () => ({
            id: 1,
            userId: 1,
            enabled: true,
            sholatEnabled: true,
            provinsi: "DKI Jakarta",
            kabkota: "Kota Jakarta Pusat",
        }),
        updateSholatSettings: async (_userId: number, data: { sholatEnabled?: boolean }) => {
            updatedEnabled = data.sholatEnabled;
        },
    } as any;

    const service = new ReminderService(mockRepo);
    const resultOff = await service.toggleSholat("628123456789@c.us", false);
    assert.equal(updatedEnabled, false);
    assert.match(resultOff, /⏸️ Pengingat sholat dinonaktifkan/);

    const resultOn = await service.toggleSholat("628123456789@c.us", true);
    assert.equal(updatedEnabled, true);
    assert.match(resultOn, /✅ Pengingat sholat diaktifkan/);
});

test("setDirectLocation validates and updates location shortcut", async () => {
    let savedLocation: { provinsi?: string; kabkota?: string } | undefined;
    let prefetchCalled = false;

    const mockRepo = {
        getOrCreate: async () => ({ id: 1, userId: 1 }),
        updateSholatSettings: async (_userId: number, data: any) => {
            savedLocation = data;
        },
    } as any;

    const mockSholatRepo = {
        getScheduleForDate: async () => null,
        prefetchMonthlySchedule: async () => {
            prefetchCalled = true;
        },
    } as any;

    const mockEquranClient = {
        getProvinces: async () => ["DKI Jakarta", "Jawa Barat"],
        getKabKota: async (prov: string) =>
            prov === "DKI Jakarta" ? ["Kota Jakarta Pusat", "Kota Jakarta Selatan"] : [],
    } as any;

    const service = new ReminderService(mockRepo, mockSholatRepo, mockEquranClient);

    // Invalid format (no pipe)
    const errRes = await service.setDirectLocation("628123456789@c.us", "DKI Jakarta Kota Jakarta Pusat");
    assert.equal(errRes.success, false);
    assert.match(errRes.message, /Gunakan format: \*!reminder loc Provinsi \| Kab\/Kota\*/);

    // Valid format
    const okRes = await service.setDirectLocation("628123456789@c.us", "DKI Jakarta | Kota Jakarta Selatan");
    assert.equal(okRes.success, true);
    assert.equal(savedLocation?.provinsi, "DKI Jakarta");
    assert.equal(savedLocation?.kabkota, "Kota Jakarta Selatan");
    assert.equal(prefetchCalled, true);
});
