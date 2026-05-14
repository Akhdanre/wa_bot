import { prisma } from "../../infrastructure/database";

export type FishProfileState = {
    id: number;
    userId: number;
    coins: number;
    rodLevel: number;
    rodHealth: number;
    totalCaught: number;
    totalTrash: number;
    totalSold: number;
};

export type FishInventoryItem = {
    fishKey: string;
    quantity: number;
    tankQuantity: number;
};

export class FishRepository {
    async getOrCreateProfile(userId: number): Promise<FishProfileState> {
        return prisma.fishProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        }) as Promise<FishProfileState>;
    }

    async addCatch(profileId: number, fishKey: string): Promise<void> {
        await prisma.$transaction([
            prisma.fishProfile.update({
                where: { id: profileId },
                data: { totalCaught: { increment: 1 } },
            }),
            prisma.fishInventory.upsert({
                where: { profileId_fishKey: { profileId, fishKey } },
                update: { quantity: { increment: 1 } },
                create: { profileId, fishKey, quantity: 1 },
            }),
        ]);
    }

    async getInventory(profileId: number): Promise<FishInventoryItem[]> {
        return prisma.fishInventory.findMany({
            where: {
                profileId,
                OR: [{ quantity: { gt: 0 } }, { tankQuantity: { gt: 0 } }],
            },
            orderBy: { fishKey: "asc" },
            select: { fishKey: true, quantity: true, tankQuantity: true },
        }) as Promise<FishInventoryItem[]>;
    }

    async recordTrash(profileId: number): Promise<void> {
        await prisma.fishProfile.update({
            where: { id: profileId },
            data: { totalTrash: { increment: 1 } },
        });
    }

    async damageRod(profileId: number, rodHealth: number): Promise<FishProfileState> {
        return prisma.fishProfile.update({
            where: { id: profileId },
            data: { rodHealth },
        }) as Promise<FishProfileState>;
    }

    async sell(profileId: number, fishKey: string, quantity: number, coins: number): Promise<void> {
        await prisma.$transaction([
            prisma.fishInventory.update({
                where: { profileId_fishKey: { profileId, fishKey } },
                data: { quantity: { decrement: quantity } },
            }),
            prisma.fishProfile.update({
                where: { id: profileId },
                data: {
                    coins: { increment: coins },
                    totalSold: { increment: quantity },
                },
            }),
        ]);
    }

    async moveToTank(profileId: number, fishKey: string, quantity: number): Promise<void> {
        await prisma.fishInventory.update({
            where: { profileId_fishKey: { profileId, fishKey } },
            data: {
                quantity: { decrement: quantity },
                tankQuantity: { increment: quantity },
            },
        });
    }

    async moveFromTank(profileId: number, fishKey: string, quantity: number): Promise<void> {
        await prisma.fishInventory.update({
            where: { profileId_fishKey: { profileId, fishKey } },
            data: {
                quantity: { increment: quantity },
                tankQuantity: { decrement: quantity },
            },
        });
    }

    async upgradeRod(profileId: number, nextLevel: number, nextHealth: number, cost: number): Promise<FishProfileState> {
        return prisma.fishProfile.update({
            where: { id: profileId },
            data: {
                coins: { decrement: cost },
                rodLevel: nextLevel,
                rodHealth: nextHealth,
            },
        }) as Promise<FishProfileState>;
    }

    async repairRod(profileId: number, rodHealth: number, cost: number): Promise<FishProfileState> {
        return prisma.fishProfile.update({
            where: { id: profileId },
            data: {
                coins: { decrement: cost },
                rodHealth,
            },
        }) as Promise<FishProfileState>;
    }
}
