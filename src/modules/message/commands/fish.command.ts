import { Message } from "whatsapp-web.js";
import { UserRepository } from "../user.repository";
import { FishService } from "../../fishit/fish.service";
import { FISH_RARITY_LABEL, formatPercent, getRod } from "../../fishit/fish.catalog";
import { generateFishBox } from "../../fishit/fish_builder";

const userRepo = new UserRepository();
const fishService = new FishService();

export async function fishCommand(message: Message, body: string) {
    const user = await getMessageUser(message);
    const args = body.trim().split(/\s+/).slice(1);
    const subCommand = (args[0] || "start").toLowerCase();

    switch (subCommand) {
        case "start":
            await startFishing(message, user.id);
            return;
        case "inv":
        case "inventory":
        case "bag":
            await showInventory(message, user.id);
            return;
        case "tank":
            await showTank(message, user.id);
            return;
        case "save":
            await saveFish(message, user.id, args.slice(1));
            return;
        case "release":
        case "unsave":
            await releaseFish(message, user.id, args.slice(1));
            return;
        case "sell":
            await sellFish(message, user.id, args.slice(1).join(" "));
            return;
        case "shop":
        case "store":
            await showShop(message, user.id);
            return;
        case "upgrade":
            await upgradeRod(message, user.id);
            return;
        case "repair":
            await repairRod(message, user.id);
            return;
        case "help":
            await message.reply(fishService.renderHelp());
            return;
        default:
            await message.reply(`Unknown fish command: ${subCommand}\n\n${fishService.renderHelp()}`);
    }
}

export async function catchCommand(message: Message, body: string) {
    const user = await getMessageUser(message);
    const position = Number(body.trim().split(/\s+/)[1]);
    const result = await fishService.attemptCatch(user.id, position);

    switch (result.status) {
        case "invalid-position":
            await message.reply("Use a box number from 1 to 9.\nExample: akr-catch 5");
            return;
        case "no-session":
            await message.reply("No active fishing spot. Use akr-fish first, then akr-catch <1-9>.");
            return;
        case "expired":
            await message.reply("The fish swam away. Use akr-fish to find a new spot.");
            return;
        case "broken-rod":
            await message.reply("Your rod is broken. Use akr-fish repair before fishing again.");
            return;
        case "missed":
            await message.reply(
                `You missed it. The fish was in box ${result.position}.\n\n${renderRodAfterCatch(result.profile, result.rodBroke)}`
            );
            return;
        case "trash":
            await message.reply(`You caught trash...\n\n${renderRodAfterCatch(result.profile, result.rodBroke)}`);
            return;
        case "fish":
            await message.reply(
                `You caught *${result.fish.name}* (${FISH_RARITY_LABEL[result.fish.rarity]})!\nFish key: ${result.fish.key}\nSell price: ${result.fish.sellPrice} coins\n\n${renderRodAfterCatch(result.profile, result.rodBroke)}`
            );
            return;
    }
}

async function startFishing(message: Message, userId: number) {
    const result = await fishService.startFishing(userId);

    if (!result.started) {
        await message.reply("Your rod is broken. Use akr-fish repair before fishing again.");
        return;
    }

    const fishBox = generateFishBox(result.position);

    await message.reply(
        `*Fish It*\n\`\`\`\n${fishBox}\n\`\`\`\nThe fish is in box ${result.position}.\nUse: akr-catch ${result.position}\n\nFish chance: ${formatPercent(result.rod.fishChance)}\nRod: Lv.${result.rod.level} ${result.rod.name} (${result.profile.rodHealth}/${result.rod.maxHealth})`
    );
}

async function showInventory(message: Message, userId: number) {
    const { profile, inventory } = await fishService.getProfile(userId);
    await message.reply(fishService.renderInventory(profile, inventory));
}

async function showTank(message: Message, userId: number) {
    const { inventory } = await fishService.getProfile(userId);
    await message.reply(fishService.renderTank(inventory));
}

async function saveFish(message: Message, userId: number, args: string[]) {
    const { fishKey, quantity } = parseFishMoveArgs(args);

    if (!fishKey) {
        await message.reply("Use: akr-fish save <fish-key> [amount]\nExample: akr-fish save lele 1");
        return;
    }

    const result = await fishService.moveFishToTank(userId, fishKey, quantity);
    await replyToTankMove(message, result, "saved to tank", "in your bag");
}

