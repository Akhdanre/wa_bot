import * as fs from "fs";
import * as path from "path";

export class QuotesModel {
  private quotes: string[] = [];

  constructor() {
    this.loadQuotes();
  }

  private loadQuotes(): void {
    const quotesPath = path.join(process.cwd(), "src", "quotes.json");

    try {
      if (fs.existsSync(quotesPath)) {
        const raw = fs.readFileSync(quotesPath, "utf-8");
        const parsed = JSON.parse(raw);

        if (
          Array.isArray(parsed) &&
          parsed.every((q) => typeof q === "string")
        ) {
          this.quotes = parsed;
          console.log(`✓ Loaded ${this.quotes.length} quotes`);
        } else {
          console.warn(
            '⚠ quotes.json must be an array of strings. Example: ["Quote - Author", ...]'
          );
        }
      } else {
        console.warn("⚠ Quotes file not found:", quotesPath);
      }
    } catch (err) {
      console.error("✗ Error loading quotes:", err);
    }
  }

  getRandomQuote(): string {
    if (!this.quotes.length) return "";
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    return this.quotes[randomIndex]?.trim() || "";
  }

  getAllQuotes(): string[] {
    return this.quotes;
  }

  getQuotesCount(): number {
    return this.quotes.length;
  }
}
