import { prisma } from "../../infrastructure/database";

export class GroupRepository {
    async upsert(groupId: string, name?: string) {
        return prisma.group.upsert({
            where: { groupId },
            update: { name },
            create: { groupId, name },
        });
    }
}
