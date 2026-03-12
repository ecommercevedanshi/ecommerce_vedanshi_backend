import { Partitioners } from "kafkajs";
import kafka from "./kafka.js";

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});
export const connectToProducer = async () => {
  try {
    await producer.connect();
    console.log("Kafka producer connected successfully");
  } catch (err) {
    console.error("Error connecting to Kafka producer:", err);
  }
};

export const publishEvent = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (err) {
    console.error("Error publishing event to Kafka:", err);
  }
};

export const createTopics = async (topics) => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: topics.map((topic) => ({
        topic,
        numPartitions: 1,
      })),
    });
    console.log("Kafka topics created successfully");
  } catch (err) {
    console.error("Error creating Kafka topics:", err);
  }
};
