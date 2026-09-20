import { whatsappClient } from "../client";
import { logger } from "../../infrastructure/logger";
import { startScheduler } from "../../modules/scheduler";
import { startReminderScheduler } from "../../modules/reminder";

export function registerReadyEvent() {
    whatsappClient.on("authenticated", () => {
        logger.info("WhatsApp", "Authenticated successfully!");
    });

    whatsappClient.on("loading_screen", (percent, message) => {
        logger.info("WhatsApp", `Loading: ${percent}% - ${message}`);
    });

    whatsappClient.on("ready", () => {
        logger.info("WhatsApp", "Client is ready!");
        startScheduler();
        startReminderScheduler();
    });

    whatsappClient.on("auth_failure", (msg) => {
        logger.error("WhatsApp", "Authentication failed", msg);
    });

    whatsappClient.on("disconnected", (reason) => {
        logger.error("WhatsApp", "Client disconnected", reason);
    });
}
