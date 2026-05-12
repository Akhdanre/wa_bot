import cron from "node-cron";
import { whatsappClient } from "../../whatsapp/client";
import { GroupRepository } from "../message/group.repository";
import { generateSummary } from "./summary.service";
import { processQueue } from "./queue";
import { logger } from "../../infrastructure/logger";

const groupRepo = new GroupRepository();

async function sendSummaries() {
    const groups = await groupRepo.getSchedulerEnabled();
    logger.info("Scheduler", `Sending summary to ${groups.length} group(s)`);

    if (groups.length === 0) {
        logger.info("Scheduler", "No groups with scheduler enabled, skipping.");
        return;
    }

    await processQueue(groups, async (group) => {
        try {
            const text = await generateSummary(group.id);
            logger.info("Scheduler", `Sending to ${group.name || group.groupId}...`);
            await whatsappClient.sendMessage(group.groupId, text);
            logger.info("Scheduler", `✓ Sent summary to ${group.name || group.groupId}`);
        } catch (err) {
            logger.error("Scheduler", `Failed to send to ${group.groupId}`, err);
        }
    });

    logger.info("Scheduler", "Summary job completed.");
}

export function startScheduler() {
    // Testing: every 10 seconds
    cron.schedule("*/10 * * * * *", () => {
        logger.info("Scheduler", "Cron triggered, starting summary job...");
        sendSummaries();
    }, { timezone: "Asia/Jakarta" });
    logger.info("Scheduler", "Scheduler started (every 10s for testing)");
}
