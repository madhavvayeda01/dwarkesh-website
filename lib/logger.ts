type LogMeta = Record<string, unknown>;

function toJson(meta?: LogMeta) {
  if (!meta) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    console.info(`[INFO] ${event}${toJson(meta)}`);
  },
  warn(event: string, meta?: LogMeta) {
    console.warn(`[WARN] ${event}${toJson(meta)}`);
  },
  error(event: string, meta?: LogMeta) {
    console.error(`[ERROR] ${event}${toJson(meta)}`);
  },
};
