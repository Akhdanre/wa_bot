import { Message } from "whatsapp-web.js";
import { UserRepository } from "../user.repository";
import { GroupRepository } from "../group.repository";
import { StatRepository } from "../stat.repository";
import { generateLevelCard } from "../../../infrastructure/level";

const userRepo = new UserRepository();
const groupRepo = new GroupRepository();
const statRepo = new StatRepository();

export async function levelCommand(message: Message) {
    const chat = await message.getChat();
    if (!chat.isGroup) {
        await message.reply("This command only works in groups.");
        return;
    }

    const contact = await message.getContact();
    const user = await userRepo.upsert(contact.id._serialized, contact.pushname);
    const group = await groupRepo.upsert(chat.id._serialized, chat.name);
    const stat = await statRepo.getUserStat(user.id, group.id);

    const totalText = stat?.totalText || 0;
    const name = user.name || user.waId;
    const card = generateLevelCard(name, totalText);

    await message.reply(card);
}
