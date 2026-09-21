import cron from "node-cron";
import { whatsappClient } from "../../whatsapp/client";
import { logger } from "../../infrastructure/logger";
import { ReminderRepository } from "./reminder.repository";
import { SholatRepository } from "./sholat.repository";
import { ReminderService } from "./reminder.service";
import { MealType, SholatPrayer, ReminderProfileWithUser } from "./reminder.types";

export function getCurrentTimeWIB(now: Date = new Date()): {
    timeStr: string;
    dateStr: string;
    year: number;
    month: number;
} {
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
        year: parseInt(year, 10),
        month: parseInt(month, 10),
    };
}

export type SendMessageFunction = (target: string, content: string) => Promise<unknown>;

let activeReminderTask: cron.ScheduledTask | null = null;

export class ReminderScheduler {
    private readonly inMemorySent = new Set<string>();

    constructor(
        private readonly repo: ReminderRepository = new ReminderRepository(),
        private readonly service: ReminderService = new ReminderService(),
        private readonly sendMessage: SendMessageFunction = async (target, content) => {
            return whatsappClient.sendMessage(target, content);
        },
        private readonly sholatRepo: SholatRepository = new SholatRepository()
    ) {}

    async tick(nowDate: Date = new Date()): Promise<number> {
        const { timeStr, dateStr } = getCurrentTimeWIB(nowDate);

        for (const key of this.inMemorySent) {
            if (!key.endsWith(`:${dateStr}`)) {
                this.inMemorySent.delete(key);
            }
        }

        const profiles = await this.repo.getAllActiveProfiles();
        let dispatchedCount = 0;

        for (const profile of profiles) {
            // 1. Check Meal Reminders
            const mealToSend = this.getMatchingMeal(profile, timeStr, dateStr);
            if (mealToSend) {
                const dispatchKey = `${profile.userId}:meal:${mealToSend}:${dateStr}`;
                if (!this.inMemorySent.has(dispatchKey)) {
                    this.inMemorySent.add(dispatchKey);
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
                        this.inMemorySent.delete(dispatchKey);
                        logger.error(
                            "ReminderScheduler",
                            `Failed to send meal reminder to ${profile.user.waId}`,
                            err
                        );
                    }
                }
            }

            // 2. Check Sholat Reminders
            if (profile.sholatEnabled && profile.provinsi && profile.kabkota) {
                const sholatToSend = await this.getMatchingSholat(profile, timeStr, dateStr);
                if (sholatToSend) {
                    const dispatchKey = `${profile.userId}:sholat:${sholatToSend}:${dateStr}`;
                    if (!this.inMemorySent.has(dispatchKey)) {
                        this.inMemorySent.add(dispatchKey);
                        try {
                            const messageText = this.service.getSholatReminderMessage(sholatToSend, profile.user.name);
                            await this.sendMessage(profile.user.waId, messageText);
                            await this.repo.markSholatSent(profile.userId, sholatToSend, dateStr);
                            dispatchedCount++;
                            logger.info(
                                "ReminderScheduler",
                                `Sent ${sholatToSend} prayer reminder to ${profile.user.name || profile.user.waId}`
                            );
                        } catch (err) {
                            this.inMemorySent.delete(dispatchKey);
                            logger.error(
                                "ReminderScheduler",
                                `Failed to send sholat reminder to ${profile.user.waId}`,
                                err
                            );
                        }
                    }
                }
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

    private async getMatchingSholat(
        profile: ReminderProfileWithUser,
        currentTimeStr: string,
        currentDateStr: string
    ): Promise<SholatPrayer | null> {
        try {
            const schedule = await this.sholatRepo.getScheduleForDate(
                profile.provinsi!,
                profile.kabkota!,
                currentDateStr
            );
            if (!schedule) return null;

            const prayers: { prayer: SholatPrayer; scheduledTime: string }[] = [
                { prayer: "subuh", scheduledTime: schedule.subuh },
                { prayer: "dzuhur", scheduledTime: schedule.dzuhur },
                { prayer: "ashar", scheduledTime: schedule.ashar },
                { prayer: "maghrib", scheduledTime: schedule.maghrib },
                { prayer: "isya", scheduledTime: schedule.isya },
            ];

            for (const { prayer, scheduledTime } of prayers) {
                if (scheduledTime === currentTimeStr) {
                    const alreadySent =
                        profile.lastSentSholat === prayer && profile.lastSholatDate === currentDateStr;
                    if (!alreadySent) {
                        return prayer;
                    }
                }
            }
        } catch (err) {
            logger.warn(
                "ReminderScheduler",
                `Failed to check prayer times for ${profile.provinsi}/${profile.kabkota}`,
                err
            );
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
    if (activeReminderTask) {
        return activeReminderTask;
    }
    const scheduler = new ReminderScheduler();
    activeReminderTask = cron.schedule(
        "* * * * *",
        async () => {
            await scheduler.tick();
        },
        { timezone: "Asia/Jakarta" }
    );
    logger.info("ReminderScheduler", "Reminder scheduler started (meals & sholat, running every minute)");
    return activeReminderTask;
}
