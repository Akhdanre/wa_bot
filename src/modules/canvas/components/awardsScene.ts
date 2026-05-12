import { CANVAS_SIZE } from "../canvas/constants";
import { drawGlow, roundedRect } from "../canvas/utils";
import type { AwardsSceneData } from "../types/leaderboard";
import { drawPodiumBlock, drawWinnerCard } from "./winnerPodium";

export function drawStars(context: CanvasRenderingContext2D) {
  for (let index = 0; index < 26; index += 1) {
    const x = 70 + ((index * 137) % (CANVAS_SIZE - 140));
    const y = 60 + ((index * 89) % 180);
    const radius = index % 3 === 0 ? 2.8 : 1.8;

    context.fillStyle = index % 4 === 0
      ? "rgba(246, 198, 103, 0.75)"
      : "rgba(255, 255, 255, 0.72)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

export function drawAwardsScene(
  context: CanvasRenderingContext2D,
  scene: AwardsSceneData,
) {
  const background = context.createLinearGradient(0, 0, 0, CANVAS_SIZE);
  background.addColorStop(0, "#0b1020");
  background.addColorStop(0.5, "#12192d");
  background.addColorStop(1, "#20172b");
  context.fillStyle = background;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  drawGlow(context, 220, 120, 220, "rgba(75, 168, 255, 0.14)");
  drawGlow(context, 980, 140, 240, "rgba(255, 125, 164, 0.12)");
  drawGlow(context, 620, 310, 300, "rgba(246, 198, 103, 0.1)");
  drawStars(context);

  context.fillStyle = "rgba(255, 255, 255, 0.06)";
  roundedRect(context, 72, 62, 240, 44, 22);
  context.fill();
  context.fillStyle = "#e9d7aa";
  context.font = "700 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
  context.textAlign = "center";
  context.fillText(scene.badge, 192, 90);

  context.fillStyle = "#fff6e7";
  context.font = "700 64px Georgia, 'Times New Roman', serif";
  context.textAlign = "left";
  context.fillText(scene.headline, 84, 182);

  context.fillStyle = "rgba(248, 239, 225, 0.78)";
  context.font = "500 24px 'Trebuchet MS', 'Avenir Next', sans-serif";
  context.fillText(scene.subheadline, 86, 228);

  const floor = context.createLinearGradient(0, 700, 0, CANVAS_SIZE);
  floor.addColorStop(0, "rgba(255, 255, 255, 0.02)");
  floor.addColorStop(1, "rgba(255, 255, 255, 0.09)");
  context.fillStyle = floor;
  roundedRect(context, 60, 700, 960, 300, 42);
  context.fill();

  const blocks = [
    {
      x: 120,
      y: 650,
      width: 250,
      height: 220,
      top: "#3d5878",
      face: "#27354f",
      winner: scene.winners[1],
    },
    {
      x: 400,
      y: 560,
      width: 280,
      height: 320,
      top: "#8d6b24",
      face: "#5f4314",
      winner: scene.winners[0],
    },
    {
      x: 710,
      y: 680,
      width: 250,
      height: 190,
      top: "#65508a",
      face: "#3c3157",
      winner: scene.winners[2],
    },
  ] as const;

  for (const block of blocks) {
    drawPodiumBlock(
      context,
      block.x,
      block.y,
      block.width,
      block.height,
      block.top,
      block.face,
    );
    drawWinnerCard(context, block.winner, block.x + block.width / 2, block.y, block.height);
  }
}
