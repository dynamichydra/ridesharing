const kafka = require("./kafka.client");
const producer = require("./kafka.producer");

/**
 * Robust Consumer wrapper that provides:
 * 1. Idempotency (via Redis)
 * 2. Local Retries
 * 3. Dead Letter Queue (DLQ) publishing
 */
class KafkaConsumer {
    constructor(groupId, redisClient) {
        this.consumer = kafka.consumer({ groupId });
        this.redis = redisClient;
        this.handlers = new Map();
        this.isConnected = false;
    }

    /**
     * Register an event handler for a specific topic.
     * @param {string} topic 
     * @param {function} handlerFn - async function(payload, envelope)
     */
    registerHandler(topic, handlerFn) {
        this.handlers.set(topic, handlerFn);
    }

    async connect() {
        if (this.isConnected) return;
        await this.consumer.connect();
        
        for (const topic of this.handlers.keys()) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
        }
        
        this.isConnected = true;
        console.log(`[KafkaConsumer] Connected and subscribed to ${this.handlers.size} topics.`);
    }

    async start() {
        await this.connect();

        await this.consumer.run({
            autoCommit: true,
            eachMessage: async ({ topic, partition, message }) => {
                const rawValue = message.value.toString();
                let envelope;
                
                try {
                    envelope = JSON.parse(rawValue);
                } catch (err) {
                    console.error(`[KafkaConsumer] Failed to parse message on topic ${topic}`, err);
                    return; // Drop corrupted messages
                }

                const { eventId, data } = envelope;
                
                // 1. Idempotency Check
                const idempotencyKey = `kafka:processed:${eventId}`;
                if (this.redis) {
                    const alreadyProcessed = await this.redis.get(idempotencyKey);
                    if (alreadyProcessed) {
                        console.log(`[KafkaConsumer] Skipping duplicate event ${eventId}`);
                        return; // Already processed
                    }
                }

                const handler = this.handlers.set(topic, this.handlers.get(topic));
                if (!handler) return;

                // 2. Retry Logic
                let attempts = 0;
                const maxRetries = 3;
                let success = false;

                while (attempts < maxRetries && !success) {
                    try {
                        attempts++;
                        await this.handlers.get(topic)(data, envelope);
                        success = true;
                    } catch (error) {
                        console.error(`[KafkaConsumer] Attempt ${attempts} failed for ${eventId} on ${topic}:`, error.message);
                        if (attempts >= maxRetries) {
                            // 3. Dead Letter Queue (DLQ)
                            console.warn(`[KafkaConsumer] Max retries reached. Moving to DLQ: ${topic}.dlq`);
                            try {
                                await producer.publish(`${topic}.dlq`, {
                                    originalPayload: envelope,
                                    error: error.message
                                });
                            } catch (dlqError) {
                                console.error(`[KafkaConsumer] CRITICAL: Failed to publish to DLQ`, dlqError);
                            }
                        } else {
                            // Exponential backoff
                            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempts)));
                        }
                    }
                }

                // 4. Mark as processed in Redis (24h TTL)
                if (success && this.redis) {
                    await this.redis.set(idempotencyKey, "1", "EX", 60 * 60 * 24);
                }
            }
        });
    }

    async disconnect() {
        if (!this.isConnected) return;
        await this.consumer.disconnect();
        this.isConnected = false;
        console.log("[KafkaConsumer] Disconnected.");
    }
}

module.exports = KafkaConsumer;
