import { Message } from "whatsapp-web.js";
import { ReminderService } from "./reminder.service";
import { isValidMeal, MealType } from "./reminder.types";

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
        case "set": {
            const meal = parts[2];
            const time = parts[3];
            if (!meal || !time) {
                await message.reply("❌ Usage: `!reminder set <breakfast|lunch|dinner> <HH:mm>` (e.g. `!reminder set breakfast 08:30`)");
                return;
            }
            const reply = await reminderService.setTime(waId, meal, time, name);
            await message.reply(reply);
            break;
        }
        case "test": {
            const meal = (parts[2] || "lunch").toLowerCase();
            if (!isValidMeal(meal)) {
                await message.reply("❌ Usage: `!reminder test <breakfast|lunch|dinner>`");
                return;
            }
            const testMsg = reminderService.getReminderMessage(meal as MealType, name);
            await message.reply(`[TEST NOTIFICATION]\n\n${testMsg}`);
            break;
        }
        case "help":
        default: {
            await message.reply(reminderService.getHelpMessage());
            break;
        }
    }
}
