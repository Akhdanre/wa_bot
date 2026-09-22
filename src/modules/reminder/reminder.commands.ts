import { Message } from "whatsapp-web.js";
import { ReminderService } from "./reminder.service";
import { isValidMeal, isValidSholatPrayer, MealType, SholatPrayer } from "./reminder.types";
import { startLocationSession } from "./reminder.session";

let defaultReminderService = new ReminderService();

export function setReminderServiceForTest(service: ReminderService): void {
    defaultReminderService = service;
}

export async function reminderCommand(
    message: Message,
    body: string,
    service: ReminderService = defaultReminderService
): Promise<void> {
    const contact = await message.getContact();
    const waId = contact.id._serialized;
    const name = contact.pushname;

    const parts = body.trim().split(/\s+/);
    const subCommand = (parts[1] || "status").toLowerCase();

    switch (subCommand) {
        case "status": {
            const statusMsg = await service.getStatus(waId, name);
            await message.reply(statusMsg);
            break;
        }
        case "on": {
            const reply = await service.setEnabled(waId, true, name);
            await message.reply(reply);
            break;
        }
        case "off": {
            const reply = await service.setEnabled(waId, false, name);
            await message.reply(reply);
            break;
        }
        case "toggle": {
            const target = (parts[2] || "").toLowerCase();
            if (target === "sholat" || target === "shalat") {
                const reply = await service.toggleSholat(waId, undefined, name);
                await message.reply(reply);
                return;
            }
            if (target === "sleep" || target === "tidur") {
                const reply = await service.toggleSleep(waId, undefined, name);
                await message.reply(reply);
                return;
            }
            await message.reply("❌ Usage: `!reminder toggle <sholat|sleep>`");
            break;
        }
        case "loc": {
            const locationArg = body.trim().substring(body.indexOf("loc") + 3).trim();
            if (!locationArg) {
                const prompt = await startLocationSession(waId);
                await message.reply(prompt);
                return;
            }

            const res = await service.setDirectLocation(waId, locationArg, name);
            await message.reply(res.message);
            break;
        }
        case "set": {
            const meal = parts[2];
            const time = parts[3];
            if (!meal || !time) {
                await message.reply("❌ Usage: `!reminder set <breakfast|lunch|dinner|sleep> <HH:mm>`");
                return;
            }
            const reply = await service.setTime(waId, meal, time, name);
            await message.reply(reply);
            break;
        }
        case "test": {
            const target = (parts[2] || "lunch").toLowerCase();
            if (target === "sleep" || target === "tidur") {
                const testMsg = service.getSleepReminderMessage(name);
                await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
                return;
            }
            if (isValidMeal(target)) {
                const testMsg = service.getReminderMessage(target as MealType, name);
                await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
                return;
            }
            if (isValidSholatPrayer(target)) {
                const testMsg = service.getSholatReminderMessage(target as SholatPrayer, name);
                await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
                return;
            }
            await message.reply("❌ Usage: `!reminder test <breakfast|lunch|dinner|subuh|dzuhur|ashar|maghrib|isya|sleep>`");
            break;
        }
        case "help":
        default: {
            await message.reply(service.getHelpMessage());
            break;
        }
    }
}
