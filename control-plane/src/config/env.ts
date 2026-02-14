import { z } from "zod";

export const EnvSchema = z.object({
  PROM_URL: z.string().url(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

type ParsedEnv = z.infer<typeof EnvSchema>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function loadConfig(env: Record<string, string | undefined>) {
  const parsed: ParsedEnv = EnvSchema.parse(env);

  return {
    prometheus: {
      url: parsed.PROM_URL,
    },
    logging: {
      level: parsed.LOG_LEVEL,
    },
    runtime: {
      env: parsed.NODE_ENV,
      isProduction: parsed.NODE_ENV === "production",
      isDevelopment: parsed.NODE_ENV === "development",
      isTest: parsed.NODE_ENV === "test",
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
