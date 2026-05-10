import "./config/env";
import { whatsappClient } from "./whatsapp/client";
import { registerEvents } from "./whatsapp/event-loader";
import { logger } from "./infrastructure/logger";

registerEvents();

whatsappClient.initialize().catch((error) => {
    logger.error("App", "Failed to initialize WhatsApp client", error);
    process.exit(1);
});

process.on("SIGINT", async () => {
    logger.info("App", "Shutting down...");
    await whatsappClient.destroy();
    process.exit(0);
});

process.on("unhandledRejection", (reason) => {
    logger.error("App", "Unhandled rejection", reason);
});
