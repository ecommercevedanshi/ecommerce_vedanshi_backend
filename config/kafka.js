import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "kafkaa",
  brokers: ["localhost:9092"],
});

export default kafka;
