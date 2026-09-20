import { EquranResponse, EquranDailySchedule, EquranMonthlyScheduleData } from "./equran.types";

export class EquranClient {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;

    constructor(baseUrl: string = "https://equran.id/api/v2/shalat", timeoutMs: number = 10000) {
        this.baseUrl = baseUrl;
        this.timeoutMs = timeoutMs;
    }

    private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            return response;
        } finally {
            clearTimeout(timer);
        }
    }

    async getProvinces(): Promise<string[]> {
        const res = await this.fetchWithTimeout(`${this.baseUrl}/provinsi`);
        if (!res.ok) {
            throw new Error(`Failed to fetch provinces: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as EquranResponse<string[]>;
        return json.data;
    }

    async getKabKota(provinsi: string): Promise<string[]> {
        const res = await this.fetchWithTimeout(`${this.baseUrl}/kabkota`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provinsi }),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch kabkota for ${provinsi}: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as EquranResponse<string[]>;
        return json.data;
    }

    async getMonthlySchedule(
        provinsi: string,
        kabkota: string,
        bulan: number,
        tahun: number
    ): Promise<EquranDailySchedule[]> {
        const res = await this.fetchWithTimeout(this.baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provinsi, kabkota, bulan, tahun }),
        });
        if (!res.ok) {
            throw new Error(
                `Failed to fetch schedule for ${provinsi} / ${kabkota} (${bulan}/${tahun}): ${res.status} ${res.statusText}`
            );
        }
        const json = (await res.json()) as EquranResponse<EquranMonthlyScheduleData>;
        return json.data.jadwal;
    }
}
