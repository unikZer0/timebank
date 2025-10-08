import { createJobAppQuery,getJobAppsByUserQuery,updateJobAppStatusQuery } from '../db/queries/job_app.js';

export const postJobApp = async (req, res) => {
    try {
        const { userId, jobId} = req.body;

        const result = await createJobAppQuery({ userId, jobId });

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