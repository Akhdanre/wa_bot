import test from "node:test";
import assert from "node:assert/strict";
import {
    hasActiveLocationSession,
    startLocationSession,
    handleLocationSessionInput,
    clearLocationSession,
} from "../../src/modules/reminder/reminder.session";
import { EquranClient } from "../../src/modules/reminder/api/equran.client";
import { ReminderRepository } from "../../src/modules/reminder/reminder.repository";
import { SholatRepository } from "../../src/modules/reminder/sholat.repository";

test("Location session complete 2-step interactive flow", async () => {
    const waId = "628999888777@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["Aceh", "DKI Jakarta", "Jawa Barat"],
        getKabKota: async (prov: string) =>
            prov === "DKI Jakarta" ? ["Kota Jakarta Pusat", "Kota Jakarta Selatan"] : [],
    } as unknown as EquranClient;

    let savedData: any = null;
    const mockRepo = {
        getOrCreate: async () => ({ id: 1, userId: 1 }),
        updateSholatSettings: async (_userId: number, data: any) => {
            savedData = data;
        },
    } as unknown as ReminderRepository;

    let prefetchCalled = false;
    const mockSholatRepo = {
        prefetchMonthlySchedule: async () => {
            prefetchCalled = true;
        },
    } as unknown as SholatRepository;

    // Step 0: Start session
    const step1Prompt = await startLocationSession(waId, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);
    assert.match(step1Prompt, /Pilih Provinsi tempat kamu tinggal yaa/);
    assert.match(step1Prompt, /1\. Aceh/);
    assert.match(step1Prompt, /2\. DKI Jakarta/);
    assert.match(step1Prompt, /3\. Jawa Barat/);

    // Step 1: User replies with "2" (DKI Jakarta)
    const step2Prompt = await handleLocationSessionInput(
        waId,
        "2",
        mockRepo,
        mockSholatRepo,
        mockClient
    );
    assert.equal(hasActiveLocationSession(waId), true);
    assert.match(step2Prompt, /Pilih Kota\/Kabupaten di \*DKI Jakarta\*/);
    assert.match(step2Prompt, /1\. Kota Jakarta Pusat/);
    assert.match(step2Prompt, /2\. Kota Jakarta Selatan/);

    // Step 2: User replies with "1" (Kota Jakarta Pusat)
    const finalMsg = await handleLocationSessionInput(
        waId,
        "1",
        mockRepo,
        mockSholatRepo,
        mockClient
    );
    assert.equal(hasActiveLocationSession(waId), false);
    assert.match(finalMsg, /Lokasi sholat berhasil diatur ke \*Kota Jakarta Pusat, DKI Jakarta\*/);
    assert.equal(savedData.provinsi, "DKI Jakarta");
    assert.equal(savedData.kabkota, "Kota Jakarta Pusat");
    assert.equal(prefetchCalled, true);
});

test("Location session cancellation with 'batal' or 'cancel'", async () => {
    const waId = "628111222333@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta"],
    } as unknown as EquranClient;

    await startLocationSession(waId, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);

    const cancelMsg = await handleLocationSessionInput(waId, "batal");
    assert.equal(hasActiveLocationSession(waId), false);
    assert.match(cancelMsg, /Pemilihan lokasi dibatalkan ya sayang 💕/);
});

test("Location session out-of-bounds index stays on step and warns user", async () => {
    const waId = "628555666777@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta"],
    } as unknown as EquranClient;

    await startLocationSession(waId, mockClient);
    const warnMsg = await handleLocationSessionInput(waId, "99");
    assert.equal(hasActiveLocationSession(waId), true);
    assert.match(warnMsg, /Nomornya nggak ada di daftar sayang, coba pilih lagi yaa/);
});

test("Location session input when no session active returns expired message", async () => {
    const waId = "628999000111@c.us";
    clearLocationSession(waId);

    const msg = await handleLocationSessionInput(waId, "1");
    assert.match(msg, /Sesi pemilihan lokasi udah berakhir sayang/);
});

test("Location session getKabKota error deletes session and returns friendly error", async () => {
    const waId = "628999000222@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta"],
        getKabKota: async () => {
            throw new Error("Network error");
        },
    } as unknown as EquranClient;

    await startLocationSession(waId, mockClient);
    const msg = await handleLocationSessionInput(waId, "1", undefined, undefined, mockClient);
    assert.equal(hasActiveLocationSession(waId), false);
    assert.match(msg, /Gagal mengambil daftar kota sayang/);
});

test("Location session repo error in step 2 returns friendly error message", async () => {
    const waId = "628999000333@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta"],
        getKabKota: async () => ["Kota Jakarta Pusat"],
    } as unknown as EquranClient;

    const mockRepo = {
        getOrCreate: async () => {
            throw new Error("DB error");
        },
    } as unknown as ReminderRepository;

    await startLocationSession(waId, mockClient);
    await handleLocationSessionInput(waId, "1", undefined, undefined, mockClient);

    const msg = await handleLocationSessionInput(waId, "1", mockRepo, undefined, mockClient);
    assert.match(msg, /Maaf sayang, ada kendala saat menyimpan lokasi kamu/);
});

test("startLocationSession resets any existing session for the waId", async () => {
    const waId = "628999000444@c.us";
    clearLocationSession(waId);

    const mockClient = {
        getProvinces: async () => ["DKI Jakarta", "Jawa Barat"],
        getKabKota: async () => ["Kota Bandung"],
    } as unknown as EquranClient;

    // Start session and advance to step 2
    await startLocationSession(waId, mockClient);
    await handleLocationSessionInput(waId, "2", undefined, undefined, mockClient);
    assert.equal(hasActiveLocationSession(waId), true);

    // Call startLocationSession again (simulating user calling !reminder loc again)
    const restartPrompt = await startLocationSession(waId, mockClient);
    assert.match(restartPrompt, /Pilih Provinsi tempat kamu tinggal yaa/);

    // Next input "1" should pick DKI Jakarta (step 1), NOT Kota Bandung (step 2)
    const nextStepPrompt = await handleLocationSessionInput(waId, "1", undefined, undefined, mockClient);
    assert.match(nextStepPrompt, /Pilih Kota\/Kabupaten di \*DKI Jakarta\*/);
});


