import { EquranClient } from "./api/equran.client";
import { ReminderRepository } from "./reminder.repository";
import { SholatRepository } from "./sholat.repository";

interface LocationSession {
    step: 1 | 2;
    provinsiList?: string[];
    selectedProvinsi?: string;
    kabkotaList?: string[];
    createdAt: number;
    expiresAt: number;
}

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const sessions = new Map<string, LocationSession>();

export function clearLocationSession(waId: string): void {
    sessions.delete(waId);
}

export function hasActiveLocationSession(waId: string): boolean {
    const session = sessions.get(waId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
        sessions.delete(waId);
        return false;
    }
    return true;
}

export async function startLocationSession(
    waId: string,
    client: EquranClient = new EquranClient()
): Promise<string> {
    const provinces = await client.getProvinces();
    const now = Date.now();

    sessions.set(waId, {
        step: 1,
        provinsiList: provinces,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
    });

    const listLines = provinces.map((p, idx) => `${idx + 1}. ${p}`).join("\n");

    return (
        `╭─── *Pilih Provinsi* ───\n` +
        `Pilih Provinsi tempat kamu tinggal yaa sayang (balas dengan angka):\n\n` +
        `${listLines}\n\n` +
        `_Ketik *batal* untuk membatalkan._\n` +
        `╰───────────────────────`
    );
}

export async function handleLocationSessionInput(
    waId: string,
    input: string,
    reminderRepo: ReminderRepository = new ReminderRepository(),
    sholatRepo: SholatRepository = new SholatRepository(),
    client: EquranClient = new EquranClient(),
    name?: string
): Promise<string> {
    const session = sessions.get(waId);
    if (!session || Date.now() > session.expiresAt) {
        sessions.delete(waId);
        return "Sesi pemilihan lokasi udah berakhir sayang. Ketik *!reminder loc* lagi yaa kalau mau atur lokasi 💕";
    }

    const trimmed = input.trim();
    if (trimmed.toLowerCase() === "batal" || trimmed.toLowerCase() === "cancel") {
        sessions.delete(waId);
        return "Pemilihan lokasi dibatalkan ya sayang 💕";
    }

    const selectedIndex = parseInt(trimmed, 10);

    if (session.step === 1) {
        const provinces = session.provinsiList || [];
        if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > provinces.length) {
            return "Nomornya nggak ada di daftar sayang, coba pilih lagi yaa (atau ketik *batal* untuk batalin) 🥺";
        }

        const selectedProvinsi = provinces[selectedIndex - 1];
        try {
            const cities = await client.getKabKota(selectedProvinsi);
            session.step = 2;
            session.selectedProvinsi = selectedProvinsi;
            session.kabkotaList = cities;
            session.expiresAt = Date.now() + SESSION_TTL_MS;

            const listLines = cities.map((c, idx) => `${idx + 1}. ${c}`).join("\n");

            return (
                `╭─── *Pilih Kota/Kabupaten* ───\n` +
                `Pilih Kota/Kabupaten di *${selectedProvinsi}* yaa sayang (balas dengan angka):\n\n` +
                `${listLines}\n\n` +
                `_Ketik *batal* untuk membatalkan._\n` +
                `╰─────────────────────────────`
            );
        } catch (err) {
            sessions.delete(waId);
            return "Gagal mengambil daftar kota sayang. Coba lagi nanti yaa 🥺";
        }
    }

    if (session.step === 2) {
        const cities = session.kabkotaList || [];
        if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > cities.length) {
            return "Nomornya nggak ada di daftar sayang, coba pilih lagi yaa (atau ketik *batal* untuk batalin) 🥺";
        }

        const selectedKabkota = cities[selectedIndex - 1];
        const selectedProvinsi = session.selectedProvinsi!;
        sessions.delete(waId);

        try {
            const profile = await reminderRepo.getOrCreate(waId, name);
            await reminderRepo.updateSholatSettings(profile.userId, {
                provinsi: selectedProvinsi,
                kabkota: selectedKabkota,
            });

            // Trigger schedule prefetch
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            await sholatRepo.prefetchMonthlySchedule(selectedProvinsi, selectedKabkota, year, month).catch(() => {});

            return `Alhamdulillah! Lokasi sholat berhasil diatur ke *${selectedKabkota}, ${selectedProvinsi}* yaa sayang. Mulai sekarang aku bakal ingetin kamu waktu sholat tepat waktu 💕✨`;
        } catch (err) {
            return "Maaf sayang, ada kendala saat menyimpan lokasi kamu. Coba lagi yaa 🥺";
        }
    }

    sessions.delete(waId);
    return "Sesi tidak valid.";
}
