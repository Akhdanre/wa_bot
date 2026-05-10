import { Message } from "whatsapp-web.js";
import { GroupRepository } from "../group.repository";
import { StatRepository } from "../stat.repository";

const groupRepo = new GroupRepository();
const statRepo = new StatRepository();

export async function topStickerCommand(message: Message) {
    const chat = await message.getChat();
    if (!chat.isGroup) {
        await message.reply("This command only works in groups.");
        return;
    }

    const group = await groupRepo.upsert(chat.id._serialized, chat.name);
    const top = await statRepo.getTopStickerByGroup(group.id, 3);

    if (top.length === 0) {
        await message.reply("No stickers sent yet. 🫥");
        return;
    }

    const lines = top.map((s, i) => `${i + 1}. ${s.user.name || s.user.waId} — ${s.totalSticker} stickers`);
    await message.reply(`🎭 Top Sticker Spammer:\n\n${lines.join("\n")}`);
}
