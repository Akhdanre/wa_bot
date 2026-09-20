export type MealType = "breakfast" | "lunch" | "dinner";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export function isValidMeal(meal: string): meal is MealType {
    return MEAL_TYPES.includes(meal.toLowerCase() as MealType);
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
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        waId: string;
        name: string | null;
    };
}
