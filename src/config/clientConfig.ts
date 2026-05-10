import { ClientOptions } from "whatsapp-web.js";

export const createClientConfig = (): ClientOptions => {
  return {
    authStrategy: require("whatsapp-web.js").LocalAuth,
    puppeteer: {
      headless: true,
      timeout: 0,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-breakpad",
        "--disable-client-side-phishing-detection",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-service-autorun",
        "--safebrowsing-disable-auto-update",
        "--enable-automation",
        "--disable-device-discovery-notifications",
      ],
    },
  };
};

export const AUTH_DATA_PATH = "./.wwebjs_auth";
export const QR_CODE_TIMEOUT = 60000; // 60 seconds
export const INIT_RETRY_ATTEMPTS = 3;
export const INIT_RETRY_DELAY = 5000; // 5 seconds
