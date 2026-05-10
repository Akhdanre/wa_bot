export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getTimestamp = (): string => {
  return new Date().toLocaleTimeString();
};

export const log = (level: "INFO" | "DEBUG" | "WARN" | "ERROR", msg: string) => {
  const timestamp = getTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(`${prefix} ${msg}`);
};

export const logInfo = (msg: string) => log("INFO", msg);
export const logDebug = (msg: string) => log("DEBUG", msg);
export const logWarn = (msg: string) => log("WARN", msg);
export const logError = (msg: string) => log("ERROR", msg);
