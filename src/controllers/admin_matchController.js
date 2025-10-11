import { getJobApplicantsQuery } from "../db/queries/admin_match.js";

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


