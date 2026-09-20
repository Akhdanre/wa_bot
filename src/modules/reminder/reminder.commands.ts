import { Message } from "whatsapp-web.js";
import { ReminderService } from "./reminder.service";
import { isValidMeal, isValidSholatPrayer, MealType, SholatPrayer } from "./reminder.types";
import { startLocationSession } from "./reminder.session";

const reminderService = new ReminderService();

export async function reminderCommand(message: Message, body: string): Promise<void> {
    const contact = await message.getContact();
    const waId = contact.id._serialized;
    const name = contact.pushname;

    const parts = body.trim().split(/\s+/);
    const subCommand = (parts[1] || "status").toLowerCase();

    switch (subCommand) {
        case "status": {
            const statusMsg = await reminderService.getStatus(waId, name);
            await message.reply(statusMsg);
            break;
        }
        case "on": {
            const reply = await reminderService.setEnabled(waId, true, name);
            await message.reply(reply);
            break;
        }
        case "off": {
            const reply = await reminderService.setEnabled(waId, false, name);
            await message.reply(reply);
            break;
        }
        case "toggle": {
            const target = (parts[2] || "").toLowerCase();
            if (target === "sholat" || target === "shalat") {
                const reply = await reminderService.toggleSholat(waId, undefined, name);
                await message.reply(reply);
                return;
            }
            await message.reply("❌ Usage: `!reminder toggle sholat`");
            break;
        }
        case "loc": {
            const locationArg = body.trim().substring(body.indexOf("loc") + 3).trim();
            if (!locationArg) {
                const prompt = await startLocationSession(waId);
                await message.reply(prompt);
                return;
            }

            const res = await reminderService.setDirectLocation(waId, locationArg, name);
            await message.reply(res.message);
            break;
        }
        case "set": {
            const meal = parts[2];
            const time = parts[3];
            if (!meal || !time) {
                await message.reply("❌ Usage: `!reminder set <breakfast|lunch|dinner> <HH:mm>`");
                return;
            }
            const reply = await reminderService.setTime(waId, meal, time, name);
            await message.reply(reply);
            break;
        }
        case "test": {
            const target = (parts[2] || "lunch").toLowerCase();
            if (isValidMeal(target)) {
                const testMsg = reminderService.getReminderMessage(target as MealType, name);
                await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
                return;
            }
            if (isValidSholatPrayer(target)) {
                const testMsg = reminderService.getSholatReminderMessage(target as SholatPrayer, name);
                await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
                return;
            }
            await message.reply("❌ Usage: `!reminder test <breakfast|lunch|dinner|subuh|dzuhur|ashar|maghrib|isya>`");
            break;
        }
        case "help":
        default: {
            await message.reply(reminderService.getHelpMessage());
            break;
        }
    }
}
