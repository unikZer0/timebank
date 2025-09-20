import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

export const myQueue = new Queue(process.env.BULLMQ_QUEUE_NAME, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
});
