import { createJobAppQuery,getJobAppsByUserQuery,updateJobAppStatusQuery } from '../db/queries/job_app.js';
import { sendJobApplicationNotification } from '../services/lineService.js';
import { query } from '../db/prosgresql.js';

export const postJobApp = async (req, res) => {
    try {
        const userIdFromToken = req.userId || null;
        const { userId: userIdFromBody, jobId} = req.body;

        const userId = userIdFromToken || userIdFromBody;

        const result = await createJobAppQuery({ userId, jobId });

        // Send LINE notification to job poster
        try {
            // Get job details and job poster's LINE user ID
            const jobQuery = `
                SELECT j.*, u.line_user_id, u.first_name, u.last_name
                FROM jobs j
                JOIN users u ON j.creator_user_id = u.id
                WHERE j.id = $1
            `;
            const jobResult = await query(jobQuery, [jobId]);
            
            // Get applicant details
            const applicantQuery = `
                SELECT u.first_name, u.last_name
                FROM users u
                WHERE u.id = $1
            `;
            const applicantResult = await query(applicantQuery, [userId]);
            
            if (jobResult.rows.length > 0 && applicantResult.rows.length > 0) {
                const jobData = jobResult.rows[0];
                const applicantData = applicantResult.rows[0];
                
                // Send LINE notification if job poster has LINE user ID
                if (jobData.line_user_id) {
                    await sendJobApplicationNotification(jobData.line_user_id, jobData, applicantData);
                }
            }
        } catch (notificationError) {
            console.error('Error sending LINE notification:', notificationError);
            // Don't fail the application if notification fails
        }

        res.json({
            success: true,
            applicationId: result.insertId,
            message: 'Application submitted successfully'
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'You have already applied for this job' });
        }
        res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
    }
}
export const getJobAppsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const applications = await getJobAppsByUserQuery(userId);
        res.json({ applications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
export const updateJobAppStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, employerId } = req.body;   

        const success = await updateJobAppStatusQuery(id, status, employerId);
        if (!success) {
            return res.status(403).json({ error: 'Unauthorized or application not found' });
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
