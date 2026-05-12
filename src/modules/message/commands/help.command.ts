import { Message } from "whatsapp-web.js";

export async function helpCommand(message: Message) {
    const help = `*Available Commands*

• *akr-top-yapping* — Top chatters leaderboard
• *akr-top-toxic* — Top toxic users leaderboard
• *akr-top-sticker* — Top sticker senders leaderboard
• *akr-level* — Check your level
• *akr-help* — Show this help message`;

    await message.reply(help);
}
