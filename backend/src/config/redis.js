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

  // Driver H3 availability index (matching) — no TTL, actively maintained on
  // go_online/go_offline/location_update/disconnect/accept, not time-based
  driverHexIndex: (resolution, cell) => `driver:hex:${resolution}:${cell}`, // SET of available driverIds
  driverHexCurrent: (driverId) => `driver:hex:current:${driverId}`,     // {resolution,cell,updatedAt} JSON
  driverHexResolutions: 'driver:hex:resolutions',                 // SET of resolutions in use

  // Per-driver distributed offer lock — prevents a driver being offered two
  // concurrent rides. TTL = ring accept-timeout window.
  driverOfferLock: (driverId) => `driver:lock:${driverId}`,       // value = rideId holding the lock

  // Acceptance-rate cache (derived from ride_offers, not a separate counter)
  driverAcceptanceRate: (driverId) => `driver:acceptrate:${driverId}`, // TTL 300s

  // Matching weights config cache
  matchingWeights: 'matching:weights:active',              // TTL 300s

  // GPS ping buffer — batch-flushed to Postgres by a BullMQ worker
  gpsPingBuffer: (rideId) => `ride:gps:buffer:${rideId}`,          // Redis LIST, no TTL (drained then deleted)
  gpsActiveRides: 'ride:gps:active',                       // SET of rideIds currently buffering pings — periodic worker's scan list

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
