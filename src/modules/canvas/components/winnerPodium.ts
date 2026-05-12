import type { PodiumWinner } from "../types/leaderboard";
import { drawGlow, roundedRect } from "../canvas/utils";

export function drawBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  fill: string,
) {
  roundedRect(context, x - 34, y - 18, 68, 36, 18);
  context.fillStyle = fill;
  context.fill();

  context.fillStyle = "#101114";
  context.font = "700 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
  context.textAlign = "center";
  context.fillText(label, x, y + 6);
}

export function drawAvatar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  person: PodiumWinner,
) {
  drawGlow(context, x, y, radius + 45, person.shadow);

  const ring = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
  ring.addColorStop(0, "#fff7da");
  ring.addColorStop(1, person.accent);
  context.fillStyle = ring;
  context.beginPath();
  context.arc(x, y, radius + 10, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  const face = context.createLinearGradient(x, y - radius, x, y + radius);
  face.addColorStop(0, "#2f3444");
  face.addColorStop(1, "#171a24");
  context.fillStyle = face;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  context.fillStyle = "rgba(255, 255, 255, 0.1)";
  context.beginPath();
  context.arc(x, y, radius * 0.78, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fff6e7";
  context.font = `${Math.round(radius * 0.9)}px Georgia, 'Times New Roman', serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initials, x, y + 4);

  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.2)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
}

export function drawCrown(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.translate(x, y);
  context.fillStyle = "#f6c667";
  context.beginPath();
  context.moveTo(-34, 18);
  context.lineTo(-22, -14);
  context.lineTo(-3, 6);
  context.lineTo(0, -24);
  context.lineTo(18, 4);
  context.lineTo(34, -12);
  context.lineTo(40, 18);
  context.closePath();
  context.fill();

  context.fillStyle = "#fff5cf";
  context.beginPath();
  context.arc(-22, -14, 5, 0, Math.PI * 2);
  context.arc(0, -24, 5, 0, Math.PI * 2);
  context.arc(34, -12, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function drawPodiumBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillTop: string,
  fillFace: string,
) {
  roundedRect(context, x, y, width, height, 26);
  context.fillStyle = fillFace;
  context.fill();

  roundedRect(context, x, y, width, 24, 18);
  context.fillStyle = fillTop;
  context.fill();
}

export function drawWinnerCard(
  context: CanvasRenderingContext2D,
  person: PodiumWinner,
  x: number,
  podiumY: number,
  podiumHeight: number,
) {
  const avatarY = podiumY - 96;
  const radius = person.rank === 1 ? 68 : 58;

  if (person.rank === 1) {
    drawCrown(context, x, avatarY - radius - 10);
  }

  drawAvatar(context, x, avatarY, radius, person);
  drawBadge(context, x, podiumY + podiumHeight - 42, `#${person.rank}`, person.accent);

  context.fillStyle = "#f4efe4";
  context.font = person.rank === 1
    ? "700 31px Georgia, 'Times New Roman', serif"
    : "700 27px Georgia, 'Times New Roman', serif";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(person.name, x, avatarY + radius + 88);

  context.fillStyle = "rgba(236, 226, 211, 0.78)";
  context.font = "500 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
  context.fillText(person.title, x, avatarY + radius + 118);

  context.fillStyle = person.accent;
  context.font = "700 19px 'Trebuchet MS', 'Avenir Next', sans-serif";
  context.fillText(person.points, x, avatarY + radius + 148);
}
