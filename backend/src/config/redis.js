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
  otpAttempts: (phone) => `otp:attempts:${phone}`,      // TTL 900s — wrong-verify counter
  otpLock: (phone) => `otp:lock:${phone}`,          // TTL 900s — set after max attempts
  otpResendCooldown: (phone) => `otp:resend:${phone}`,      // TTL 30s
  otpSendCount: (phone) => `otp:sendcount:${phone}`,     // TTL 3600s — hourly send cap
  emailCode: (email) => `emailcode:${email}`,         // TTL 600s
  refreshToken: (id, deviceId = 'default') => `refresh:${id}:${deviceId}`, // TTL 30d, device-scoped

  // Cache
  fareCache: (key) => `fare:${key}`,                // TTL 120s

  // Hex-zone reverse index (H3 geofencing) — no TTL, rebuilt on zone write, not time-based
  hexZoneIndex: (resolution, cell) => `hexzone:${resolution}:${cell}`, // SET of zoneIds
  hexZoneResolutions: 'hexzone:resolutions',            // SET of resolutions currently in use
  hexZoneCells: (zoneId) => `hexzone:cells:${zoneId}`,      // SET of "res:cell" — this zone's own cached cells, for diffing on rebuild

  // Pub/Sub channels
  CHAN: {
    rideAccepted: (rideId) => `chan:ride:accepted:${rideId}`,
    rideProgress: (rideId) => `chan:ride:progress:${rideId}`,
  },
};
