import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

export const REDIS_KEYS = {
  driverLocation: (id) => `driver:loc:${id}`,          // TTL 30s
  onlineDrivers: 'drivers:online',                // ZSET by lat/lng score
  rideRequest: (id) => `ride:req:${id}`,             // TTL 60s pending window
  otpCode: (ph) => `otp:${ph}`,                  // TTL 5min
  refreshToken: (id) => `refresh:${id}`,
  rateLimit: (ip) => `rl:${ip}`,
  fareCache: (key) => `fare:${key}`,                // TTL 2min
  driverRideActive: (id) => `driver:ride:${id}`,
};
