import { Message } from "whatsapp-web.js";

export async function pingCommand(message: Message) {
    await message.reply("Pong!");
}