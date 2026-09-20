import test from "node:test";
import assert from "node:assert/strict";
import { ReminderService } from "../../src/modules/reminder/reminder.service";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { SholatRepository } from "../../src/modules/reminder/sholat.repository";
import { EquranClient } from "../../src/modules/reminder/api/equran.client";
import {
    startLocationSession,
    handleLocationSessionInput,
    hasActiveLocationSession,
    clearLocationSession,
} from "../../src/modules/reminder/reminder.session";
import { ReminderScheduler } from "../../src/modules/reminder/reminder.scheduler";
import { ReminderProfileWithUser } from "../../src/modules/reminder/reminder.types";

test("Full interactive location setup session (start -> pick prov -> pick kota -> saved)", async () => {
    const waId = "6281122334455@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["Aceh", "DKI Jakarta", "Jawa Barat"],
        getKabKota: async (prov: string) => {
            if (prov === "DKI Jakarta") return ["Kota Jakarta Barat", "Kota Jakarta Pusat"];
            return [];
        },
    } as unknown as EquranClient;

    const db = new Map<number, any>();
    const mockRepo = {
        getOrCreate: async (id: string, name?: string) => {
            let item = db.get(1);
            if (!item) {
                item = { id: 1, userId: 1, provinsi: null, kabkota: null, user: { id: 1, waId: id, name } };
                db.set(1, item);
            }
            return item;
        },
        updateSholatSettings: async (userId: number, data: any) => {
            const item = db.get(userId);
            Object.assign(item, data);
            return item;
        },
    } as unknown as ReminderRepository;

    let prefetched = false;
    const mockSholatRepo = {
        prefetchMonthlySchedule: async (prov: string, kab: string) => {
            if (prov === "DKI Jakarta" && kab === "Kota Jakarta Pusat") {
                prefetched = true;
            }
        },
    } as unknown as SholatRepository;

    // 1. Start session
    const promptProv = await startLocationSession(waId, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);
    assert.match(promptProv, /Pilih Provinsi tempat kamu tinggal yaa/);
    assert.match(promptProv, /2\. DKI Jakarta/);

    // 2. Select Province (index 2: DKI Jakarta)
    const promptCity = await handleLocationSessionInput(waId, "2", mockRepo, mockSholatRepo, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);
    assert.match(promptCity, /Pilih Kota\/Kabupaten di \*DKI Jakarta\*/);
    assert.match(promptCity, /2\. Kota Jakarta Pusat/);

    // 3. Select City (index 2: Kota Jakarta Pusat)
    const finalMsg = await handleLocationSessionInput(waId, "2", mockRepo, mockSholatRepo, mockClient);
    assert.equal(hasActiveLocationSession(waId), false);
    assert.match(finalMsg, /Lokasi sholat berhasil diatur ke \*Kota Jakarta Pusat, DKI Jakarta\*/);

    // Verify DB & prefetch
    const userItem = db.get(1);
    assert.equal(userItem.provinsi, "DKI Jakarta");
    assert.equal(userItem.kabkota, "Kota Jakarta Pusat");
    assert.equal(prefetched, true);
});

test("Direct shortcut location setup (setDirectLocation)", async () => {
    const db = new Map<number, any>();
    const mockRepo = {
        getOrCreate: async (waId: string, name?: string) => {
            let item = db.get(1);
            if (!item) {
                item = { id: 1, userId: 1, provinsi: null, kabkota: null, user: { id: 1, waId, name } };
                db.set(1, item);
            }
            return item;
        },
        updateSholatSettings: async (userId: number, data: any) => {
            const item = db.get(userId);
            Object.assign(item, data);
            return item;
        },
    } as unknown as ReminderRepository;

    let prefetchCalled = false;
    const mockSholatRepo = {
        prefetchMonthlySchedule: async (prov: string, kab: string) => {
            if (prov === "DKI Jakarta" && kab === "Kota Jakarta Selatan") {
                prefetchCalled = true;
            }
        },
    } as unknown as SholatRepository;

    const mockClient = {
        getProvinces: async () => ["Aceh", "DKI Jakarta", "Jawa Barat"],
        getKabKota: async (prov: string) => {
            if (prov.toLowerCase() === "dki jakarta") {
                return ["Kota Jakarta Pusat", "Kota Jakarta Selatan"];
            }
            return [];
        },
    } as unknown as EquranClient;

    const service = new ReminderService(mockRepo, mockSholatRepo, mockClient);
    const waId = "62899887766@c.us";

    // Valid direct shortcut
    const res = await service.setDirectLocation(waId, "DKI Jakarta | Jakarta Selatan", "Budi");
    assert.equal(res.success, true);
    assert.match(res.message, /Berhasil mengatur lokasi sholat ke \*Kota Jakarta Selatan, DKI Jakarta\*/);

    const saved = db.get(1);
    assert.equal(saved.provinsi, "DKI Jakarta");
    assert.equal(saved.kabkota, "Kota Jakarta Selatan");
    assert.equal(prefetchCalled, true);

    // Invalid format test
    const invalidRes = await service.setDirectLocation(waId, "InvalidFormatWithoutPipe");
    assert.equal(invalidRes.success, false);
    assert.match(invalidRes.message, /Gunakan format: \*!reminder loc Provinsi \| Kab\/Kota\*/);
});

