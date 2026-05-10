import { Message } from "whatsapp-web.js";
import { logger } from "../../infrastructure/logger";
import { countBadWords } from "../../infrastructure/profanity";
import { pingCommand } from "./commands/ping.command";
import { echoCommand } from "./commands/echo.command";
import { topYappingCommand } from "./commands/top-yapping.command";
import { topToxicCommand } from "./commands/top-toxic.command";
import { topStickerCommand } from "./commands/top-sticker.command";
import { levelCommand } from "./commands/level.command";
import { UserRepository } from "./user.repository";
import { GroupRepository } from "./group.repository";
import { StatRepository } from "./stat.repository";

const userRepo = new UserRepository();
const groupRepo = new GroupRepository();
const statRepo = new StatRepository();

export class MessageService {
    async handle(message: Message) {
        await this.track(message);

        const body = message.body.trim();
        const command = body.split(" ")[0].toLowerCase();

        switch (command) {
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
            default:
                //     logger.info("MessageService", `Unhandled message: ${body}`);
                break;
        }
    }

    private async track(message: Message) {
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
