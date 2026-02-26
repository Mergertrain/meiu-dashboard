import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/meiu_dashboard",
  redisUrl: process.env.REDIS_URL ?? "",
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",")
};
