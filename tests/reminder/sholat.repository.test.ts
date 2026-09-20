import test from "node:test";
import assert from "node:assert/strict";
import { SholatRepository } from "../../src/modules/reminder/sholat.repository";
import { EquranClient } from "../../src/modules/reminder/api/equran.client";
import { EquranDailySchedule } from "../../src/modules/reminder/api/equran.types";

test("SholatRepository returns cached prayer times from DB if exists", async () => {
    let dbQueryCalled = false;
    let apiCalled = false;

    const mockPrisma = {
        sholatSchedule: {
            findUnique: async () => {
                dbQueryCalled = true;
                return {
                    id: 1,
                    provinsi: "DKI Jakarta",
                    kabkota: "Kota Jakarta Pusat",
                    year: 2026,
                    month: 9,
                    date: "2026-09-21",
                    subuh: "04:35",
                    dzuhur: "11:55",
                    ashar: "15:08",
                    maghrib: "17:58",
                    isya: "19:07",
                };
            },
            createMany: async () => {},
        },
    };

    const mockClient = {
        getMonthlySchedule: async () => {
            apiCalled = true;
            return [];
        },
    } as unknown as EquranClient;

    const repo = new SholatRepository(mockClient, mockPrisma as any);
    const times = await repo.getScheduleForDate("DKI Jakarta", "Kota Jakarta Pusat", "2026-09-21");

    assert.equal(dbQueryCalled, true);
    assert.equal(apiCalled, false);
    assert.deepEqual(times, {
        subuh: "04:35",
        dzuhur: "11:55",
        ashar: "15:08",
        maghrib: "17:58",
        isya: "19:07",
    });
});

test("SholatRepository fetches month from API and bulk saves to DB if missing", async () => {
    let dbQueryCalled = false;
    let createManyCalled = false;
    let savedRecordsCount = 0;

    const mockPrisma = {
        sholatSchedule: {
            findUnique: async () => {
                dbQueryCalled = true;
                return null;
            },
            createMany: async ({ data }: { data: any[] }) => {
                createManyCalled = true;
                savedRecordsCount = data.length;
            },
        },
    };

    const mockSchedules: EquranDailySchedule[] = [
        {
            tanggal: 21,
            hari: "Senin",
            subuh: "04:35",
            dzuhur: "11:55",
            ashar: "15:08",
            maghrib: "17:58",
            isya: "19:07",
        },
        {
            tanggal: 22,
            hari: "Selasa",
            subuh: "04:34",
            dzuhur: "11:54",
            ashar: "15:07",
            maghrib: "17:58",
            isya: "19:07",
        },
    ];

    const mockClient = {
        getMonthlySchedule: async () => mockSchedules,
    } as unknown as EquranClient;

    const repo = new SholatRepository(mockClient, mockPrisma as any);
    const times = await repo.getScheduleForDate("DKI Jakarta", "Kota Jakarta Pusat", "2026-09-21");

    assert.equal(dbQueryCalled, true);
    assert.equal(createManyCalled, true);
    assert.equal(savedRecordsCount, 2);
    assert.deepEqual(times, {
        subuh: "04:35",
        dzuhur: "11:55",
        ashar: "15:08",
        maghrib: "17:58",
        isya: "19:07",
    });
});
