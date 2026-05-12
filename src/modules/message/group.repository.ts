import { prisma } from "../../infrastructure/database";

export class GroupRepository {
    async upsert(groupId: string, name?: string) {
        return prisma.group.upsert({
            where: { groupId },
            update: { name },
            create: { groupId, name },
        });
    }

    async getSchedulerEnabled() {
        return prisma.group.findMany({ where: { schedulerEnabled: true } });
    }

    async toggleScheduler(groupId: string, enabled: boolean) {
        return prisma.group.update({ where: { groupId }, data: { schedulerEnabled: enabled } });
    }
}
