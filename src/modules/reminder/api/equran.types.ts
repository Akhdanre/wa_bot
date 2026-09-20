export interface EquranResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface EquranDailySchedule {
    tanggal: number;
    hari: string;
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

export interface EquranMonthlyScheduleData {
    provinsi: string;
    kabkota: string;
    bulan: number;
    tahun: number;
    jadwal: EquranDailySchedule[];
}
