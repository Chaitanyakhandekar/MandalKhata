import { redis } from "../redis/config.js";
import mongoose from "mongoose";

const CACHE_TTL = 300;

const safeRedis = {
    async get(key) {
        try { return await redis.get(key); } catch { return null; }
    },
    async setex(key, ttl, value) {
        try { await redis.setex(key, ttl, value); } catch {}
    },
    async del(...keys) {
        try { await redis.del(...keys); } catch {}
    },
    async keys(pattern) {
        try { return await redis.keys(pattern); } catch { return []; }
    }
};

export const cacheService = {
    async getEventsByCity(city) {
        const cached = await safeRedis.get(`events:city:${city}`);
        return cached ? JSON.parse(cached) : null;
    },

    async setEventsByCity(city, events) {
        await safeRedis.setex(`events:city:${city}`, CACHE_TTL, JSON.stringify(events));
    },

    async getNearbyEvents(lat, lng, radiusKm) {
        const cached = await safeRedis.get(`events:geo:${lat}:${lng}:${radiusKm}`);
        return cached ? JSON.parse(cached) : null;
    },

    async setNearbyEvents(lat, lng, radiusKm, events) {
        await safeRedis.setex(`events:geo:${lat}:${lng}:${radiusKm}`, CACHE_TTL, JSON.stringify(events));
    },

    async getEventById(eventId) {
        const cached = await safeRedis.get(`event:${eventId}`);
        return cached ? JSON.parse(cached) : null;
    },

    async setEventById(eventId, event) {
        await safeRedis.setex(`event:${eventId}`, CACHE_TTL, JSON.stringify(event));
    },

    async invalidateEventCache(eventId) {
        const keys = await safeRedis.keys("events:*");
        if (keys.length) {
            await safeRedis.del(...keys);
        }
        await safeRedis.del(`event:${eventId}`);
    },

    async invalidateAllEventsCache() {
        const keys = await safeRedis.keys("events:*");
        if (keys.length) {
            await safeRedis.del(...keys);
        }
    }
};