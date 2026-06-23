import 'dotenv/config';
import { kafka, TOPICS } from '../config/kafka.js';

const admin = kafka.admin();

async function createTopics() {
  await admin.connect();
  const topicList = Object.values(TOPICS).map((topic) => ({
    topic,
    numPartitions: 3,
    replicationFactor: 1,
    configEntries: [
      { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
      { name: 'cleanup.policy', value: 'delete' },
    ],
  }));

  const created = await admin.createTopics({ topics: topicList, waitForLeaders: true });
  console.log(created ? '✅ Kafka topics created' : '⚠️  Topics already exist');
  await admin.disconnect();
}

createTopics().catch((err) => { console.error(err); process.exit(1); });
