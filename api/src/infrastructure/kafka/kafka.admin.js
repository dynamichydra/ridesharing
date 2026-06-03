const kafka = require("./kafka.client");

class KafkaAdmin {
    constructor() {
        this.admin = kafka.admin();
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) return;
        await this.admin.connect();
        this.isConnected = true;
    }

    async disconnect() {
        if (!this.isConnected) return;
        await this.admin.disconnect();
        this.isConnected = false;
    }

    async ensureTopics(topicNames) {
        const uniqueTopics = [...new Set(topicNames)].filter(Boolean);
        if (uniqueTopics.length === 0) return;

        await this.connect();
        await this.admin.createTopics({
            waitForLeaders: true,
            topics: uniqueTopics.map(topic => ({
                topic,
                numPartitions: 1,
                replicationFactor: 1
            }))
        });
    }
}

module.exports = new KafkaAdmin();
