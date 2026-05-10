const THRESHOLDS = [0, 500, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];

export function getLevel(totalText: number): number {
    let level = 1;
    for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalText >= THRESHOLDS[i]) {
            level = i + 1;
            break;
        }
    }
    return level;
}

export function getProgress(totalText: number): { current: number; next: number; percentage: number } {
    const level = getLevel(totalText);
    const current = THRESHOLDS[level - 1];
    const next = THRESHOLDS[level] || current;
    const percentage = level >= THRESHOLDS.length ? 100 : Math.floor(((totalText - current) / (next - current)) * 100);
    return { current, next, percentage };
}

export function generateLevelCard(name: string, totalText: number): string {
    const level = getLevel(totalText);
    const { percentage, next } = getProgress(totalText);
    const barLength = 20;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);

    return [
        `══════════════════════════`,
        `  🏅 LEVEL CARD`,
        `══════════════════════════`,
        `  👤 ${name}`,
        `  ⭐ Level ${level}`,
        `  📝 ${totalText} / ${next}`,
        `  [${bar}] ${percentage}%`,
        `══════════════════════════`,
    ].join("\n");
}
