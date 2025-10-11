import { getJobApplicantsQuery, getAdminJobsQuery } from "../db/queries_admin/admin_match.js";

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


