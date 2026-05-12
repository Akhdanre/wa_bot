import { CANVAS_SIZE } from "./constants";

// This script runs in the browser context through Puppeteer.
// It stays as a plain string so tsx/esbuild cannot inject helpers like __name.
export function buildAwardsRendererScript() {
  return `(sceneData) => {
    const canvas = document.querySelector("#awards");
    if (!canvas) throw new Error("Awards canvas not found");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas export is not supported");

    const CANVAS_SIZE = ${JSON.stringify(CANVAS_SIZE)};

    const roundedRect = (x, y, width, height, radius) => {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.lineTo(x + width - radius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + radius);
      context.lineTo(x + width, y + height - radius);
      context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      context.lineTo(x + radius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.closePath();
    };

    const drawGlow = (x, y, radius, color) => {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const drawStars = () => {
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
    };

    const drawBadge = (x, y, label, fill) => {
      roundedRect(x - 34, y - 18, 68, 36, 18);
      context.fillStyle = fill;
      context.fill();

      context.fillStyle = "#101114";
      context.font = "700 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
      context.textAlign = "center";
      context.fillText(label, x, y + 6);
    };

    const drawAvatar = (x, y, radius, person) => {
      drawGlow(x, y, radius + 45, person.shadow);

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
        .split(/\\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0] ? part[0].toUpperCase() : "")
        .join("") || "?";

      context.fillStyle = "rgba(255, 255, 255, 0.1)";
      context.beginPath();
      context.arc(x, y, radius * 0.78, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#fff6e7";
      context.font = Math.round(radius * 0.9) + "px Georgia, 'Times New Roman', serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(initials, x, y + 4);
      context.restore();

      context.strokeStyle = "rgba(255, 255, 255, 0.2)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
    };

    const drawCrown = (x, y) => {
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
    };

    const drawPodiumBlock = (x, y, width, height, fillTop, fillFace) => {
      roundedRect(x, y, width, height, 26);
      context.fillStyle = fillFace;
      context.fill();

      roundedRect(x, y, width, 24, 18);
      context.fillStyle = fillTop;
      context.fill();
    };

    const drawWinnerCard = (person, x, podiumY, podiumHeight) => {
      const avatarY = podiumY - 96;
      const radius = person.rank === 1 ? 68 : 58;

      if (person.rank === 1) {
        drawCrown(x, avatarY - radius - 10);
      }

      drawAvatar(x, avatarY, radius, person);
      drawBadge(x, podiumY + podiumHeight - 42, "#" + person.rank, person.accent);

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
    };

    const drawAwardsScene = (scene) => {
      const background = context.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      background.addColorStop(0, "#0b1020");
      background.addColorStop(0.5, "#12192d");
      background.addColorStop(1, "#20172b");
      context.fillStyle = background;
      context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      drawGlow(220, 120, 220, "rgba(75, 168, 255, 0.14)");
      drawGlow(980, 140, 240, "rgba(255, 125, 164, 0.12)");
      drawGlow(620, 310, 300, "rgba(246, 198, 103, 0.1)");
      drawStars();

      context.fillStyle = "rgba(255, 255, 255, 0.06)";
      roundedRect(72, 62, 240, 44, 22);
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
      roundedRect(60, 700, 960, 300, 42);
      context.fill();

      const blocks = [
        { x: 120, y: 650, width: 250, height: 220, top: "#3d5878", face: "#27354f", winner: scene.winners[1] },
        { x: 400, y: 560, width: 280, height: 320, top: "#8d6b24", face: "#5f4314", winner: scene.winners[0] },
        { x: 710, y: 680, width: 250, height: 190, top: "#65508a", face: "#3c3157", winner: scene.winners[2] },
      ];

      for (const block of blocks) {
        drawPodiumBlock(block.x, block.y, block.width, block.height, block.top, block.face);
        drawWinnerCard(block.winner, block.x + block.width / 2, block.y, block.height);
      }
    };

    drawAwardsScene(sceneData);
    return canvas.toDataURL("image/png").replace(/^data:image\\/png;base64,/, "");
  }`;
}
