import type { LeaderboardCategory } from "../types/leaderboard";

export const leaderboardMeta: Record<
  LeaderboardCategory,
  {
    emoji: string;
    label: string;
    empty: string;
    metricLabel: string;
    badge: string;
    headline: string;
    subheadline: string;
    titles: [string, string, string];
  }
> = {
  yapping: {
    emoji: "🏆",
    label: "Top Yapping",
    empty: "No data yet.",
    metricLabel: "messages",
    badge: "Weekly Leaderboard",
    headline: "Top Yapping",
    subheadline: "The busiest voices in the group this week.",
    titles: ["Chat Monarch", "Reply Engine", "Conversation Spark"],
  },
  toxic: {
    emoji: "☠️",
    label: "Top Toxic",
    empty: "No data yet.",
    metricLabel: "bad words",
    badge: "Weekly Leaderboard",
    headline: "Top Toxic",
    subheadline: "Who dropped the most spicy words this week.",
    titles: ["Chaos Captain", "Salt Distributor", "Drama Supplier"],
  },
  sticker: {
    emoji: "🎭",
    label: "Top Sticker",
    empty: "No data yet.",
    metricLabel: "stickers",
    badge: "Weekly Leaderboard",
    headline: "Top Sticker",
    subheadline: "The heaviest sticker senders of the week.",
    titles: ["Sticker Emperor", "Meme Machine", "Reaction Dealer"],
  },
};
