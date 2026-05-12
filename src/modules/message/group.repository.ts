import { prisma } from "../../infrastructure/database";

export type GroupRecord = {
    id: number;
    groupId: string;
    name: string | null;
    schedulerEnabled: boolean;
};

export class GroupRepository {
    async upsert(groupId: string, name?: string): Promise<GroupRecord> {
        return prisma.group.upsert({
            where: { groupId },
            update: { name },
            create: { groupId, name },
        }) as Promise<GroupRecord>;
    }

    async getSchedulerEnabled(): Promise<GroupRecord[]> {
        return prisma.group.findMany({ where: { schedulerEnabled: true } }) as Promise<GroupRecord[]>;
    }

    async toggleScheduler(groupId: string, enabled: boolean): Promise<GroupRecord> {
        return prisma.group.update({ where: { groupId }, data: { schedulerEnabled: enabled } }) as Promise<GroupRecord>;
    }
}
