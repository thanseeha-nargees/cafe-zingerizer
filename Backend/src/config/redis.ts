import "dotenv/config";
import { createClient, type RedisClientType } from "redis";

// ── Redis is optional — app runs without it ────────────────────────
const REDIS_URL = process.env.REDIS_URL;

let redisClient: RedisClientType | null = null;

if (!REDIS_URL) {
    console.warn(
        "[Redis] REDIS_URL is not set — running without Redis. " +
        "Food-ready scheduling and other Redis features will be disabled."
    );
} else {
    const MAX_RETRIES = 5;

    redisClient = createClient({
        url: REDIS_URL,
        socket: {
            reconnectStrategy(retries) {
                if (retries >= MAX_RETRIES) {
                    console.error(
                        `[Redis] Max reconnect attempts (${MAX_RETRIES}) reached — giving up.`
                    );
                    return new Error("Redis max reconnect attempts reached");
                }
                const delay = Math.min(2 ** retries * 100, 5000);
                console.warn(
                    `[Redis] Reconnect attempt ${retries + 1}/${MAX_RETRIES} in ${delay}ms…`
                );
                return delay;
            },
        },
    });

    let lastErrorLogged = 0;
    redisClient.on("error", (err) => {
        const now = Date.now();
        if (now - lastErrorLogged > 30_000) {
            console.error("[Redis] Connection error:", err.message);
            lastErrorLogged = now;
        }
    });

    redisClient.on("connect", () => {
        console.log("[Redis] Connected successfully");
    });

    // Connect (non-crashing)
    (async () => {
        try {
            await redisClient!.connect();
            console.log("[Redis] Connected to Redis Cloud");
        } catch (err) {
            console.error(
                "[Redis] Failed to connect on startup:",
                err instanceof Error ? err.message : err
            );
        }
    })();
}

export default redisClient;