import {
    FISH_CATALOG,
    FISH_RARITY_LABEL,
    FISH_RARITY_ORDER,
    Fish,
    FishRarity,
    formatPercent,
    getFishByKey,
    getNextRod,
    getRod,
} from "./fish.catalog";
import { FishInventoryItem, FishProfileState, FishRepository } from "./fish.repository";

const FISHING_SESSION_TTL_MS = 2 * 60 * 1000;

const RARITY_POWER: Record<FishRarity, number> = {
    common: 0,
    rare: 1,
    epic: 2,
    legend: 3,
};

type FishingSession = {
    position: number;
    expiresAt: number;
};

type AttemptCatchResult =
    | {
          status: "no-session" | "expired" | "invalid-position" | "broken-rod";
          profile?: FishProfileState;
      }
    | {
          status: "missed";
          position: number;
          profile: FishProfileState;
          rodBroke: boolean;
      }
    | {
          status: "trash";
          profile: FishProfileState;
          rodBroke: boolean;
      }
    | {
          status: "fish";
          fish: Fish;
          profile: FishProfileState;
          rodBroke: boolean;
      };

export class FishService {
    private readonly sessions = new Map<number, FishingSession>();

    constructor(private readonly fishRepo = new FishRepository()) {}

    async startFishing(userId: number) {
        const profile = await this.ensureRodHealth(await this.fishRepo.getOrCreateProfile(userId));
        const rod = getRod(profile.rodLevel);

        if (profile.rodHealth <= 0) {
            return { started: false as const, reason: "broken" as const, profile, rod };
        }

        const position = Math.floor(Math.random() * 9) + 1;
        this.sessions.set(userId, {
            position,
            expiresAt: Date.now() + FISHING_SESSION_TTL_MS,
        });

        return { started: true as const, profile, rod, position };
    }

    async attemptCatch(userId: number, position: number): Promise<AttemptCatchResult> {
        if (!Number.isInteger(position) || position < 1 || position > 9) {
            return { status: "invalid-position" };
        }

        const session = this.sessions.get(userId);

        if (!session) {
            return { status: "no-session" };
        }

        this.sessions.delete(userId);

        if (Date.now() > session.expiresAt) {
            return { status: "expired" };
        }

        const profile = await this.ensureRodHealth(await this.fishRepo.getOrCreateProfile(userId));
        const rod = getRod(profile.rodLevel);

        if (profile.rodHealth <= 0) {
            return { status: "broken-rod", profile };
        }

        if (position !== session.position) {
            const damagedProfile = await this.damageRod(profile);
            return {
                status: "missed",
                position: session.position,
                profile: damagedProfile,
                rodBroke: damagedProfile.rodHealth <= 0,
            };
        }

        if (Math.random() > rod.fishChance) {
            await this.fishRepo.recordTrash(profile.id);
            const damagedProfile = await this.damageRod({ ...profile, totalTrash: profile.totalTrash + 1 });

            return {
                status: "trash",
                profile: damagedProfile,
                rodBroke: damagedProfile.rodHealth <= 0,
            };
        }

        const fish = this.pickFish(rod.rareBonus);
        await this.fishRepo.addCatch(profile.id, fish.key);
        const damagedProfile = await this.damageRod({ ...profile, totalCaught: profile.totalCaught + 1 });

        return {
            status: "fish",
            fish,
            profile: damagedProfile,
            rodBroke: damagedProfile.rodHealth <= 0,
        };
    }

    async getProfile(userId: number) {
        const profile = await this.ensureRodHealth(await this.fishRepo.getOrCreateProfile(userId));
        const inventory = await this.fishRepo.getInventory(profile.id);

        return { profile, inventory };
    }

    async sellFish(userId: number, fishKeyOrAll?: string) {
        const profile = await this.fishRepo.getOrCreateProfile(userId);
        const inventory = await this.fishRepo.getInventory(profile.id);
        const sellableInventory = inventory.filter((item) => item.quantity > 0);

        if (sellableInventory.length === 0) {
            return { sold: false as const, reason: "empty" as const };
        }

        if (!fishKeyOrAll || fishKeyOrAll === "all") {
            const sellable = sellableInventory
                .map((item) => this.toSellLine(item))
                .filter((item): item is NonNullable<typeof item> => Boolean(item));
            const totalCoins = sellable.reduce((sum, item) => sum + item.coins, 0);
            const totalQuantity = sellable.reduce((sum, item) => sum + item.quantity, 0);

            for (const item of sellable) {
                await this.fishRepo.sell(profile.id, item.fish.key, item.quantity, item.coins);
            }

            return { sold: true as const, totalCoins, totalQuantity, lines: sellable };
        }

        const normalizedKey = this.normalizeFishKey(fishKeyOrAll);
        const fish = getFishByKey(normalizedKey);

        if (!fish) {
            return { sold: false as const, reason: "unknown" as const };
        }

        const item = sellableInventory.find((inventoryItem) => inventoryItem.fishKey === fish.key);

        if (!item) {
            return { sold: false as const, reason: "missing" as const, fish };
        }

        const totalCoins = fish.sellPrice * item.quantity;
        await this.fishRepo.sell(profile.id, fish.key, item.quantity, totalCoins);

        return {
            sold: true as const,
            totalCoins,
            totalQuantity: item.quantity,
            lines: [{ fish, quantity: item.quantity, coins: totalCoins }],
        };
    }

