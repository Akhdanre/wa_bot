export type LeaderboardCategory = "yapping" | "toxic" | "sticker";

export type LeaderboardMetric = {
  label: string;
  value: number;
};

export type PodiumWinner = {
  name: string;
  title: string;
  points: string;
  accent: string;
  shadow: string;
  rank: 1 | 2 | 3;
};

export type AwardsSceneData = {
  badge: string;
  headline: string;
  subheadline: string;
  category: LeaderboardCategory;
  winners: [PodiumWinner, PodiumWinner, PodiumWinner];
};
