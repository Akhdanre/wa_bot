export type MealType = "breakfast" | "lunch" | "dinner";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export function isValidMeal(meal: string): meal is MealType {
    return MEAL_TYPES.includes(meal.toLowerCase() as MealType);
}

export type SholatPrayer = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";
export const SHOLAT_PRAYERS: SholatPrayer[] = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

export function isValidSholatPrayer(prayer: string): prayer is SholatPrayer {
    return SHOLAT_PRAYERS.includes(prayer.toLowerCase() as SholatPrayer);
}

export interface SholatDailyTimes {
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

export function isValidTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
}

export interface ReminderProfileWithUser {
    id: number;
    userId: number;
    enabled: boolean;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
    lastSentMeal: string | null;
    lastSentDate: string | null;
    sholatEnabled: boolean;
    provinsi: string | null;
    kabkota: string | null;
    lastSentSholat: string | null;
    lastSholatDate: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        waId: string;
        name: string | null;
    };
}
