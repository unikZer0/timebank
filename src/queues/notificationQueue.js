import { Queue } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};

export const notificationQueue = new Queue('notifications', { connection });

export const NOTIFICATION_JOB_TYPES = {
  NEW_USER_REGISTRATION: 'new_user_registration',
  USER_VERIFICATION_APPROVED: 'user_verification_approved',
  USER_VERIFICATION_REJECTED: 'user_verification_rejected',
  JOB_APPLICATION_STATUS_UPDATE: 'job_application_status_update',
  JOB_COMPLETION_REWARD: 'job_completion_reward'
};
export const addNotificationJob = async (jobType, data, options = {}) => {
  try {
    const job = await notificationQueue.add(jobType, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
      ...options
    });
    
    console.log(`Added ${jobType} job to queue:`, job.id);
    return job;
  } catch (error) {
    console.error(`Error adding ${jobType} job to queue:`, error);
    throw error;
  }
};

export const notifyAdminsNewUser = async (userData) => {
  return addNotificationJob(NOTIFICATION_JOB_TYPES.NEW_USER_REGISTRATION, {
    user: userData,
    timestamp: new Date().toISOString()
  });
};

export const notifyUserVerification = async (userId, status, adminName, rejectionReason = null) => {
  return addNotificationJob(
    status === 'verified' ? NOTIFICATION_JOB_TYPES.USER_VERIFICATION_APPROVED : NOTIFICATION_JOB_TYPES.USER_VERIFICATION_REJECTED,
    {
      userId,
      status,
      adminName,
      rejectionReason,
      timestamp: new Date().toISOString()
    }
  );
};

export const notifyJobApplicationStatus = async (applicationId, status, userId, jobTitle) => {
  return addNotificationJob(NOTIFICATION_JOB_TYPES.JOB_APPLICATION_STATUS_UPDATE, {
    applicationId,
    status,
    userId,
    jobTitle,
    timestamp: new Date().toISOString()
  });
};

export const notifyJobCompletionReward = async (userId, hours, jobTitle) => {
  return addNotificationJob(NOTIFICATION_JOB_TYPES.JOB_COMPLETION_REWARD, {
    userId,
    hours,
    jobTitle,
    timestamp: new Date().toISOString()
  });
};
