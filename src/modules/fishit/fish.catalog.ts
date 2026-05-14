export type FishRarity = "common" | "rare" | "epic" | "legend";

export type Fish = {
    key: string;
    name: string;
    rarity: FishRarity;
    sellPrice: number;
    weight: number;
};

export type Rod = {
    level: number;
    name: string;
    fishChance: number;
    rareBonus: number;
    maxHealth: number;
    breakChance: number;
    repairCost: number;
    upgradeCost?: number;
};

export const FISH_RARITY_LABEL: Record<FishRarity, string> = {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legend: "Legend",
};

export const FISH_RARITY_ORDER: FishRarity[] = ["common", "rare", "epic", "legend"];

export const FISH_CATALOG: Fish[] = [
    { key: "lele", name: "Lele", rarity: "common", sellPrice: 12, weight: 36 },
    { key: "nila", name: "Nila", rarity: "common", sellPrice: 15, weight: 30 },
    { key: "gurame", name: "Gurame", rarity: "common", sellPrice: 18, weight: 24 },
    { key: "tongkol", name: "Tongkol", rarity: "common", sellPrice: 22, weight: 18 },
    { key: "salmon", name: "Salmon", rarity: "rare", sellPrice: 55, weight: 9 },
    { key: "tuna", name: "Tuna", rarity: "rare", sellPrice: 70, weight: 7 },
    { key: "kakap-merah", name: "Kakap Merah", rarity: "rare", sellPrice: 85, weight: 5 },
    { key: "ikan-pedang", name: "Ikan Pedang", rarity: "epic", sellPrice: 210, weight: 2.4 },
    { key: "koi-emas", name: "Koi Emas", rarity: "epic", sellPrice: 260, weight: 1.8 },
    { key: "naga-laut", name: "Naga Laut", rarity: "legend", sellPrice: 900, weight: 0.35 },
    { key: "paus-kristal", name: "Paus Kristal", rarity: "legend", sellPrice: 1200, weight: 0.2 },
];

export const ROD_LEVELS: Rod[] = [
    { level: 1, name: "Bamboo Rod", fishChance: 0.55, rareBonus: 1, maxHealth: 10, breakChance: 0.04, repairCost: 0, upgradeCost: 120 },
    { level: 2, name: "Copper Rod", fishChance: 0.6, rareBonus: 1.15, maxHealth: 12, breakChance: 0.035, repairCost: 20, upgradeCost: 260 },
    { level: 3, name: "Iron Rod", fishChance: 0.66, rareBonus: 1.32, maxHealth: 14, breakChance: 0.03, repairCost: 40, upgradeCost: 520 },
    { level: 4, name: "Silver Rod", fishChance: 0.71, rareBonus: 1.52, maxHealth: 16, breakChance: 0.025, repairCost: 70, upgradeCost: 900 },
    { level: 5, name: "Golden Rod", fishChance: 0.76, rareBonus: 1.78, maxHealth: 18, breakChance: 0.022, repairCost: 110, upgradeCost: 1500 },
    { level: 6, name: "Mythic Rod", fishChance: 0.81, rareBonus: 2.1, maxHealth: 20, breakChance: 0.018, repairCost: 160, upgradeCost: 2400 },
    { level: 7, name: "Ocean Rod", fishChance: 0.86, rareBonus: 2.5, maxHealth: 24, breakChance: 0.014, repairCost: 220, upgradeCost: 3600 },
    { level: 8, name: "Legend Rod", fishChance: 0.9, rareBonus: 3, maxHealth: 30, breakChance: 0.01, repairCost: 300 },
];

export function getFishByKey(key: string) {
    return FISH_CATALOG.find((fish) => fish.key === key);
}

export function getRod(level: number) {
    return ROD_LEVELS.find((rod) => rod.level === level) || ROD_LEVELS[0];
}

export function getNextRod(level: number) {
    return ROD_LEVELS.find((rod) => rod.level === level + 1);
}

export function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}
