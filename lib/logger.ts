import pino from "pino";

const loggerOptions =
  process.env.NODE_ENV !== "production"
    ? {
        level: process.env.LOG_LEVEL ?? "info",
        transport: {
          target: "pino-pretty",
        },
      }
    : {
        level: process.env.LOG_LEVEL ?? "info",
      };

export const logger = pino(loggerOptions);
