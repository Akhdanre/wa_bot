import { readFileSync } from "fs";
import { join } from "path";

const assetsDir = join(__dirname, "../../assets/profanity");

function loadWords(file: string): string[] {
    const content = readFileSync(join(assetsDir, file), "utf-8");
    return content.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean);
}

const badWords = [...loadWords("id.txt"), ...loadWords("en.txt")];

export function countBadWords(text: string): number {
    const lower = text.toLowerCase();
    return badWords.reduce((count, word) => count + (lower.split(word).length - 1), 0);
}
