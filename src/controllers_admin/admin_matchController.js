import { getJobApplicantsQuery, getAdminJobsQuery } from "../db/queries_admin/admin_match.js";

export const getJobApplicants = async (req, res) => {
    try {
        const { job_id } = req.params;
        const applicants = await getJobApplicantsQuery(job_id);
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


