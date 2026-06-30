import Redis from 'ioredis';
import { env } from './env.js';

// Main client — commands
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Dedicated pub/sub clients — must NOT be used for regular commands
export const redisPub = new Redis(env.REDIS_URL, { lazyConnect: true });
export const redisSub = new Redis(env.REDIS_URL, { lazyConnect: true });

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

export const REDIS_KEYS = {
  // Driver
  driverLocation: (id) => `driver:loc:${id}`,          // TTL 30s  {lat,lng}
  driverRideActive: (id) => `driver:ride:${id}`,          // TTL 7200s {rideId, riderId}

  // Ride
  rideRequest: (id) => `ride:req:${id}`,             // TTL = ring window + 5s
  rideProgress: (id) => `ride:progress:${id}`,        // TTL 7200s live progress snapshot
  rideApproachRoute: (id) => `ride:approach:${id}`,        // TTL 3600s driver→pickup route

  // Auth
  otpCode: (phone) => `otp:${phone}`,               // TTL 300s
  refreshToken: (id) => `refresh:${id}`,              // TTL 30d

  // Cache
  fareCache: (key) => `fare:${key}`,                // TTL 120s

  // Pub/Sub channels
  CHAN: {
    rideAccepted: (rideId) => `chan:ride:accepted:${rideId}`,
    rideProgress: (rideId) => `chan:ride:progress:${rideId}`,
  },
};
