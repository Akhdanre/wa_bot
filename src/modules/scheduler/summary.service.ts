import { StatRepository } from "../message/stat.repository";

const statRepo = new StatRepository();

export async function generateSummary(groupId: number): Promise<string> {
    const [yapping, toxic, sticker] = await Promise.all([
        statRepo.getTopByGroup(groupId, 3),
        statRepo.getTopBadWordByGroup(groupId, 3),
        statRepo.getTopStickerByGroup(groupId, 3),
    ]);

    let text = "📊 *Weekly Leaderboard Summary*\n";

    text += "\n🏆 *Top Yapping:*\n";
    text += yapping.length
        ? yapping.map((s, i) => `${i + 1}. ${s.user.name || s.user.waId} — ${s.count} messages`).join("\n")
        : "No data yet.";

    text += "\n\n☠️ *Top Toxic:*\n";
    text += toxic.length
        ? toxic.map((s, i) => `${i + 1}. ${s.user.name || s.user.waId} — ${s.totalBadWord} bad words`).join("\n")
        : "No data yet.";

    text += "\n\n🎨 *Top Sticker:*\n";
    text += sticker.length
        ? sticker.map((s, i) => `${i + 1}. ${s.user.name || s.user.waId} — ${s.totalSticker} stickers`).join("\n")
        : "No data yet.";

    return text;
}
