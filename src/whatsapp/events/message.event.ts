import { whatsappClient } from "../client";
import { MessageController } from "../../modules/message/message.controller";
import { logger } from "../../infrastructure/logger";

const controller = new MessageController();

export function registerMessageEvent() {
    whatsappClient.on("message", async (message) => {
        try {
            await controller.handle(message);
        } catch (error) {
            logger.error("MessageEvent", "Failed to handle message", error);
        }
    });
}
