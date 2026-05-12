import cron from "node-cron";
import { MessageMedia } from "whatsapp-web.js";
import { whatsappClient } from "../../whatsapp/client";
import { GroupRepository } from "../message/group.repository";
import { generateSummary } from "./summary.service";
import { processQueue } from "./queue";
import { logger } from "../../infrastructure/logger";
import { buildLeaderboardSection } from "./leaderboard.service";
import { renderAwardsPngBatch } from "./podium-image.service";

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
            const sections = await Promise.all([
                buildLeaderboardSection(group.id, "yapping"),
                buildLeaderboardSection(group.id, "toxic"),
                buildLeaderboardSection(group.id, "sticker"),
            ]);
            const images = await renderAwardsPngBatch(sections.map((section) => section.scene));

            logger.info("Scheduler", `Sending to ${group.name || group.groupId}...`);
            await whatsappClient.sendMessage(group.groupId, text);

            for (const [index, section] of sections.entries()) {
                const png = images[index];
                const media = new MessageMedia(
                    "image/png",
                    png.toString("base64"),
                    `weekly-${section.category}-leaderboard.png`,
                );

                await whatsappClient.sendMessage(group.groupId, media, {
                    caption: `${section.headline.replace(/\*/g, "")}\n${section.text}`,
                });
            }

            logger.info("Scheduler", `✓ Sent summary to ${group.name || group.groupId}`);
        } catch (err) {
            logger.error("Scheduler", `Failed to send to ${group.groupId}`, err);
        }
    });

    logger.info("Scheduler", "Summary job completed.");
}

export function startScheduler() {
    cron.schedule("0 9 * * 1", () => {
        logger.info("Scheduler", "Cron triggered, starting summary job...");
        sendSummaries();
    }, { timezone: "Asia/Jakarta" });
    logger.info("Scheduler", "Scheduler started (weekly on Monday at 09:00 Asia/Jakarta)");
}
