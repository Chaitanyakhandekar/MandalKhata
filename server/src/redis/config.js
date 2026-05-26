import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config({ path: "./.env" });

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

export const redis = new Redis(redisConfig);

redis.on("error", (err) => {
  console.log("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.connect().catch(() => {
  console.log("Redis connection failed, caching disabled");
});

// await redis.set("check", "working");
// console.log(await redis.get("check"));
