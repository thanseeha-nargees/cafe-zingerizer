import "dotenv/config";
import { createClient } from "redis";

// ── Validate REDIS_URL at startup ──────────────────────────────────
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
    throw new Error(
        "REDIS_URL environment variable is not set. " +
        "Set it in your Render dashboard (e.g. redis://red-xxxxx:6379) " +
        "or in your local .env file."
    );
}

const MAX_RETRIES = 5;

const redisClient = createClient({
    url: REDIS_URL,
    socket: {
        // Exponential back-off: 2^attempt × 100 ms, capped at 5 retries
        reconnectStrategy(retries) {
            if (retries >= MAX_RETRIES) {
                console.error(
                    `[Redis] Max reconnect attempts (${MAX_RETRIES}) reached — giving up.`
                );
                // Returning an Error stops further retries
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

// ── Error handler (deduplicated) ───────────────────────────────────
let lastErrorLogged = 0;
redisClient.on("error", (err) => {
    const now = Date.now();
    // Log at most once every 30 seconds to avoid spamming
    if (now - lastErrorLogged > 30_000) {
        console.error("[Redis] Connection error:", err.message);
        lastErrorLogged = now;
    }
});

redisClient.on("connect", () => {
    console.log("[Redis] Connected successfully");
});

redisClient.on("reconnecting", () => {
    console.log("[Redis] Reconnecting…");
});

// ── Connect (non-crashing) ─────────────────────────────────────────
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log("[Redis] Connected to Redis Cloud");
        }
    } catch (err) {
        console.error(
            "[Redis] Failed to connect on startup:",
            err instanceof Error ? err.message : err
        );
        // The server continues running; Redis-dependent features will
        // fail gracefully until the connection is re-established.
    }
};

connectRedis();

export default redisClient