import "./config/env";
import { whatsappClient } from "./whatsapp/client";
import { registerEvents } from "./whatsapp/event-loader";
import { logger } from "./infrastructure/logger";

registerEvents();

whatsappClient.initialize().catch((error) => {
    logger.error("App", "Failed to initialize WhatsApp client", error);
    process.exit(1);
});

const shutdown = async () => {
    logger.info("App", "Shutting down...");
    try {
        await whatsappClient.destroy();
    } catch (error) {
        logger.error("App", "Error during shutdown", error);
    }
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

process.on("unhandledRejection", (reason) => {
    logger.error("App", "Unhandled rejection", reason);
});