    async moveFishToTank(userId: number, fishKey: string, quantity: number) {
        return this.moveTankFish(userId, fishKey, quantity, "save");
    }

    async moveFishFromTank(userId: number, fishKey: string, quantity: number) {
        return this.moveTankFish(userId, fishKey, quantity, "release");
    }

    async upgradeRod(userId: number) {
        const profile = await this.ensureRodHealth(await this.fishRepo.getOrCreateProfile(userId));
        const currentRod = getRod(profile.rodLevel);
        const nextRod = getNextRod(profile.rodLevel);

        if (!nextRod || currentRod.upgradeCost === undefined) {
            return { upgraded: false as const, reason: "max" as const, profile, currentRod };
        }

        if (profile.coins < currentRod.upgradeCost) {
            return {
                upgraded: false as const,
                reason: "coins" as const,
                profile,
                currentRod,
                nextRod,
                cost: currentRod.upgradeCost,
            };
        }

        const updatedProfile = await this.fishRepo.upgradeRod(profile.id, nextRod.level, nextRod.maxHealth, currentRod.upgradeCost);

        return {
            upgraded: true as const,
            profile: updatedProfile,
            currentRod,
            nextRod,
            cost: currentRod.upgradeCost,
        };
    }

    async repairRod(userId: number) {
        const profile = await this.fishRepo.getOrCreateProfile(userId);
        const rod = getRod(profile.rodLevel);

        if (profile.rodHealth >= rod.maxHealth) {
            return { repaired: false as const, reason: "full" as const, profile, rod };
        }

        if (profile.coins < rod.repairCost) {
            return { repaired: false as const, reason: "coins" as const, profile, rod };
        }

        const updatedProfile = await this.fishRepo.repairRod(profile.id, rod.maxHealth, rod.repairCost);

        return { repaired: true as const, profile: updatedProfile, rod };
    }

    renderInventory(profile: FishProfileState, inventory: FishInventoryItem[]) {
        const rod = getRod(profile.rodLevel);
        const nextRod = getNextRod(profile.rodLevel);
        const bagLines = this.renderFishLines(inventory, "bag");
        const tankCount = inventory.reduce((sum, item) => sum + item.tankQuantity, 0);
        const nextUpgrade = nextRod && rod.upgradeCost !== undefined ? `\nNext upgrade: ${rod.upgradeCost} coins` : "\nRod is max level.";
        const inventoryText = bagLines.length > 0 ? bagLines.join("\n") : "No sellable fish in your bag.";

        return `*Fish Inventory*
Coins: ${profile.coins}
Rod: Lv.${rod.level} ${rod.name}
Health: ${profile.rodHealth}/${rod.maxHealth}
Fish chance: ${formatPercent(rod.fishChance)}
Total caught: ${profile.totalCaught}
Trash caught: ${profile.totalTrash}
Tank fish: ${tankCount}

${inventoryText}${nextUpgrade}

Use akr-fish tank to showcase saved fish.`;
    }

    renderTank(inventory: FishInventoryItem[]) {
        const tankLines = this.renderFishLines(inventory, "tank");
        const tankText = tankLines.length > 0 ? tankLines.join("\n") : "Your tank is empty.";

        return `*Fish Tank*
Saved fish here are protected from akr-fish sell all.

${tankText}

Use: akr-fish save <fish-key>
Use: akr-fish release <fish-key>`;
    }

