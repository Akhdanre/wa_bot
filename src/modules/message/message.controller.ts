import { Message } from "whatsapp-web.js";

import { MessageService } from "./message.service";

const messageService = new MessageService();

export class MessageController {
    async handle(message: Message) {
        await messageService.handle(message);
    }
}
