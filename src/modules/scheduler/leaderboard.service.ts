import { StatRepository } from "../message/stat.repository";
import type { StatLeaderboardRow } from "../message/stat.repository";
import type { LeaderboardCategory, LeaderboardMetric } from "../canvas/types/leaderboard";
import { buildAwardsScene } from "../canvas/data/winners";

const statRepo = new StatRepository();

const summaryMeta: Record<
  LeaderboardCategory,
  {
    emoji: string;
    label: string;
    empty: string;
    metricLabel: string;
  }
> = {
  yapping: {
    emoji: "🏆",
    label: "Top Yapping",
    empty: "No data yet.",
    metricLabel: "messages",
  },
  toxic: {
    emoji: "☠️",
    label: "Top Toxic",
    empty: "No data yet.",
    metricLabel: "bad words",
  },
  sticker: {
    emoji: "🎭",
    label: "Top Sticker",
    empty: "No data yet.",
    metricLabel: "stickers",
  },
};

function toMetric(category: LeaderboardCategory, stat: StatLeaderboardRow): LeaderboardMetric {
  if (category === "toxic") {
    return {
      label: stat.user.name || stat.user.waId,
      value: stat.totalBadWord,
    };
  }

  if (category === "sticker") {
    return {
      label: stat.user.name || stat.user.waId,
      value: stat.totalSticker,
    };
  }

  return {
    label: stat.user.name || stat.user.waId,
    value: stat.count,
  };
}

function formatSummaryLine(
  category: LeaderboardCategory,
  metric: LeaderboardMetric,
  index: number,
) {
  const meta = summaryMeta[category];
  return `${index + 1}. ${metric.label} — ${metric.value} ${meta.metricLabel}`;
}

export async function getLeaderboardMetrics(
  groupId: number,
  category: LeaderboardCategory,
): Promise<LeaderboardMetric[]> {
  let stats: StatLeaderboardRow[];

  if (category === "toxic") {
    stats = await statRepo.getTopBadWordByGroup(groupId, 3);
  } else if (category === "sticker") {
    stats = await statRepo.getTopStickerByGroup(groupId, 3);
  } else {
    stats = await statRepo.getTopByGroup(groupId, 3);
  }

  return stats.map((stat) => toMetric(category, stat));
}

export async function buildLeaderboardSection(
  groupId: number,
  category: LeaderboardCategory,
) {
  const metrics = await getLeaderboardMetrics(groupId, category);
  const meta = summaryMeta[category];

  const text = metrics.length
    ? metrics.map((metric, index) => formatSummaryLine(category, metric, index)).join("\n")
    : meta.empty;

  return {
    category,
    headline: `${meta.emoji} *${meta.label}:*`,
    metrics,
    scene: buildAwardsScene(category, metrics),
    text,
  };
}
