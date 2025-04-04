import redisClient from "../config/cache";

export class CacheController {
    static async setCache(key: string, value: any, ttl?: number) {
        if(ttl) {
            await redisClient.set(key, value, 'EX', ttl);
        } else {
            await redisClient.set(key, value);
        }
    }
    static async setCacheWithTimeRange(key: string, value: any, endHour: number, endMinute: number) {
        const now = new Date();
        const targetDate = new Date(now);
        
        // Set target date to the end time (when cache should expire)
        targetDate.setHours(endHour, endMinute, 0, 0);
        
        // If the target time is earlier than current time, move to next day
        if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        
        // Calculate TTL in seconds
        const ttlSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
        
        await redisClient.set(key, value, 'EX', ttlSeconds);
    }
    static async getCache(key: string) {
        return await redisClient.get(key);
    }
    static async deleteCache(key: string) {
        await redisClient.del(key);
    }
    static async clearCache() {
        await redisClient.flushall();
    }
}
