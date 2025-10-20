import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { 
  createNotification, 
  getAllAdmins 
} from '../db/queries/notifications.js';
import { sendMail } from '../utils/mailer.js';
import { NOTIFICATION_JOB_TYPES } from '../queues/notificationQueue.js';

dotenv.config();

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
};
export const notificationWorker = new Worker('notifications', async (job) => {
  console.log(`Processing notification job ${job.id} of type ${job.name}`);
  
  try {
    switch (job.name) {
      case NOTIFICATION_JOB_TYPES.NEW_USER_REGISTRATION:
        await handleNewUserRegistration(job.data);
        break;
        
      case NOTIFICATION_JOB_TYPES.USER_VERIFICATION_APPROVED:
        await handleUserVerificationApproved(job.data);
        break;
        
      case NOTIFICATION_JOB_TYPES.USER_VERIFICATION_REJECTED:
        await handleUserVerificationRejected(job.data);
        break;
        
      case NOTIFICATION_JOB_TYPES.JOB_APPLICATION_STATUS_UPDATE:
        await handleJobApplicationStatusUpdate(job.data);
        break;
        
      case NOTIFICATION_JOB_TYPES.JOB_COMPLETION_REWARD:
        await handleJobCompletionReward(job.data);
        break;
        
      default:
        console.warn(`Unknown job type: ${job.name}`);
    }
    
    console.log(`Successfully processed notification job ${job.id}`);
    return { success: true, processedAt: new Date().toISOString() };
    
  } catch (error) {
    console.error(`Error processing notification job ${job.id}:`, error);
    throw error; 
  }
}, { 
  connection,
  concurrency: 5 
});

const handleNewUserRegistration = async (data) => {
  const { user } = data;
  

  const admins = await getAllAdmins();
  
  for (const admin of admins) {

    await createNotification({
      user_id: admin.id,
      type: 'new_user_registration',
      title: 'New User Registration',
      message: `A new user ${user.first_name} ${user.last_name} has registered and is pending verification.`,
      data: {
        user_id: user.id,
        user_email: user.email,
        user_name: `${user.first_name} ${user.last_name}`,
        registration_date: user.created_at
      }
    });
    try {
      await sendMail({
        to: admin.email,
        subject: "New User Registration - TimeBank",
        template: "adminNewUser",
        context: {
          user_name: `${user.first_name} ${user.last_name}`,
          user_email: user.email,
          registration_date: new Date(user.created_at).toLocaleDateString(),
          admin_panel_url: `${ 'http://localhost:3002'}/admin/verification`,
          year: new Date().getFullYear()
        }
      });
      console.log(`Registration email sent to admin: ${admin.email}`);
    } catch (emailError) {
      console.error(`Failed to send email to admin ${admin.email}:`, emailError);
    }
  }
};

const handleUserVerificationApproved = async (data) => {
  const { userId, adminName } = data;
  await createNotification({
    user_id: userId,
    type: 'verification_status',
    title: 'Account Verified',
    message: `Your account has been verified by ${adminName}. You can now access all features of the platform.`,
    data: {
      status: 'verified',
      admin_name: adminName,
      processed_at: new Date().toISOString()
    }
  });
  
  try {
    const { findUserById } = await import('../db/queries/users.js');
    const user = await findUserById(userId);
    
    if (user) {
      await sendMail({
        to: user.email,
        subject: "Account Verified - TimeBank",
        template: "userVerification",
        context: {
          first_name: user.first_name,
          title: "Account Verified",
          isVerified: true,
          login_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`,
          year: new Date().getFullYear()
        }
      });
      console.log(`Verification email sent to user: ${user.email}`);
    }
  } catch (emailError) {
    console.error(`Failed to send verification email to user ${userId}:`, emailError);
  }
};

const handleUserVerificationRejected = async (data) => {
  const { userId, adminName, rejectionReason } = data;
  let message = `Your account verification was rejected by ${adminName}.`;
  if (rejectionReason) {
    message += ` Reason: ${rejectionReason}`;
  }
  message += ' Please contact support for more information.';
  
  await createNotification({
    user_id: userId,
    type: 'verification_status',
    title: 'Account Verification Rejected',
    message,
    data: {
      status: 'rejected',
      admin_name: adminName,
      rejection_reason: rejectionReason,
      processed_at: new Date().toISOString()
    }
  });

  try {
    const { findUserById } = await import('../db/queries/users.js');
    const user = await findUserById(userId);
    
    if (user) {
      await sendMail({
        to: user.email,
        subject: "Account Verification Rejected - TimeBank",
        template: "userRejection",
        context: {
          first_name: user.first_name,
          title: "Account Verification Rejected",
          rejection_reason: rejectionReason || "No specific reason provided",
          support_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/support`,
          year: new Date().getFullYear()
        }
      });
      console.log(`Rejection email sent to user: ${user.email}`);
    }
  } catch (emailError) {
    console.error(`Failed to send rejection email to user ${userId}:`, emailError);
  }
};

const handleJobApplicationStatusUpdate = async (data) => {
  const { applicationId, status, userId, jobTitle } = data;
  let title, message;
  
  switch (status) {
    case 'accepted':
      title = 'Job Application Accepted';
      message = `Your application for "${jobTitle}" has been accepted!`;
      break;
    case 'rejected':
      title = 'Job Application Rejected';
      message = `Your application for "${jobTitle}" was not selected.`;
      break;
    case 'complete':
      title = 'Job Completed';
      message = `Congratulations! You have successfully completed "${jobTitle}".`;
      break;
    default:
      title = 'Job Application Update';
      message = `Your application for "${jobTitle}" status has been updated to ${status}.`;
  }
  
  await createNotification({
    user_id: userId,
    type: 'job_application_status',
    title,
    message,
    data: {
      applicationId,
      status,
      jobTitle,
      processed_at: new Date().toISOString()
    }
  });
  
  console.log(`Job application status notification created for user ${userId}`);
};

const handleJobCompletionReward = async (data) => {
  const { userId, hours, jobTitle } = data;
  await createNotification({
    user_id: userId,
    type: 'job_completion_reward',
    title: 'Job Completion Reward',
    message: `You have received ${hours} hours for completing "${jobTitle}". Your wallet has been updated.`,
    data: {
      hours,
      jobTitle,
      processed_at: new Date().toISOString()
    }
  });
  
  console.log(`Job completion reward notification created for user ${userId}`);
};

notificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});

notificationWorker.on('error', (err) => {
  console.error('Notification worker error:', err);
});

console.log('Notification worker started and listening for jobs...');
