import { whatsappClient } from "../client";
import { logger } from "../../infrastructure/logger";

export function registerReadyEvent() {
    whatsappClient.on("ready", () => {
        logger.info("WhatsApp", "Client is ready!");
    });

    whatsappClient.on("auth_failure", (msg) => {
        logger.error("WhatsApp", "Authentication failed", msg);
    });

    whatsappClient.on("disconnected", (reason) => {
        logger.error("WhatsApp", "Client disconnected", reason);
    });
}
