import { getJobApplicantsQuery, getAdminJobsQuery, createAdminMatchQuery, getAdminMatchesQuery, updateAdminMatchQuery, deleteAdminMatchQuery, updateJobApplicationStatusQuery } from "../db/queries_admin/admin_match.js";

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

export const createAdminMatch = async (req, res) => {
    try {
        const { job_id, user_id, reason } = req.body;
        const newMatch = await createAdminMatchQuery(job_id, user_id, reason);
        res.status(201).json(newMatch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
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


