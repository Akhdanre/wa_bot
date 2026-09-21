import { prisma as defaultPrisma } from "../../infrastructure/database";
import { EquranClient } from "./api/equran.client";
import { SholatDailyTimes } from "./reminder.types";

export class SholatRepository {
    constructor(
        private readonly client: EquranClient = new EquranClient(),
        private readonly db: any = defaultPrisma
    ) {}

    async getScheduleForDate(
        provinsi: string,
        kabkota: string,
        dateStr: string
    ): Promise<SholatDailyTimes | null> {
        // 1. Check database cache first
        const cached = await this.db.sholatSchedule.findUnique({
            where: {
                provinsi_kabkota_date: {
                    provinsi,
                    kabkota,
                    date: dateStr,
                },
            },
        });

        if (cached) {
            return {
                subuh: cached.subuh,
                dzuhur: cached.dzuhur,
                ashar: cached.ashar,
                maghrib: cached.maghrib,
                isya: cached.isya,
            };
        }

        // 2. Parse year and month from YYYY-MM-DD
        const [yearStr, monthStr] = dateStr.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        const monthlyData = await this.client.getMonthlySchedule(provinsi, kabkota, month, year);
        if (!monthlyData || monthlyData.length === 0) {
            return null;
        }

        // 3. Batch cache whole month to database
        const records = monthlyData.map((d) => {
            const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(d.tanggal).padStart(2, "0")}`;
            return {
                provinsi,
                kabkota,
                year,
                month,
                date: formattedDate,
                subuh: d.subuh,
                dzuhur: d.dzuhur,
                ashar: d.ashar,
                maghrib: d.maghrib,
                isya: d.isya,
            };
        });

        await this.db.sholatSchedule.createMany({
            data: records,
            skipDuplicates: true,
        });

        const targetRecord = records.find((r) => r.date === dateStr);
        if (!targetRecord) {
            return null;
        }

        return {
            subuh: targetRecord.subuh,
            dzuhur: targetRecord.dzuhur,
            ashar: targetRecord.ashar,
            maghrib: targetRecord.maghrib,
            isya: targetRecord.isya,
        };
    }

    async prefetchMonthlySchedule(
        provinsi: string,
        kabkota: string,
        year: number,
        month: number
    ): Promise<void> {
        const monthlyData = await this.client.getMonthlySchedule(provinsi, kabkota, month, year);
        if (!monthlyData || monthlyData.length === 0) {
            return;
        }

        const records = monthlyData.map((d) => {
            const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(d.tanggal).padStart(2, "0")}`;
            return {
                provinsi,
                kabkota,
                year,
                month,
                date: formattedDate,
                subuh: d.subuh,
                dzuhur: d.dzuhur,
                ashar: d.ashar,
                maghrib: d.maghrib,
                isya: d.isya,
            };
        });

        await this.db.sholatSchedule.createMany({
            data: records,
            skipDuplicates: true,
        });
    }
}
