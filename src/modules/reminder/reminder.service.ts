import { ReminderRepository } from "./reminder.repository";
import { SholatRepository } from "./sholat.repository";
import { EquranClient } from "./api/equran.client";
import { MealType, SholatPrayer, isValidMeal, isValidTime } from "./reminder.types";
import { getCurrentTimeWIB } from "./reminder.scheduler";

export class ReminderService {
    constructor(
        private readonly repo: ReminderRepository = new ReminderRepository(),
        private readonly sholatRepo: SholatRepository = new SholatRepository(),
        private readonly equranClient: EquranClient = new EquranClient()
    ) {}

    async getStatus(waId: string, name?: string): Promise<string> {
        const profile = await this.repo.getOrCreate(waId, name);
        const masterStatus = profile.enabled ? "ON" : "OFF";
        const mealStatus = profile.enabled ? "ON" : "PAUSED";
        const sholatStatus = profile.enabled && profile.sholatEnabled ? "ON" : "PAUSED";

        const { dateStr } = getCurrentTimeWIB();
        let sholatScheduleLines = "│ • Jadwal belum tersedia\n";

        if (profile.provinsi && profile.kabkota) {
            try {
                const times = await this.sholatRepo.getScheduleForDate(profile.provinsi, profile.kabkota, dateStr);
                if (times) {
                    sholatScheduleLines =
                        `│ • Lokasi    : ${profile.kabkota}, ${profile.provinsi}\n` +
                        `│ • Subuh     : ${times.subuh} WIB\n` +
                        `│ • Dzuhur    : ${times.dzuhur} WIB\n` +
                        `│ • Ashar     : ${times.ashar} WIB\n` +
                        `│ • Maghrib   : ${times.maghrib} WIB\n` +
                        `│ • Isya      : ${times.isya} WIB\n`;
                }
            } catch (err) {
                sholatScheduleLines = `│ • Lokasi    : ${profile.kabkota}, ${profile.provinsi} (offline)\n`;
            }
        }

        return (
            `╭─── *Reminder Status* ───\n` +
            `│ Master Switch: *${masterStatus}*\n` +
            `│\n` +
            `│ 🍽️ *Meal Reminders: ${mealStatus}*\n` +
            `│ • Breakfast : ${profile.breakfastTime} WIB\n` +
            `│ • Lunch     : ${profile.lunchTime} WIB\n` +
            `│ • Dinner    : ${profile.dinnerTime} WIB\n` +
            `│\n` +
            `│ 🕌 *Sholat Reminders: ${sholatStatus}*\n` +
            sholatScheduleLines +
            `╰─────────────────────────\n\n` +
            `_Use \`!reminder help\` to manage your schedule._`
        );
    }

    async setEnabled(waId: string, enabled: boolean, name?: string): Promise<string> {
        const profile = await this.repo.getOrCreate(waId, name);
        await this.repo.updateSettings(profile.userId, { enabled });
        return enabled
            ? `✅ Eat reminders are now *ACTIVE*. You will receive notifications at your scheduled meal times.`
            : `⏸️ Eat reminders are now *PAUSED*. You will not receive notifications until enabled.`;
    }

    async toggleSholat(waId: string, enabled?: boolean, name?: string): Promise<string> {
        const profile = await this.repo.getOrCreate(waId, name);
        const newEnabled = enabled !== undefined ? enabled : !profile.sholatEnabled;
        await this.repo.updateSholatSettings(profile.userId, { sholatEnabled: newEnabled });
        return newEnabled
            ? `✅ Pengingat sholat diaktifkan yaa sayang! Aku bakal ingetin kamu tiap masuk waktu sholat 💕`
            : `⏸️ Pengingat sholat dinonaktifkan.`;
    }

    async setDirectLocation(
        waId: string,
        rawInput: string,
        name?: string
    ): Promise<{ success: boolean; message: string }> {
        const parts = rawInput.split("|").map((p) => p.trim());
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            return {
                success: false,
                message: `❌ Gunakan format: *!reminder loc Provinsi | Kab/Kota*\nContoh: *!reminder loc DKI Jakarta | Kota Jakarta Selatan*`,
            };
        }

