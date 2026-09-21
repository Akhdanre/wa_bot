import test from "node:test";
import assert from "node:assert/strict";
import { EquranClient } from "../../src/modules/reminder/api/equran.client";

test("EquranClient.getProvinces returns array of provinces", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(input.toString(), "https://equran.id/api/v2/shalat/provinsi");
        return {
            ok: true,
            status: 200,
            json: async () => ({
                code: 200,
                message: "Success",
                data: ["Aceh", "Bali", "DKI Jakarta", "Jawa Barat"],
            }),
        } as Response;
    };

    try {
        const client = new EquranClient();
        const provinces = await client.getProvinces();
        assert.equal(provinces.length, 4);
        assert.equal(provinces[2], "DKI Jakarta");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("EquranClient.getKabKota posts province and returns cities", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(input.toString(), "https://equran.id/api/v2/shalat/kabkota");
        assert.equal(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assert.equal(body.provinsi, "DKI Jakarta");

        return {
            ok: true,
            status: 200,
            json: async () => ({
                code: 200,
                message: "Success",
                data: ["Kota Jakarta Pusat", "Kota Jakarta Selatan"],
            }),
        } as Response;
    };

    try {
        const client = new EquranClient();
        const cities = await client.getKabKota("DKI Jakarta");
        assert.equal(cities.length, 2);
        assert.equal(cities[0], "Kota Jakarta Pusat");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("EquranClient.getMonthlySchedule posts location and returns daily schedules", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        assert.equal(input.toString(), "https://equran.id/api/v2/shalat");
        assert.equal(init?.method, "POST");
        const body = JSON.parse(init?.body as string);
        assert.equal(body.provinsi, "DKI Jakarta");
        assert.equal(body.kabkota, "Kota Jakarta Pusat");
        assert.equal(body.bulan, 9);
        assert.equal(body.tahun, 2026);

        return {
            ok: true,
            status: 200,
            json: async () => ({
                code: 200,
                message: "Success",
                data: {
                    provinsi: "DKI Jakarta",
                    kabkota: "Kota Jakarta Pusat",
                    bulan: 9,
                    tahun: 2026,
                    jadwal: [
                        {
                            tanggal: 21,
                            hari: "Senin",
                            subuh: "04:35",
                            dzuhur: "11:55",
                            ashar: "15:08",
                            maghrib: "17:58",
                            isya: "19:07",
                        },
                    ],
                },
            }),
        } as Response;
    };

    try {
        const client = new EquranClient();
        const schedule = await client.getMonthlySchedule("DKI Jakarta", "Kota Jakarta Pusat", 9, 2026);
        assert.equal(schedule.length, 1);
        assert.equal(schedule[0].tanggal, 21);
        assert.equal(schedule[0].subuh, "04:35");
        assert.equal(schedule[0].maghrib, "17:58");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("EquranClient throws typed error when HTTP status is not ok", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
        } as Response;
    };

    try {
        const client = new EquranClient();
        await assert.rejects(
            async () => await client.getProvinces(),
            /Failed to fetch provinces: 500 Internal Server Error/
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});
