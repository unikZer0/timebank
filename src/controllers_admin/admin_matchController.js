import { getJobApplicantsQuery, getAdminJobsQuery, getJobsForMatchingQuery, createAdminMatchQuery, getAdminMatchesQuery, updateAdminMatchQuery, deleteAdminMatchQuery, updateJobApplicationStatusQuery, getSkilledUsersForJobQuery } from "../db/queries_admin/admin_match.js";
import { sendJobMatchNotification } from "../services/lineService.js";
import { findUserById } from "../db/queries/users.js";
import { getJobByIdQuery, updateJobBroadcastedStatusQuery } from "../db/queries/jobs.js";
import { switchToMatchedMenu } from "../services/richMenuService.js";

export const getSkilledUsersForJob = async (req, res) => {
    try {
        const rawJobId = req.params.job_id;
        const match = String(rawJobId).match(/\d+/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid job_id parameter' });
        }
        const jobId = parseInt(match[0], 10);
        const users = await getSkilledUsersForJobQuery(jobId);
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getJobApplicants = async (req, res) => {
    try {
        const rawJobId = req.params.job_id;
        if (!rawJobId) {
            return res.status(400).json({
                success: false,
                error: 'Missing job_id parameter',
                message: 'กรุณาระบุ job_id ที่ต้องการดูข้อมูล'
            });
        }

        const match = String(rawJobId).match(/\d+/);
        if (!match) {
            return res.status(400).json({
                success: false,
                error: 'Invalid job_id format',
                message: 'รูปแบบ job_id ไม่ถูกต้อง กรุณาใส่เฉพาะตัวเลขเท่านั้น'
            });
        }

        const jobId = parseInt(match[0], 10);
        const applicants = await getJobApplicantsQuery(jobId);

        if (applicants.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No applicants found',
                message: `ไม่พบข้อมูลผู้สมัครสำหรับงาน ID: ${jobId}`
            });
        }

        res.json({
            success: true,
            applicants
        });
    } catch (error) {
        console.error('Error in getJobApplicants:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
        });
    }
};

export const getAdminJobs = async (req, res) => {
    try {
        const jobs = await getAdminJobsQuery();
        res.json({ jobs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getJobsForMatching = async (req, res) => {
    try {
        const jobs = await getJobsForMatchingQuery();
        res.json({ jobs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createAdminMatch = async (req, res) => {
    try {
        const { job_id, user_id, reason } = req.body;
        
        // Validate that job and user exist BEFORE creating the match
        const user = await findUserById(user_id);
        const job = await getJobByIdQuery(job_id);
        
        console.log(`Debug - User ${user_id} data:`, user);
        console.log(`Debug - Job ${job_id} data:`, job);
        
        if (!user) {
            console.log(`User ${user_id} not found in database`);
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: `User with ID ${user_id} does not exist`
            });
        }
        
        if (!job) {
            console.log(`Job ${job_id} not found in database`);
            return res.status(404).json({
                success: false,
                error: 'Job not found',
                message: `Job with ID ${job_id} does not exist`
            });
        }
        
        // Now create the admin match since we know both job and user exist
        const newMatch = await createAdminMatchQuery(job_id, user_id, reason);
    
        // Automatically set the job as broadcasted when admin creates a match
        try {
            await updateJobBroadcastedStatusQuery(job_id, true);
            console.log(`Job ${job_id} automatically set as broadcasted due to admin match`);
        } catch (broadcastError) {
            console.error('Error setting job as broadcasted:', broadcastError);
            // Don't fail the match creation if broadcast update fails
        }
    
        try {
            console.log(`User ${user_id} line_user_id:`, user.line_user_id);
            
            if (!user.line_user_id) {
                console.log(`User ${user_id} exists but has no LINE user ID`);
                return res.status(201).json({
                    success: true,
                    match: newMatch,
                    message: 'Admin match created successfully',
                    warning: 'User has no LINE user ID - LINE notification not sent'
                });
            }
            
            const matchData = {
                id: newMatch.id,
                reason: reason,
                provider_user_id: user_id  
            };
            
            const lineSent = await sendJobMatchNotification(user.line_user_id, job, matchData);
            
            if (lineSent) {
                console.log(`LINE notification sent to user ${user_id} for job match ${newMatch.id}`);
                
                // Switch user to matched rich menu
                try {
                    const menuSwitched = await switchToMatchedMenu(user.line_user_id, newMatch.id);
                    if (menuSwitched) {
                        console.log(`Rich menu switched to matched state for user ${user_id}`);
                    } else {
                        console.log(`Failed to switch rich menu for user ${user_id}`);
                    }
                } catch (menuError) {
                    console.error('Error switching rich menu:', menuError);
                    // Don't fail the match creation if rich menu switch fails
                }
            } else {
                console.log(`Failed to send LINE notification to user ${user_id}`);
            }
        } catch (lineError) {
            console.error('Error sending LINE notification:', lineError);
            // Don't fail the match creation if LINE notification fails
        }
        
        res.status(201).json({
            success: true,
            match: newMatch,
            message: 'Admin match created successfully and job broadcasted'
        });
    } catch (error) {
        console.error('Error creating admin match:', error);
        
        // Handle specific database errors
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                error: 'Foreign key constraint violation',
                message: 'The job or user does not exist in the database'
            });
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
};

export const getAdminMatches = async (req, res) => {
    try {
        const matches = await getAdminMatchesQuery();
        res.json({ matches });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAdminMatch = async (req, res) => {
    try {
        const rawId = req.params.id;
        const match = String(rawId).match(/\d+/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid id parameter' });
        }
        const id = parseInt(match[0], 10);
        const { job_id, user_id, reason } = req.body;
        const updatedMatch = await updateAdminMatchQuery(id, job_id, user_id, reason);
        res.json(updatedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteAdminMatch = async (req, res) => {
    try {
        const rawId = req.params.id;
        const match = String(rawId).match(/\d+/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid id parameter' });
        }
        const id = parseInt(match[0], 10);
        const deletedMatch = await deleteAdminMatchQuery(id);
        res.json(deletedMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateJobApplicationStatus = async (req, res) => {
    try {
        const rawId = req.params.id;
        if (!rawId) {
            return res.status(400).json({
                success: false,
                error: 'Missing application ID',
                message: 'กรุณาระบุ ID ของใบสมัครที่ต้องการอัพเดท'
            });
        }

        const match = String(rawId).match(/\d+/);
        if (!match) {
            return res.status(400).json({
                success: false,
                error: 'Invalid application ID format',
                message: 'รูปแบบ ID ไม่ถูกต้อง กรุณาใส่เฉพาะตัวเลขเท่านั้น'
            });
        }

        const id = parseInt(match[0], 10);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Missing status',
                message: 'กรุณาระบุสถานะที่ต้องการอัพเดท'
            });
        }

        const validStatuses = ['pending', 'accepted', 'rejected', 'complete'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
                message: `สถานะไม่ถูกต้อง กรุณาเลือกจาก: ${validStatuses.join(', ')}`
            });
        }

        const updatedApplication = await updateJobApplicationStatusQuery(id, status);
        
        if (!updatedApplication) {
            return res.status(404).json({
                success: false,
                error: 'Application not found',
                message: `ไม่พบใบสมัครหมายเลข ${id}`
            });
        }

        res.json({
            success: true,
            message: `อัพเดทสถานะใบสมัครเป็น ${status} สำเร็จ`,
            application: updatedApplication
        });
    } catch (error) {
        console.error('Error updating job application status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
        });
    }
};