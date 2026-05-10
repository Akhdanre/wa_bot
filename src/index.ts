import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { QuotesModel } from "./models/QuotesModel";
import { MessageController } from "./controllers/MessageController";
import { createClientConfig, AUTH_DATA_PATH, INIT_RETRY_ATTEMPTS, INIT_RETRY_DELAY } from "./config/clientConfig";
import { logInfo, logError, logDebug } from "./utils/helpers";

// Initialize models
const quotesModel = new QuotesModel();
const messageController = new MessageController(quotesModel);

// Create client with config
const { LocalAuth: LocalAuthClass } = require("whatsapp-web.js");
const client = new Client({
  authStrategy: new LocalAuthClass({ dataPath: AUTH_DATA_PATH }),
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
});

// Event handlers
client.on("qr", (qr: string) => {
  logInfo("Scan the QR code below to log in:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  logInfo("✓ Authenticated successfully");
});

client.on("auth_failure", (msg) => {
  logError(`Authentication failure: ${msg}`);
});

client.on("ready", () => {
  logInfo("✓ WhatsApp client is ready");
});

client.on("disconnected", (reason) => {
  logInfo(`⚠ Client disconnected: ${reason}`);
  logInfo("Attempting to reinitialize in 3 seconds...");
  setTimeout(() => {
    client.initialize().catch((err) => {
      logError(`Reinitialization failed: ${err}`);
    });
  }, 3000);
});

// Message handler
client.on("message", (message: Message) => {
  messageController.handleMessage(message);
});

// Initialize with retry logic
const initializeWithRetry = async (maxRetries = INIT_RETRY_ATTEMPTS, delayMs = INIT_RETRY_DELAY) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`Initialization attempt ${attempt}/${maxRetries}...`);
      await client.initialize();
      logInfo("✓ Client initialized successfully!");
      return;
    } catch (err) {
      logError(`Attempt ${attempt} failed: ${(err as Error).message}`);
      if (attempt < maxRetries) {
        logInfo(`Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logError("Max retries reached. Exiting.");
        process.exit(1);
      }
    }
  }
};

initializeWithRetry();

// Global error handlers
process.on("unhandledRejection", (reason) => {
  logError(`Unhandled Rejection: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logError(`Uncaught Exception: ${err}`);
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
