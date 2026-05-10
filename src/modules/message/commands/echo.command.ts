import { Message } from "whatsapp-web.js";

export async function echoCommand(message: Message, args: string) {
    await message.reply(args);
}
