import puppeteer from "puppeteer";
import { buildAwardsRendererScript } from "../canvas/canvas/pageRenderer";
import type { AwardsSceneData } from "../canvas/types/leaderboard";

type BrowserInstance = Awaited<ReturnType<typeof puppeteer.launch>>;
type AwardsPage = Awaited<ReturnType<BrowserInstance["newPage"]>>;

const renderSceneToBase64 = async (page: AwardsPage, scene: AwardsSceneData): Promise<string> => {
  return page.evaluate(`(${buildAwardsRendererScript()})(${JSON.stringify(scene)})`) as Promise<string>;
};

const createAwardsPage = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #0b1020;
          }
          canvas {
            display: block;
            width: 1080px;
            height: 1080px;
          }
        </style>
      </head>
      <body>
        <canvas id="awards" width="1080" height="1080"></canvas>
      </body>
    </html>
  `);
  return { browser, page };
};

export const renderAwardsPng = async (scene: AwardsSceneData) => {
  const { browser, page } = await createAwardsPage();

  try {
    const base64 = await renderSceneToBase64(page, scene);
    return Buffer.from(base64, "base64");
  } finally {
    await browser.close();
  }
};

export const renderAwardsPngBatch = async (scenes: AwardsSceneData[]) => {
  const { browser, page } = await createAwardsPage();

  try {
    const results: Buffer[] = [];

    for (const scene of scenes) {
      const base64 = await renderSceneToBase64(page, scene);
      results.push(Buffer.from(base64, "base64"));
    }

    return results;
  } finally {
    await browser.close();
  }
};
