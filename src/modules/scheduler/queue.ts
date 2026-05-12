const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processQueue<T>(items: T[], handler: (item: T) => Promise<void>, delayMs = 10000) {
    for (let i = 0; i < items.length; i++) {
        await handler(items[i]);
        if (i < items.length - 1) await delay(delayMs);
    }
}
