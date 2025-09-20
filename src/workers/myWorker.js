import { Worker } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};

const queueName = process.env.BULLMQ_QUEUE_NAME;

export const worker = new Worker(queueName, async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}`, job.data);
  return { processedAt: new Date().toISOString() };
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job completed`, job.id);
});

worker.on('failed', (job, err) => {
  console.error(`Job failed`, job?.id, err);
});
