import type { AwardsSceneData, LeaderboardCategory, LeaderboardMetric, PodiumWinner } from "../types/leaderboard";
import { leaderboardMeta } from "./leaderboardMeta";

const palette = [
  { accent: "#f6c667", shadow: "rgba(246, 198, 103, 0.38)" },
  { accent: "#7dd3fc", shadow: "rgba(125, 211, 252, 0.32)" },
  { accent: "#c4b5fd", shadow: "rgba(196, 181, 253, 0.32)" },
] as const;

const sampleEntries: Record<
  LeaderboardCategory,
  Array<{ name: string; value: number }>
> = {
  yapping: [
    { name: "Avery Stone", value: 12840 },
    { name: "Mila Chen", value: 11420 },
    { name: "Noah Vale", value: 10980 },
  ],
  toxic: [
    { name: "Avery Stone", value: 310 },
    { name: "Mila Chen", value: 268 },
    { name: "Noah Vale", value: 224 },
  ],
  sticker: [
    { name: "Avery Stone", value: 450 },
    { name: "Mila Chen", value: 403 },
    { name: "Noah Vale", value: 381 },
  ],
};

function formatMetric(value: number, label: string) {
  return `${new Intl.NumberFormat("en-US").format(value)} ${label}`;
}

function createPlaceholderWinner(rank: 1 | 2 | 3): PodiumWinner {
  const color = palette[rank - 1];

  return {
    name: "Open Slot",
    title: "Waiting for next week",
    points: "No stats yet",
    accent: color.accent,
    shadow: color.shadow,
    rank,
  };
}

export function buildAwardsScene(
  category: LeaderboardCategory,
  entries: LeaderboardMetric[],
): AwardsSceneData {
  const meta = leaderboardMeta[category];

  const winners = ([1, 2, 3] as const).map((rank) => {
    const entry = entries[rank - 1];

    if (!entry) {
      return createPlaceholderWinner(rank);
    }

    const color = palette[rank - 1];

    return {
      name: entry.label,
      title: meta.titles[rank - 1],
      points: formatMetric(entry.value, meta.metricLabel),
      accent: color.accent,
      shadow: color.shadow,
      rank,
    };
  }) as [PodiumWinner, PodiumWinner, PodiumWinner];

  return {
    badge: meta.badge,
    headline: meta.headline,
    subheadline: meta.subheadline,
    category,
    winners,
  };
}

export function getSampleAwardsScene(category: LeaderboardCategory): AwardsSceneData {
  const entries = sampleEntries[category].map((entry) => ({
    label: entry.name,
    value: entry.value,
  }));

  return buildAwardsScene(category, entries);
}
