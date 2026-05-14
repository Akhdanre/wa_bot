import { Message } from "whatsapp-web.js";

export async function fishHelpCommand(message: Message) {
    const help =
        `╭───  *Fish It*  ───
│
│  *Fishing*
│  • akr-fish          — _Show 9-box fishing spot_
│  • akr-catch <1-9>   — _Catch from selected box_
│
│  *Inventory*
│  • akr-fish inv      — _Bag, coins, rod info_
│  • akr-fish tank     — _Show saved fish_
│  • akr-fish save <key>    — _Move fish to tank_
│  • akr-fish release <key> — _Move fish to bag_
│
│  *Economy*
│  • akr-fish sell all      — _Sell all fish_
│  • akr-fish sell <key>    — _Sell one fish type_
│  • akr-fish shop     — _Rod upgrade cost_
│  • akr-fish upgrade  — _Upgrade your rod_
│  • akr-fish repair   — _Repair damaged rod_
│
╰──────────────────────────`;

    await message.reply(help);
}
