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
│  *Settings*
│  • akr-scheduler    — _Toggle weekly summary_
│
│  *Minigames*
│  • akr-fish         — _Find fish in 9 boxes_
│  • akr-catch <1-9>  — _Catch the fish_
│  • akr-fish inv     — _Bag, coins, rod_
│  • akr-fish tank    — _Show saved fish_
│  • akr-fish sell all — _Sell fish for coins_
│  • akr-fish shop    — _Rod upgrades_
│
╰──────────────────────────`;

    await message.reply(help);
}
