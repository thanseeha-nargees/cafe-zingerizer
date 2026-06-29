import "dotenv/config";
import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL ,
})

redisClient.on("error", (err) => {
    console.log("redis connection error " , err)
})

redisClient.on("connect", () => {
    console.log("Redis connected successfully")
})


const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('connected to Redis Cloud');
    }
};

connectRedis();

export default redisClient