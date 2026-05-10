import qrcode from "qrcode-terminal";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import * as fs from "fs";
import * as path from "path";

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  },
});

// Load quotes from JSON file (expects: ["...", "...", ...])
const quotesPath = path.join(process.cwd(), "src", "quotes.json");
let quotes: string[] = [];

try {
  if (fs.existsSync(quotesPath)) {
    const raw = fs.readFileSync(quotesPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) {
      quotes = parsed;
      console.log(`Loaded ${quotes.length} quotes.`);
    } else {
      console.warn(
        'quotes.json must be an array of strings. Example: ["Quote - Author", ...]'
      );
    }
  } else {
    console.warn("Quotes file not found:", quotesPath);
  }
} catch (err) {
  console.error("Error loading quotes:", err);
}

client.on("qr", (qr: string) => {
  console.log("Scan the QR code below to log in:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("Authenticated successfully.");
});

client.on("auth_failure", (msg) => {
  console.error("Authentication failure:", msg);
});

client.on("ready", () => {
  console.log("WhatsApp client is ready.");
});

client.on("disconnected", (reason) => {
  console.warn("Client was logged out:", reason);
});

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const getRandomQuoteSuffix = (): string => {
  if (!quotes.length) return "";
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const q = quotes[randomIndex]?.trim();
  if (!q) return "";
  // format: newline + italic quote
  return `\n\n_${q}_`;
};

const replyWithQuote = async (message: Message, replyText: string) => {
  const quoteSuffix = getRandomQuoteSuffix();
  const finalText = replyText + quoteSuffix;

  try {
    const chat = await message.getChat();
    await chat.sendStateTyping();
    await delay(2000);
    await chat.clearState();
  } catch {
    // ignore typing-state failures
  }

  await message.reply(finalText);
};

client.on("message", async (message: Message) => {
  const text = (message.body || "").trim();
  const lower = text.toLowerCase();

  if (lower === "akrida") {
    await replyWithQuote(message, "iya");
    return;
  }

  if (lower.startsWith("!eco ")) {
    const echo = text.slice("!echo ".length);
    await replyWithQuote(message, echo);
    return;
  }
});

client.initialize();
