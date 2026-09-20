import { ReminderRepository } from "./reminder.repository";
import { MealType, isValidMeal, isValidTime } from "./reminder.types";

export class ReminderService {
    constructor(private readonly repo: ReminderRepository = new ReminderRepository()) {}

    async getStatus(waId: string, name?: string): Promise<string> {
        const profile = await this.repo.getOrCreate(waId, name);
        const statusIcon = profile.enabled ? "✅ ACTIVE" : "⏸️ PAUSED";

        return (
            `╭─── *Eat Reminder Status* ───\n` +
            `│ Status: *${statusIcon}*\n` +
            `│\n` +
            `│ 🍳 Breakfast : *${profile.breakfastTime}* WIB\n` +
            `│ 🍱 Lunch     : *${profile.lunchTime}* WIB\n` +
            `│ 🍲 Dinner    : *${profile.dinnerTime}* WIB\n` +
            `│\n` +
            `│ Last sent: ${profile.lastSentMeal ? `${profile.lastSentMeal} (${profile.lastSentDate})` : "None"}\n` +
            `╰───────────────────────────\n\n` +
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
        const nameSuffix = userName ? ` *${userName}*` : "";
        switch (meal) {
            case "breakfast":
                return (
                    `☀️ *Pagi sayang!*${nameSuffix}\n\n` +
                    `Jangan lupa sarapan dulu yaa, biar ada tenaga dan semangat buat hari ini. Jangan sampai telat makan yaa! ❤️`
                );
            case "lunch":
                return (
                    `🍱 *Sayang, udah jam makan siang nih!*${nameSuffix}\n\n` +
                    `Yuk istirahat dulu gih, tinggalin kerjaannya sebentar. Makan yang kenyang yaa, jangan nunda-nunda nanti maag-nya kambuh 🥺💕`
                );
            case "dinner":
                return (
                    `🍲 *Malam sayang!*${nameSuffix}\n\n` +
                    `Udah selesai kan kegiatannya hari ini? Jangan lupa makan malam yaa, terus mandi dan istirahat yang cukup. Bangga banget sama kamu hari ini! 💕✨`
                );
        }
    }

    getHelpMessage(): string {
        return (
            `╭─── *Eat Reminder Help* ───\n` +
            `│\n` +
            `│ • *!reminder status*\n` +
            `│   _View your schedule and reminder status_\n` +
            `│\n` +
            `│ • *!reminder on* / *!reminder off*\n` +
            `│   _Enable or disable reminders_\n` +
            `│\n` +
            `│ • *!reminder set <meal> <HH:mm>*\n` +
            `│   _Set meal time (24h format, WIB)_\n` +
            `│   _Example: !reminder set breakfast 08:30_\n` +
            `│\n` +
            `│ • *!reminder test <meal>*\n` +
            `│   _Test the notification message for a meal_\n` +
            `│\n` +
            `│ Alias: *akr-reminder* also supported.\n` +
            `╰───────────────────────────`
        );
    }
}
