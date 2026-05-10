import { whatsappClient } from "../client";
import { logger } from "../../infrastructure/logger";

export function registerReadyEvent() {
    whatsappClient.on("ready", () => {
        logger.info("WhatsApp", "Client is ready!");
    });
}