        const [inputProv, inputKab] = parts;
        try {
            const provinces = await this.equranClient.getProvinces();
            const matchedProv = provinces.find((p) => p.toLowerCase() === inputProv.toLowerCase());

            if (!matchedProv) {
                return {
                    success: false,
                    message: `❌ Provinsi "${inputProv}" tidak ditemukan sayang. Gunakan *!reminder loc* untuk memilih dari daftar yaa.`,
                };
            }

            const cities = await this.equranClient.getKabKota(matchedProv);
            const matchedCity = cities.find(
                (c) =>
                    c.toLowerCase() === inputKab.toLowerCase() ||
                    c.toLowerCase().replace(/^(kota|kab\.|kabupaten)\s+/i, "") ===
                        inputKab.toLowerCase().replace(/^(kota|kab\.|kabupaten)\s+/i, "")
            );

            if (!matchedCity) {
                return {
                    success: false,
                    message: `❌ Kota/Kabupaten "${inputKab}" tidak ditemukan di ${matchedProv}. Gunakan *!reminder loc* untuk memilih dari daftar yaa.`,
                };
            }

            const profile = await this.repo.getOrCreate(waId, name);
            await this.repo.updateSholatSettings(profile.userId, {
                provinsi: matchedProv,
                kabkota: matchedCity,
            });

            // Prefetch current month's schedule
            const { year, month } = getCurrentTimeWIB();
            await this.sholatRepo.prefetchMonthlySchedule(matchedProv, matchedCity, year, month).catch(() => {});

            return {
                success: true,
                message: `✅ Berhasil mengatur lokasi sholat ke *${matchedCity}, ${matchedProv}* sayang! 💕`,
            };
        } catch (err) {
            return {
                success: false,
                message: `❌ Maaf sayang, server jadwal sholat sedang bermasalah. Coba lagi nanti yaa 🥺`,
            };
        }
    }

    async setTime(waId: string, mealRaw: string, timeRaw: string, name?: string): Promise<string> {
        const meal = mealRaw.toLowerCase();
        if (!isValidMeal(meal)) {
            return `❌ Invalid meal name "${mealRaw}". Available meals: *breakfast*, *lunch*, *dinner*.`;
        }

        const trimmedTime = timeRaw.trim();
        if (!isValidTime(trimmedTime)) {
            return `❌ Invalid time "${timeRaw}". Please use 24-hour HH:mm format (e.g., *08:00*, *12:30*, *19:00*).`;
        }

        const profile = await this.repo.getOrCreate(waId, name);
        const updateData: Record<string, string> = {};
        if (meal === "breakfast") updateData.breakfastTime = trimmedTime;
        if (meal === "lunch") updateData.lunchTime = trimmedTime;
        if (meal === "dinner") updateData.dinnerTime = trimmedTime;

        await this.repo.updateSettings(profile.userId, updateData);

        return `✅ Set *${meal}* reminder to *${trimmedTime}* WIB.`;
    }

    getReminderMessage(meal: MealType, userName?: string | null): string {
        const trimmedName = userName?.trim();
        const hasName = Boolean(trimmedName);

        switch (meal) {
            case "breakfast": {
                const title = hasName ? `*${trimmedName} sayang, pagi!*` : `*Pagi sayang!*`;
                return (
                    `${title}\n\n` +
                    `Jangan lupa sarapan dulu yaa, biar ada tenaga dan semangat buat hari ini. Jangan sampai telat makan yaa! ❤️`
                );
            }
            case "lunch": {
                const title = hasName
                    ? `*${trimmedName} sayang, udah jam makan siang nih!*`
                    : `*Sayang, udah jam makan siang nih!*`;
                return (
                    `${title}\n\n` +
                    `Yuk istirahat dulu gih, tinggalin kerjaannya sebentar. Makan yang kenyang yaa, jangan nunda-nunda nanti maag-nya kambuh 🥺💕`
                );
            }
            case "dinner": {
                const title = hasName ? `*${trimmedName} sayang, malam!*` : `*Malam sayang!*`;
                return (
                    `${title}\n\n` +
                    `Udah selesai kan kegiatannya hari ini? Jangan lupa makan malam yaa, terus mandi dan istirahat yang cukup. Bangga banget sama kamu hari ini! 💕✨`
                );
            }
        }
    }

    getSholatReminderMessage(prayer: SholatPrayer, userName?: string | null): string {
        const trimmedName = userName?.trim();
        const hasName = Boolean(trimmedName);

        switch (prayer) {
            case "subuh": {
                const greeting = hasName ? `*${trimmedName} sayang, udah adzan Subuh nih... 🌅✨*` : `*Sayang, udah adzan Subuh nih... 🌅✨*`;
                return (
                    `${greeting}\n\n` +
                    `Bangun yuk sayang, ambil air wudhu terus sholat Subuh dulu yaa. Awali hari kamu dengan doa biar berkah dan dijaga seharian. Jangan tidur lagi yaa abis ini, semangat sayangku! ❤️🤲`
                );
            }
            case "dzuhur": {
                return (
                    `*Sayang, udah masuk waktu Dzuhur lho! ☀️🌤️*\n\n` +
                    `Lagi sibuk yaa? Istirahat sebentar yuk, tinggalin dulu kerjaan atau tugasnya. Sholat Dzuhur dulu biar hati kamu tenang dan seger lagi. Jangan lupa abis sholat langsung makan siang yaa sayang! 💕`
                );
            }
            case "ashar": {
                const greeting = hasName ? `*${trimmedName} sayang, waktu Ashar udah tiba nih 🌇💫*` : `*Sayang, waktu Ashar udah tiba nih 🌇💫*`;
                return (
                    `${greeting}\n\n` +
                    `Pasti udah mulai capek yaa seharian beraktivitas? Yuk rehat sejenak, wudhu terus tunaikan sholat Ashar dulu. Semoga sisa hari ini dilancarkan semuanya yaa sayang, luv you! 🥺❤️`
                );
            }
            case "maghrib": {
                return (
                    `*Sayangku, udah adzan Maghrib... 🌆🌙*\n\n` +
                    `Waktunya pulang dan kumpul kalau masih di jalan hati-hati yaa. Jangan tunda sholat Maghrib ya sayang, waktunya singkat banget. Mandi, wudhu, terus sholat yang khusyuk yaa manis! 🌸✨`
                );
            }
            case "isya": {
                const greeting = hasName ? `*${trimmedName} sayang, udah masuk waktu Isya nih 🌃✨*` : `*Sayang, udah masuk waktu Isya nih 🌃✨*`;
                return (
                    `${greeting}\n\n` +
                    `Sebelum santai rebahan atau istirahat malam ini, selesaikan kewajiban sholat Isya dulu yaa sayang. Biar tidurnya nyenyak dan ditemenin malaikat. Good night nanti yaa cintaku! 😴💕🌙`
                );
            }
        }
    }

    getHelpMessage(): string {
        return (
            `╭─── *Reminder Help* ───\n` +
            `│\n` +
            `│ • *!reminder status*\n` +
            `│   _Lihat jadwal makan & waktu sholat_\n` +
            `│\n` +
            `│ • *!reminder on* / *!reminder off*\n` +
            `│   _Aktifkan/matikan reminder makan_\n` +
            `│\n` +
            `│ • *!reminder set <meal> <HH:mm>*\n` +
            `│   _Atur waktu makan (breakfast, lunch, dinner)_\n` +
            `│\n` +
            `│ • *!reminder loc*\n` +
            `│   _Atur lokasi jadwal sholat (interaktif)_\n` +
            `│\n` +
            `│ • *!reminder loc <provinsi> | <kabkota>*\n` +
            `│   _Shortcut atur lokasi sholat_\n` +
            `│\n` +
            `│ • *!reminder toggle sholat*\n` +
            `│   _Aktifkan/matikan pengingat sholat_\n` +
            `│\n` +
            `│ • *!reminder test <meal|sholat>*\n` +
            `│   _Test notifikasi (subuh, dzuhur, ashar, dll)_\n` +
            `│\n` +
            `│ Alias: *akr-reminder* didukung.\n` +
            `╰───────────────────────────`
        );
    }
}
