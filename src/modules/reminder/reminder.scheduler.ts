import cron from "node-cron";
import { whatsappClient } from "../../whatsapp/client";
import { logger } from "../../infrastructure/logger";
import { ReminderRepository } from "./reminder.repository";
import { ReminderService } from "./reminder.service";
import { MealType, ReminderProfileWithUser } from "./reminder.types";

export function getCurrentTimeWIB(now: Date = new Date()): { timeStr: string; dateStr: string } {
    // Format to Asia/Jakarta (WIB)
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    const hour = getPart("hour");
    const minute = getPart("minute");

    return {
        timeStr: `${hour}:${minute}`,
        dateStr: `${year}-${month}-${day}`,
    };
}

export type SendMessageFunction = (target: string, content: string) => Promise<unknown>;

export class ReminderScheduler {
    constructor(
        private readonly repo: ReminderRepository = new ReminderRepository(),
        private readonly service: ReminderService = new ReminderService(),
        private readonly sendMessage: SendMessageFunction = async (target, content) => {
            return whatsappClient.sendMessage(target, content);
        }
    ) {}

    async tick(nowDate: Date = new Date()): Promise<number> {
        const { timeStr, dateStr } = getCurrentTimeWIB(nowDate);
        const profiles = await this.repo.getAllActiveProfiles();
        let dispatchedCount = 0;

        for (const profile of profiles) {
            const mealToSend = this.getMatchingMeal(profile, timeStr, dateStr);
            if (!mealToSend) continue;

            try {
                const messageText = this.service.getReminderMessage(mealToSend, profile.user.name);
                await this.sendMessage(profile.user.waId, messageText);
                await this.repo.markSent(profile.userId, mealToSend, dateStr);
                dispatchedCount++;
                logger.info(
                    "ReminderScheduler",
                    `Sent ${mealToSend} reminder to ${profile.user.name || profile.user.waId}`
                );
            } catch (err) {
                logger.error(
                    "ReminderScheduler",
                    `Failed to send reminder to ${profile.user.waId}`,
                    err
                );
            }
        }

        return dispatchedCount;
    }

    private getMatchingMeal(
        profile: ReminderProfileWithUser,
        currentTimeStr: string,
        currentDateStr: string
    ): MealType | null {
        const meals: { meal: MealType; scheduledTime: string }[] = [
            { meal: "breakfast", scheduledTime: profile.breakfastTime },
            { meal: "lunch", scheduledTime: profile.lunchTime },
            { meal: "dinner", scheduledTime: profile.dinnerTime },
        ];

        for (const { meal, scheduledTime } of meals) {
            if (scheduledTime === currentTimeStr) {
                // Check deduplication
                const alreadySent =
                    profile.lastSentMeal === meal && profile.lastSentDate === currentDateStr;
                if (!alreadySent) {
                    return meal;
                }
            }
        }

        return null;
    }
}

export async function checkAndDispatchReminders(options?: {
    now?: Date;
    sendMessageFn?: SendMessageFunction;
}): Promise<number> {
    const scheduler = new ReminderScheduler(
        undefined,
        undefined,
        options?.sendMessageFn
    );
    return scheduler.tick(options?.now);
}

export function startReminderScheduler(): cron.ScheduledTask {
    const scheduler = new ReminderScheduler();
    const task = cron.schedule(
        "* * * * *",
        async () => {
            await scheduler.tick();
        },
        { timezone: "Asia/Jakarta" }
    );
    logger.info("ReminderScheduler", "Eat reminder scheduler started (running every minute)");
    return task;
}
