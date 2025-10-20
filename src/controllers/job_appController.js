import { createJobAppQuery,getJobAppsByUserQuery,updateJobAppStatusQuery, getJobApplicationsByJobIdQuery } from '../db/queries/job_app.js';
import { sendJobApplicationNotification } from '../services/lineService.js';
import { switchToAcceptJobMenu } from '../services/richMenuService.js';
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
                SELECT u.first_name, u.last_name, u.line_user_id
                FROM users u
                WHERE u.id = $1
            `;
            const applicantResult = await query(applicantQuery, [userId]);
            
            if (jobResult.rows.length > 0 && applicantResult.rows.length > 0) {
                const jobData = jobResult.rows[0];
                const applicantData = applicantResult.rows[0];
                
                // Send LINE notification to job poster
                if (jobData.line_user_id) {
                    await sendJobApplicationNotification(jobData.line_user_id, jobData, applicantData);
                }
                
                // Send confirmation message to applicant
                if (applicantData.line_user_id) {
                    const { sendLineMessage } = await import('../services/lineService.js');
                    await sendLineMessage(applicantData.line_user_id, ` คุณได้สมัครงาน "${jobData.title}" เรียบร้อยแล้ว!

รางวัล: ${jobData.time_balance_hours} ชั่วโมง

ผู้จ้างจะพิจารณาการสมัคของคุณและแจ้งผลกลับมา

คุณสามารถตรวจสอบสถานะการสมัครได้ที่:
${process.env.FRONTEND_URL || 'http://localhost:3001'}/my-jobs

ขอบคุณที่ใช้บริการ TimeBank!`);
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

export const getMyJobApplications = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ 
                success: false,
                error: 'User not authenticated' 
            });
        }

        const applications = await getJobAppsByUserQuery(userId);
        res.json({ 
            success: true,
            applications: applications 
        });
    } catch (error) {
        console.error('Error fetching my job applications:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
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

        // If status is 'accepted', switch user to accepted jobs rich menu
        if (status === 'accepted') {
            try {
                // Get the user's LINE user ID
                const userQuery = `
                    SELECT u.line_user_id 
                    FROM job_applications ja
                    JOIN users u ON ja.user_id = u.id
                    WHERE ja.id = $1
                `;
                const userResult = await query(userQuery, [id]);
                
                if (userResult.rows.length > 0 && userResult.rows[0].line_user_id) {
                    const lineUserId = userResult.rows[0].line_user_id;
                    await switchToAcceptJobMenu(lineUserId);
                    console.log(`Switched user ${lineUserId} to accept job rich menu`);
                }
            } catch (richMenuError) {
                console.error('Error switching to accept job rich menu:', richMenuError);
                // Don't fail the status update if rich menu switch fails
            }
        }

        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Get applications for a specific job (for job creator)
export const getJobApplications = async (req, res) => {
    try {
        const { jobId } = req.params;
        const userId = req.userId;

        const applications = await getJobApplicationsByJobIdQuery(jobId, userId);
        
        res.json({
            success: true,
            applications: applications
        });
    } catch (error) {
        console.error('Error fetching job applications:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
};
