const { Kafka, logLevel } = require("kafkajs");

/**
 * Custom logger for KafkaJS to integrate with Fastify/Pino (or simply standard structured console out)
 */
const customLogger = () => ({ namespace, level, label, log }) => {
    const { message, ...extra } = log;
    if (level === logLevel.ERROR || level === logLevel.WARN) {
        console.error(`[Kafka:${label}] ${message}`, extra);
    } else {
        console.log(`[Kafka:${label}] ${message}`, extra);
    }
};

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");

const kafka = new Kafka({
    clientId: "uber-backend",
    brokers: brokers,
    logLevel: logLevel.INFO,
    logCreator: customLogger
});

module.exports = kafka;
