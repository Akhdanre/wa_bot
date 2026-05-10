import { prisma } from "../../infrastructure/database";

export class UserRepository {
    async upsert(waId: string, name?: string) {
        return prisma.user.upsert({
            where: { waId },
            update: { name },
            create: { waId, name },
        });
    }
}
