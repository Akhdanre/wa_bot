import { prisma } from "../../infrastructure/database";

export class StatRepository {
    async increment(userId: number, groupId: number, textLength: number, badWordCount: number) {
        return prisma.stat.upsert({
            where: { userId_groupId: { userId, groupId } },
            update: {
                count: { increment: 1 },
                totalText: { increment: textLength },
                totalBadWord: { increment: badWordCount },
            },
            create: { userId, groupId, count: 1, totalText: textLength, totalBadWord: badWordCount },
        });
    }

    async getTopByGroup(groupId: number, limit = 3) {
        return prisma.stat.findMany({
            where: { groupId },
            orderBy: { count: "desc" },
            take: limit,
            include: { user: true },
        });
    }

    async getTopBadWordByGroup(groupId: number, limit = 3) {
        return prisma.stat.findMany({
            where: { groupId, totalBadWord: { gt: 0 } },
            orderBy: { totalBadWord: "desc" },
            take: limit,
            include: { user: true },
        });
    }
}
