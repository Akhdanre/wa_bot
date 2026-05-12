import { Message } from "whatsapp-web.js";
import { GroupRepository } from "../group.repository";

const groupRepo = new GroupRepository();

export async function toggleSchedulerCommand(message: Message) {
    const chat = await message.getChat();
    if (!chat.isGroup) {
        await message.reply("This command only works in groups.");
        return;
    }

    const group = await groupRepo.upsert(chat.id._serialized, chat.name);
    const newState = !group.schedulerEnabled;
    await groupRepo.toggleScheduler(chat.id._serialized, newState);

    await message.reply(`📅 Weekly summary is now *${newState ? "enabled" : "disabled"}* for this group.`);
}