async function releaseFish(message: Message, userId: number, args: string[]) {
    const { fishKey, quantity } = parseFishMoveArgs(args);

    if (!fishKey) {
        await message.reply("Use: akr-fish release <fish-key> [amount]\nExample: akr-fish release lele 1");
        return;
    }

    const result = await fishService.moveFishFromTank(userId, fishKey, quantity);
    await replyToTankMove(message, result, "released to bag", "in your tank");
}

async function sellFish(message: Message, userId: number, fishKeyOrAll: string) {
    const result = await fishService.sellFish(userId, fishKeyOrAll.trim() || "all");

    if (!result.sold) {
        if (result.reason === "empty") {
            await message.reply("No sellable fish in your bag. Tank fish are protected. Use akr-fish tank to check them.");
            return;
        }

        if (result.reason === "unknown") {
            await message.reply("I do not know that fish. Use akr-fish inv to see fish keys.");
            return;
        }

        await message.reply(`You do not have any sellable ${result.fish.name}. It may be in your tank.`);
        return;
    }

    const soldLines = result.lines.map((line) => `• ${line.fish.name} x${line.quantity} — ${line.coins} coins`);

    await message.reply(`Sold ${result.totalQuantity} fish for ${result.totalCoins} coins.\n\n${soldLines.join("\n")}`);
}

async function showShop(message: Message, userId: number) {
    const { profile } = await fishService.getProfile(userId);
    await message.reply(fishService.renderShop(profile));
}

async function upgradeRod(message: Message, userId: number) {
    const result = await fishService.upgradeRod(userId);

    if (!result.upgraded) {
        if (result.reason === "max") {
            await message.reply(`Your rod is already max level: Lv.${result.currentRod.level} ${result.currentRod.name}.`);
            return;
        }

        await message.reply(
            `Not enough coins.\n\nNeed: ${result.cost} coins\nYou have: ${result.profile.coins} coins\nUpgrade: Lv.${result.nextRod.level} ${result.nextRod.name}\n\nUse akr-fish sell all to earn coins.`
        );
        return;
    }

    await message.reply(
        `Rod upgraded!\n\nLv.${result.currentRod.level} ${result.currentRod.name} -> Lv.${result.nextRod.level} ${result.nextRod.name}\nCost: ${result.cost} coins\nHealth restored: ${result.profile.rodHealth}/${result.nextRod.maxHealth}\nCoins left: ${result.profile.coins}`
    );
}

async function repairRod(message: Message, userId: number) {
    const result = await fishService.repairRod(userId);

    if (!result.repaired) {
        if (result.reason === "full") {
            await message.reply(`Your rod is already healthy: ${result.profile.rodHealth}/${result.rod.maxHealth}.`);
            return;
        }

        await message.reply(
            `Not enough coins to repair.\n\nRepair cost: ${result.rod.repairCost} coins\nYou have: ${result.profile.coins} coins\nTip: Bamboo Rod repair is free.`
        );
        return;
    }

    await message.reply(`Rod repaired: ${result.profile.rodHealth}/${result.rod.maxHealth}\nCost: ${result.rod.repairCost} coins`);
}

async function getMessageUser(message: Message) {
    const contact = await message.getContact();
    return userRepo.upsert(contact.id._serialized, contact.pushname);
}

async function replyToTankMove(
    message: Message,
    result: Awaited<ReturnType<FishService["moveFishToTank"]>>,
    actionText: string,
    locationText: string
) {
    if (!result.moved) {
        if (result.reason === "unknown") {
            await message.reply("I do not know that fish. Use akr-fish inv to see fish keys.");
            return;
        }

        await message.reply(`Not enough ${result.fish.name} ${locationText}. Available: ${result.available}`);
        return;
    }

    await message.reply(`${result.fish.name} x${result.quantity} ${actionText}.`);
}

function renderRodAfterCatch(profile: { rodLevel: number; rodHealth: number }, rodBroke: boolean) {
    const rod = getRod(profile.rodLevel);
    const status = `Rod health: ${profile.rodHealth}/${rod.maxHealth}`;

    if (rodBroke) {
        return `${status}\nYour rod broke. Use akr-fish repair.`;
    }

    return `${status}\nUse akr-fish to find another fish.`;
}

function parseFishMoveArgs(args: string[]) {
    const maybeQuantity = Number(args[args.length - 1]);
    const hasQuantity = Number.isInteger(maybeQuantity) && maybeQuantity > 0;
    const fishKeyParts = hasQuantity ? args.slice(0, -1) : args;

    return {
        fishKey: fishKeyParts.join(" "),
        quantity: hasQuantity ? maybeQuantity : 1,
    };
}
