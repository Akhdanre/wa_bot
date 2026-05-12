import { CANVAS_SIZE } from "../canvas/constants";
import type { AwardsSceneData } from "../types/leaderboard";
import { drawAwardsScene } from "./awardsScene";

export function createAwardsCanvas(
  canvas: HTMLCanvasElement,
  scene: AwardsSceneData,
) {
  const contextValue = canvas.getContext("2d");

  if (!contextValue) {
    throw new Error("Canvas not supported");
  }

  const context = contextValue;

  function resizeCanvas() {
    const parentWidth = canvas.parentElement?.clientWidth ?? CANVAS_SIZE;
    const cssWidth = Math.min(parentWidth, CANVAS_SIZE);
    const cssHeight = cssWidth;
    const dpr = window.devicePixelRatio || 1;
    const scale = dpr * (cssWidth / CANVAS_SIZE);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    context.setTransform(scale, 0, 0, scale, 0, 0);
    drawAwardsScene(context, scene);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}