test("Prayer reminder dispatch and dual status display", async () => {
    const profileData: ReminderProfileWithUser = {
        id: 1,
        userId: 1,
        enabled: true,
        breakfastTime: "07:00",
        lunchTime: "12:00",
        dinnerTime: "18:30",
        lastSentMeal: null,
        lastSentDate: null,
        sholatEnabled: true,
        provinsi: "DKI Jakarta",
        kabkota: "Kota Jakarta Pusat",
        lastSentSholat: null,
        lastSholatDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 1, waId: "62812345678@c.us", name: "Rian" },
    };

    const mockRepo = {
        getAllActiveProfiles: async () => [profileData],
        getOrCreate: async () => profileData,
        updateSettings: async (_userId: number, data: any) => {
            Object.assign(profileData, data);
            return profileData;
        },
        updateSholatSettings: async (_userId: number, data: any) => {
            Object.assign(profileData, data);
            return profileData;
        },
        markSent: async (_id: number, meal: string, date: string) => {
            profileData.lastSentMeal = meal;
            profileData.lastSentDate = date;
        },
        markSholatSent: async (_id: number, prayer: string, date: string) => {
            profileData.lastSentSholat = prayer;
            profileData.lastSholatDate = date;
        },
    } as unknown as ReminderRepository;

    const mockSholatRepo = {
        getScheduleForDate: async () => ({
            subuh: "04:30",
            dzuhur: "12:00",
            ashar: "15:15",
            maghrib: "18:00",
            isya: "19:15",
        }),
    } as unknown as SholatRepository;

    const service = new ReminderService(mockRepo, mockSholatRepo);

    // 1. Dual status verification
    const status = await service.getStatus(profileData.user.waId, profileData.user.name || undefined);
    assert.match(status, /Meal Reminders: ON/);
    assert.match(status, /Sholat Reminders: ON/);
    assert.match(status, /Lokasi\s+:\s+Kota Jakarta Pusat, DKI Jakarta/);
    assert.match(status, /Dzuhur\s+:\s+12:00 WIB/);

    // 2. Scheduler dispatch verification
    const dispatchedMessages: Array<{ target: string; content: string }> = [];
    const scheduler = new ReminderScheduler(
        mockRepo,
        service,
        async (target: string, content: string) => {
            dispatchedMessages.push({ target, content });
        },
        mockSholatRepo
    );

    // 12:00 WIB = 05:00 UTC
    const fixedUtc = new Date("2026-09-21T05:00:00Z");
    const sentCount = await scheduler.tick(fixedUtc);

    assert.equal(sentCount, 2);
    assert.equal(dispatchedMessages.length, 2);

    const lunchMsg = dispatchedMessages.find((m) => m.content.includes("makan siang") || m.content.includes("Lunch"));
    const sholatMsg = dispatchedMessages.find((m) => m.content.includes("Dzuhur"));

    assert.ok(lunchMsg, "Lunch reminder should have dispatched");
    assert.ok(sholatMsg, "Dzuhur reminder should have dispatched");
    assert.match(lunchMsg!.target, /62812345678@c.us/);
    assert.match(sholatMsg!.target, /62812345678@c.us/);
    assert.match(sholatMsg!.content, /Dzuhur/);
    assert.match(lunchMsg!.content, /Rian/);

    // Verify DB update recorded both dispatches
    assert.equal(profileData.lastSentMeal, "lunch");
    assert.equal(profileData.lastSentDate, "2026-09-21");
    assert.equal(profileData.lastSentSholat, "dzuhur");
    assert.equal(profileData.lastSholatDate, "2026-09-21");
});
