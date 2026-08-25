import { eq, and, desc, asc, ne, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rideChatMessages, rides } from '../../../drizzle/schema/index.js';
import { getSocketIO } from '../../kafka/consumers/index.js';

/**
 * Send an in-trip chat message between driver and rider.
 */
export async function sendMessage({ rideId, senderId, senderRole, content, messageType = 'text' }) {
  if (!content || !content.trim()) {
    throw { statusCode: 400, message: 'Message content cannot be empty' };
  }

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  // Validate authorization
  if (senderRole === 'rider' && ride.riderId !== senderId) {
    throw { statusCode: 403, message: 'Unauthorized: Not your ride' };
  }
  if (senderRole === 'driver' && ride.driverId !== senderId) {
    throw { statusCode: 403, message: 'Unauthorized: You are not the driver of this ride' };
  }

  // Active status check: chat is allowed during accepted, arriving, arrived, started
  const allowedStatuses = ['accepted', 'arriving', 'arrived', 'started'];
  if (!allowedStatuses.includes(ride.status) && senderRole !== 'system') {
    throw { statusCode: 400, message: `Cannot send messages for ride in status '${ride.status}'` };
  }

  const [message] = await db.insert(rideChatMessages).values({
    rideId,
    senderId,
    senderRole,
    messageType,
    content: content.trim(),
  }).returning();

  // Broadcast via Socket.IO
  const io = getSocketIO();
  if (io) {
    // Broadcast to room
    io.of('/rider').to(`ride:${rideId}`).emit('chat:message', message);
    io.of('/driver').to(`ride:${rideId}`).emit('chat:message', message);

    // Also notify direct rooms
    if (senderRole === 'rider' && ride.driverId) {
      io.of('/driver').to(`driver:${ride.driverId}`).emit('chat:message', message);
    } else if (senderRole === 'driver') {
      io.of('/rider').to(`rider:${ride.riderId}`).emit('chat:message', message);
    }
  }

  return message;
}

/**
 * Retrieve chat history for a ride.
 */
export async function getRideMessages(rideId, userId, userRole) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (userRole === 'rider' && ride.riderId !== userId) {
    throw { statusCode: 403, message: 'Unauthorized' };
  }
  if (userRole === 'driver' && ride.driverId !== userId) {
    throw { statusCode: 403, message: 'Unauthorized' };
  }

  const messages = await db.select()
    .from(rideChatMessages)
    .where(eq(rideChatMessages.rideId, rideId))
    .orderBy(asc(rideChatMessages.createdAt));

  return messages;
}

/**
 * Mark unread messages as read.
 */
export async function markMessagesAsRead(rideId, readerId, readerRole) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  await db.update(rideChatMessages)
    .set({ readAt: new Date() })
    .where(and(
      eq(rideChatMessages.rideId, rideId),
      ne(rideChatMessages.senderRole, readerRole),
      isNull(rideChatMessages.readAt),
    ));

  return { success: true };
}
