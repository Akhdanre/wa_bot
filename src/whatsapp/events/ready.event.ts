import { whatsappClient } from "../client";
import { logger } from "../../infrastructure/logger";
import { startScheduler } from "../../modules/scheduler";

export function registerReadyEvent() {
    whatsappClient.on("ready", () => {
        logger.info("WhatsApp", "Client is ready!");
        startScheduler();
    });

    whatsappClient.on("auth_failure", (msg) => {
        logger.error("WhatsApp", "Authentication failed", msg);
    });

    whatsappClient.on("disconnected", (reason) => {
        logger.error("WhatsApp", "Client disconnected", reason);
    });
}
