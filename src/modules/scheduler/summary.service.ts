import { buildLeaderboardSection } from "./leaderboard.service";

export async function generateSummary(groupId: number): Promise<string> {
    const [yapping, toxic, sticker] = await Promise.all([
        buildLeaderboardSection(groupId, "yapping"),
        buildLeaderboardSection(groupId, "toxic"),
        buildLeaderboardSection(groupId, "sticker"),
    ]);

    let text = "📊 *Weekly Leaderboard Summary*\n";
    text += `\n\n${yapping.headline}\n${yapping.text}`;
    text += `\n\n${toxic.headline}\n${toxic.text}`;
    text += `\n\n${sticker.headline}\n${sticker.text}`;

    return text;
}
