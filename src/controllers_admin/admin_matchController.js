import { getJobApplicantsQuery, getAdminJobsQuery, getJobsForMatchingQuery, createAdminMatchQuery, getAdminMatchesQuery, updateAdminMatchQuery, deleteAdminMatchQuery, updateJobApplicationStatusQuery } from "../db/queries_admin/admin_match.js";
import { sendJobMatchNotification } from "../services/lineService.js";
import { findUserById } from "../db/queries/users.js";
import { getJobByIdQuery } from "../db/queries/jobs.js";
import { switchToMatchedMenu } from "../services/richMenuService.js";

export const getJobApplicants = async (req, res) => {
    try {
        const rawJobId = req.params.job_id;
        const match = String(rawJobId).match(/\d+/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid job_id parameter' });
        }
        const jobId = parseInt(match[0], 10);
        const applicants = await getJobApplicantsQuery(jobId);
        res.json({ applicants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
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
        const newMatch = await createAdminMatchQuery(job_id, user_id, reason);
    
        try {
            const user = await findUserById(user_id);
            const job = await getJobByIdQuery(job_id);
            
            console.log(`Debug - User ${user_id} data:`, user);
            console.log(`Debug - Job ${job_id} data:`, job);
            
            if (!user) {
                console.log(`User ${user_id} not found in database`);
                return res.status(201).json({
                    success: true,
                    match: newMatch,
                    message: 'Admin match created successfully (user not found)',
                    warning: 'User not found - LINE notification not sent'
                });
            }
            
            if (!job) {
                console.log(`Job ${job_id} not found in database`);
                return res.status(201).json({
                    success: true,
                    match: newMatch,
                    message: 'Admin match created successfully (job not found)',
                    warning: 'Job not found - LINE notification not sent'
                });
            }
            
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
                reason: reason
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
            message: 'Admin match created successfully'
        });
    } catch (error) {
        console.error('Error creating admin match:', error);
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
        const match = String(rawId).match(/\d+/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid id parameter' });
        }
        const id = parseInt(match[0], 10);
        const { status } = req.body;
        const updatedApplication = await updateJobApplicationStatusQuery(id, status);
        res.json(updatedApplication);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


