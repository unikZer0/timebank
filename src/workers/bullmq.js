import { Queue, Worker } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

export const bullConnection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};

export const myQueue = new Queue(process.env.BULLMQ_QUEUE_NAME, {
  connection: bullConnection,
});
