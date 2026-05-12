import { Message } from "whatsapp-web.js";

export async function helpCommand(message: Message) {
    const help =
        `╭───  *command*  ───
│
│  *Leaderboards*
│  • akr-top-yapping  — _Top chatters_
│  • akr-top-toxic    — _Top toxic users_
│  • akr-top-sticker  — _Top stickers_
│
│  *Profile*
│  • akr-level        — _Check your stats_
│  • akr-help         — _Show this menu_
│
│  *Minigames*
│  • akr-fish         — _Coming soon!_
│
╰──────────────────────────`;

    await message.reply(help);
}