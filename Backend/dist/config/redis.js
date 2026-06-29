"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL,
});
redisClient.on("error", (err) => {
    console.log("redis connection error ", err);
});
redisClient.on("connect", () => {
    console.log("Redis connected successfully");
});
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('connected to Redis Cloud');
    }
};
connectRedis();
exports.default = redisClient;
//# sourceMappingURL=redis.js.map