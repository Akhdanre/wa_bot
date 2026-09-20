import { Message } from "whatsapp-web.js";
import { logger } from "../../infrastructure/logger";
import { countBadWords } from "../../infrastructure/profanity";
import { pingCommand } from "./commands/ping.command";
import { echoCommand } from "./commands/echo.command";
import { topYappingCommand } from "./commands/top-yapping.command";
import { topToxicCommand } from "./commands/top-toxic.command";
import { topStickerCommand } from "./commands/top-sticker.command";
import { levelCommand } from "./commands/level.command";
import { helpCommand } from "./commands/help.command";
import { fishHelpCommand } from "./commands/fish-help.command";
import { toggleSchedulerCommand } from "./commands/toggle-scheduler.command";
import { catchCommand, fishCommand } from "./commands/fish.command";
import { UserRepository } from "./user.repository";
import { GroupRepository } from "./group.repository";
import { StatRepository } from "./stat.repository";
import { reminderCommand, hasActiveLocationSession, handleLocationSessionInput } from "../reminder";

const userRepo = new UserRepository();
const groupRepo = new GroupRepository();
const statRepo = new StatRepository();

export class MessageService {
    async handle(message: Message) {
        try {
            await this.track(message);
        } catch (error) {
            logger.warn("MessageService", "Failed to track message stats", error);
        }

        const body = message.body.trim();
        const contact = await message.getContact();
        const waId = contact.id._serialized;

        // Check if user is in an active interactive location session
        if (hasActiveLocationSession(waId)) {
            const reply = await handleLocationSessionInput(waId, body, undefined, undefined, undefined, contact.pushname);
            await message.reply(reply);
            return;
        }

        const command = body.split(" ")[0].toLowerCase();

        switch (command) {
            case "akr-reminder":
            case "!reminder":
                await reminderCommand(message, body);
                break;
            case "akr-ping":
                await pingCommand(message);
                break;
            case "akr-echo":
                await echoCommand(message, body.slice(6));
                break;
            case "akr-top-yapping":
                await topYappingCommand(message);
                break;
            case "akr-top-toxic":
                await topToxicCommand(message);
                break;
            case "akr-top-sticker":
                await topStickerCommand(message);
                break;
            case "akr-level":
                await levelCommand(message);
                break;
            case "akr-help":
                await helpCommand(message);
                break;
            case "akr-fish-help":
                await fishHelpCommand(message);
                break;
            case "akr-scheduler":
                await toggleSchedulerCommand(message);
                break;
            case "akr-fish":
                await fishCommand(message, body);
                break;
            case "akr-catch":
                await catchCommand(message, body);
                break;
            default:
                //     logger.info("MessageService", `Unhandled message: ${body}`);
                break;
        }
    }

    private async track(message: Message) {
        if (!message.from.endsWith("@g.us")) return;
        const chat = await message.getChat();
        if (!chat.isGroup) return;

        const contact = await message.getContact();
        const waId = contact.id._serialized;
        const userName = contact.pushname;
        const groupId = chat.id._serialized;
        const groupName = chat.name;
        const body = message.body.trim();
        const textLength = body.length;
        const badWordCount = countBadWords(body);
        const isSticker = message.type === "sticker";

        const user = await userRepo.upsert(waId, userName);
        const group = await groupRepo.upsert(groupId, groupName);
        await statRepo.increment(user.id, group.id, textLength, badWordCount, isSticker);
    }
}
