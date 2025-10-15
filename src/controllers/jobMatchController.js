import { getAdminMatchByIdQuery } from '../db/queries_admin/admin_match.js';
import { createJobAppQuery } from '../db/queries/job_app.js';
import { notifyJobApplicationStatus } from '../queues/notificationQueue.js';

/**
 * Get job match details for acceptance page
 * GET /api/job-match/:matchId
 */
export const getJobMatchDetails = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Get admin match details
    const match = await getAdminMatchByIdQuery(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Job match not found'
      });
    }
    
    res.status(200).json({
      success: true,
      match: {
        id: match.id,
        job_id: match.job_id,
        user_id: match.user_id,
        reason: match.reason,
        created_at: match.created_at,
        job: match.job,
        user: match.user
      }
    });
    
  } catch (error) {
    console.error('Error getting job match details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Accept job match and create job application
 * POST /api/job-match/:matchId/accept
 */
export const acceptJobMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId; // From auth middleware
    
    // Get admin match details
    const match = await getAdminMatchByIdQuery(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Job match not found'
      });
    }
    
    // Verify user is the matched user
    if (match.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to accept this job match'
      });
    }
    
    // Check if job application already exists
    const existingApplication = await checkExistingApplication(match.job_id, userId);
    
    if (existingApplication) {
      return res.status(409).json({
        success: false,
        error: 'You have already applied for this job'
      });
    }
    
    // Create job application
    const jobApplication = await createJobAppQuery({
      jobId: match.job_id,
      userId: userId
    });
    
    // Queue notification about job application status
    try {
      await notifyJobApplicationStatus(
        jobApplication.id,
        'applied',
        userId,
        match.job.title
      );
      console.log(`Job application notification queued for user ${userId}`);
    } catch (notificationError) {
      console.error('Error queuing job application notification:', notificationError);
      // Don't fail the acceptance if notification fails
    }
    
    res.status(201).json({
      success: true,
      message: 'Job match accepted successfully',
      jobApplication: {
        id: jobApplication.id,
        job_id: jobApplication.job_id,
        user_id: jobApplication.user_id,
        status: jobApplication.status,
        applied_at: jobApplication.applied_at
      }
    });
    
  } catch (error) {
    console.error('Error accepting job match:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Reject job match
 * POST /api/job-match/:matchId/reject
 */
export const rejectJobMatch = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId; // From auth middleware
    
    // Get admin match details
    const match = await getAdminMatchByIdQuery(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Job match not found'
      });
    }
    
    // Verify user is the matched user
    if (match.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to reject this job match'
      });
    }
    
    // Update match status to rejected (you might want to add this field to your database)
    // For now, we'll just log the rejection
    console.log(`User ${userId} rejected job match ${matchId}`);
    
    res.status(200).json({
      success: true,
      message: 'Job match rejected successfully'
    });
    
  } catch (error) {
    console.error('Error rejecting job match:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Check if user already has an application for this job
 * @param {number} jobId - Job ID
 * @param {number} userId - User ID
 */
const checkExistingApplication = async (jobId, userId) => {
  try {
    const { query } = await import('../db/prosgresql.js');
    const sql = `
      SELECT id FROM job_applications 
      WHERE job_id = $1 AND user_id = $2
    `;
    const result = await query(sql, [jobId, userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error checking existing application:', error);
    return null;
  }
};
