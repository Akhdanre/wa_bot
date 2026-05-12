import { CANVAS_SIZE } from "./constants";
import { drawAwardsScene } from "../components/awardsScene";
import type { ExportImageFormat } from "../types/exportImage";
import type { AwardsSceneData } from "../types/leaderboard";

type ExportOptions = {
  fileName?: string;
  format?: ExportImageFormat;
  quality?: number;
  scene?: AwardsSceneData;
};

function resolveMimeType(format: ExportImageFormat) {
  if (format === "jpg" || format === "jpeg") {
    return "image/jpeg";
  }

  return "image/png";
}

function resolveExtension(format: ExportImageFormat) {
  if (format === "jpeg") {
    return "jpg";
  }

  return format;
}

export async function exportAwardsBlob(options: ExportOptions = {}) {
  const { format = "png", quality = 0.92 } = options;
  const scene = options.scene;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas export is not supported");
  }

  if (!scene) {
    throw new Error("Canvas export scene is required");
  }

  drawAwardsScene(context, scene);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }

        resolve(blob);
      },
      resolveMimeType(format),
      quality,
    );
  });
}

export async function exportAwardsDataUrl(options: ExportOptions = {}) {
  const blob = await exportAwardsBlob(options);

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read exported image"));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read exported image"));
    };

    reader.readAsDataURL(blob);
  });
}

export async function downloadAwardsImage(options: ExportOptions = {}) {
  const { fileName = "hall-of-fame", format = "png" } = options;
  const blob = await exportAwardsBlob({ ...options, format });
  const extension = resolveExtension(format);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = `${fileName}.${extension}`;
  link.click();

  URL.revokeObjectURL(objectUrl);
}