    renderShop(profile: FishProfileState) {
        const rod = getRod(profile.rodLevel);
        const nextRod = getNextRod(profile.rodLevel);
        const upgradeText =
            nextRod && rod.upgradeCost !== undefined
                ? `Upgrade to Lv.${nextRod.level} ${nextRod.name}: ${rod.upgradeCost} coins`
                : "Your rod is already max level.";

        return `*Fish Shop*
Coins: ${profile.coins}
Rod: Lv.${rod.level} ${rod.name}
Health: ${profile.rodHealth}/${rod.maxHealth}
Fish chance: ${formatPercent(rod.fishChance)}
Break chance: ${formatPercent(rod.breakChance)}

${upgradeText}
Repair cost: ${rod.repairCost} coins

Use: akr-fish upgrade
Use: akr-fish repair`;
    }

    renderHelp() {
        return `*Fish It*
• akr-fish — show the 9-box fishing spot
• akr-catch <1-9> — catch the fish in that box
• akr-fish inv — see coins, rod, and bag
• akr-fish sell all — sell bag fish
• akr-fish save <fish-key> — move fish to tank
• akr-fish tank — showcase protected fish
• akr-fish release <fish-key> — move tank fish to bag
• akr-fish shop — see upgrade and repair
• akr-fish upgrade — improve fish chance and rarity
• akr-fish repair — repair broken/damaged rod

Rarity: Common, Rare, Epic, Legend`;
    }

    private async moveTankFish(userId: number, fishKeyValue: string, quantityValue: number, direction: "save" | "release") {
        const normalizedKey = this.normalizeFishKey(fishKeyValue);
        const fish = getFishByKey(normalizedKey);

        if (!fish) {
            return { moved: false as const, reason: "unknown" as const };
        }

        const profile = await this.fishRepo.getOrCreateProfile(userId);
        const inventory = await this.fishRepo.getInventory(profile.id);
        const item = inventory.find((inventoryItem) => inventoryItem.fishKey === fish.key);
        const available = direction === "save" ? item?.quantity || 0 : item?.tankQuantity || 0;
        const quantity = Math.max(1, quantityValue || 1);

        if (!item || available < quantity) {
            return { moved: false as const, reason: "missing" as const, fish, available };
        }

        if (direction === "save") {
            await this.fishRepo.moveToTank(profile.id, fish.key, quantity);
        } else {
            await this.fishRepo.moveFromTank(profile.id, fish.key, quantity);
        }

        return { moved: true as const, fish, quantity };
    }

    private async ensureRodHealth(profile: FishProfileState) {
        const rod = getRod(profile.rodLevel);

        if (profile.rodHealth > 0 && profile.rodHealth <= rod.maxHealth) {
            return profile;
        }

        const rodHealth = Math.min(Math.max(profile.rodHealth, 0), rod.maxHealth);
        return this.fishRepo.damageRod(profile.id, rodHealth);
    }

    private async damageRod(profile: FishProfileState) {
        const rod = getRod(profile.rodLevel);
        const normalDamage = Math.max(profile.rodHealth - 1, 0);
        const rodHealth = Math.random() < rod.breakChance ? 0 : normalDamage;

        return this.fishRepo.damageRod(profile.id, rodHealth);
    }

    private pickFish(rareBonus: number) {
        const weightedFish = FISH_CATALOG.map((fish) => ({
            fish,
            weight: fish.weight * Math.pow(rareBonus, RARITY_POWER[fish.rarity]),
        }));
        const totalWeight = weightedFish.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const item of weightedFish) {
            roll -= item.weight;
            if (roll <= 0) return item.fish;
        }

        return FISH_CATALOG[0];
    }

    private renderFishLines(inventory: FishInventoryItem[], location: "bag" | "tank") {
        const quantityKey = location === "bag" ? "quantity" : "tankQuantity";

        return FISH_RARITY_ORDER.flatMap((rarity) => {
            const rarityItems = inventory
                .map((item) => ({ item, fish: getFishByKey(item.fishKey) }))
                .filter(({ item, fish }) => fish?.rarity === rarity && item[quantityKey] > 0)
                .map(({ item, fish }) => {
                    const knownFish = fish as Fish;
                    const price = location === "bag" ? ` — ${knownFish.sellPrice * item.quantity} coins` : "";
                    return `• ${knownFish.key}: ${knownFish.name} x${item[quantityKey]}${price}`;
                });

            if (rarityItems.length === 0) return [];

            return [`${FISH_RARITY_LABEL[rarity]}:`, ...rarityItems];
        });
    }

    private toSellLine(item: FishInventoryItem) {
        const fish = getFishByKey(item.fishKey);
        if (!fish || item.quantity <= 0) return null;

        return {
            fish,
            quantity: item.quantity,
            coins: fish.sellPrice * item.quantity,
        };
    }

    private normalizeFishKey(value: string) {
        return value.trim().toLowerCase().replace(/\s+/g, "-");
    }
}
