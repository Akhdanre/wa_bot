import { prisma } from "../../infrastructure/database";
import { MealType, ReminderProfileWithUser, SholatPrayer } from "./reminder.types";

export class ReminderRepository {
    async getByWaId(waId: string): Promise<ReminderProfileWithUser | null> {
        return prisma.reminderProfile.findFirst({
            where: { user: { waId } },
            include: { user: true },
        }) as Promise<ReminderProfileWithUser | null>;
    }

    async getOrCreate(waId: string, name?: string): Promise<ReminderProfileWithUser> {
        let user = await prisma.user.findUnique({
            where: { waId },
        });

        if (!user) {
            user = await prisma.user.create({
                data: { waId, name: name || null },
            });
        }

        let profile = await prisma.reminderProfile.findUnique({
            where: { userId: user.id },
            include: { user: true },
        });

        if (!profile) {
            profile = await prisma.reminderProfile.create({
                data: {
                    userId: user.id,
                    enabled: true,
                    breakfastTime: "08:00",
                    lunchTime: "12:30",
                    dinnerTime: "19:00",
                },
                include: { user: true },
            });
        }

        return profile as ReminderProfileWithUser;
    }

    async updateSettings(
        userId: number,
        data: {
            enabled?: boolean;
            breakfastTime?: string;
            lunchTime?: string;
            dinnerTime?: string;
        }
    ): Promise<ReminderProfileWithUser> {
        return prisma.reminderProfile.update({
            where: { userId },
            data,
            include: { user: true },
        }) as Promise<ReminderProfileWithUser>;
    }

    async markSent(userId: number, meal: MealType, dateStr: string): Promise<void> {
        await prisma.reminderProfile.update({
            where: { userId },
            data: {
                lastSentMeal: meal,
                lastSentDate: dateStr,
            },
        });
    }

    async getAllActiveProfiles(): Promise<ReminderProfileWithUser[]> {
        return prisma.reminderProfile.findMany({
            where: { enabled: true },
            include: { user: true },
        }) as Promise<ReminderProfileWithUser[]>;
    }

    async updateSholatSettings(
        userId: number,
        data: {
            sholatEnabled?: boolean;
            provinsi?: string;
            kabkota?: string;
        }
    ): Promise<ReminderProfileWithUser> {
        return prisma.reminderProfile.update({
            where: { userId },
            data,
            include: { user: true },
        }) as Promise<ReminderProfileWithUser>;
    }

    async markSholatSent(userId: number, prayer: SholatPrayer, dateStr: string): Promise<void> {
        await prisma.reminderProfile.update({
            where: { userId },
            data: {
                lastSentSholat: prayer,
                lastSholatDate: dateStr,
            },
        });
    }

    async getAllActiveSholatProfiles(): Promise<ReminderProfileWithUser[]> {
        return prisma.reminderProfile.findMany({
            where: {
                enabled: true,
                sholatEnabled: true,
                provinsi: { not: null },
                kabkota: { not: null },
            },
            include: { user: true },
        }) as Promise<ReminderProfileWithUser[]>;
    }
}
