const { v4: uuidv4 } = require("uuid");
const kafka = require("./kafka.client");

class KafkaProducer {
    constructor() {
        this.producer = kafka.producer();
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) return;
        try {
            await this.producer.connect();
            this.isConnected = true;
            console.log("[KafkaProducer] Connected successfully.");
        } catch (error) {
            console.error("[KafkaProducer] Failed to connect:", error);
            throw error;
        }
    }

    async disconnect() {
        if (!this.isConnected) return;
        await this.producer.disconnect();
        this.isConnected = false;
        console.log("[KafkaProducer] Disconnected.");
    }

    /**
     * Publishes an event to Kafka wrapped in a standard metadata envelope.
     * @param {string} topic - The target topic
     * @param {object} payload - The event data
     * @param {string} key - Optional routing key (e.g., tripId or driverId) to ensure order
     */
    async publish(topic, payload, key = null) {
        if (!this.isConnected) {
            console.warn("[KafkaProducer] Not connected, attempting to connect before publishing...");
            await this.connect();
        }

        const envelope = {
            eventId: uuidv4(),
            version: "v1",
            timestamp: new Date().toISOString(),
            data: payload
        };

        const message = {
            value: JSON.stringify(envelope)
        };

        if (key) {
            message.key = String(key);
        }

        try {
            await this.producer.send({
                topic,
                messages: [message],
                // Require all brokers to acknowledge for durability
                acks: -1 
            });
            console.log(`[KafkaProducer] Published to ${topic}`, { eventId: envelope.eventId });
        } catch (error) {
            console.error(`[KafkaProducer] Failed to publish to ${topic}:`, error);
            // In a production system, you might save failed publishes to a local DB outbox table here
            throw error; 
        }
    }
}

// Export a singleton instance
module.exports = new KafkaProducer();
