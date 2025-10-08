import { query } from "../prosgresql.js";
export const createJobAppQuery = async ({ jobId, userId
}) => {
    // check if user already applied
    const existing = await query(
        'SELECT id FROM job_applications WHERE job_id = $1 AND user_id = $2',
        [jobId, userId]
    );

    if (existing.rows.length > 0) {
        const err = new Error('You have already applied for this job');
        err.status = 400;
        throw err;
    }
    // check if user is verified
    const userResult = await query('SELECT verified FROM users WHERE id = $1', [userId]);
    const verified = userResult.rows[0]?.verified;
    if (!JSON.parse(verified.toString())) {
        const err = new Error('User must be verified to apply for jobs');
        err.status = 403;
        throw err;
    }

    // check if job exists
    const jobResult = await query('SELECT id, broadcasted FROM jobs WHERE id = $1', [jobId]);
    if (!jobResult.rows[0]) {
        const err = new Error('Job not found');
        err.status = 404;
        throw err;
    }

    // apply worker to job
    const insertResult = await query(
        'INSERT INTO job_applications (job_id, user_id) VALUES ($1, $2) RETURNING id',
        [jobId, userId]
    );

    return insertResult.rows[0];
}
export const getJobAppsByUserQuery = async (userId) => {
    const sql =` SELECT 
            ja.id,
            ja.status,
            ja.applied_at,
            j.id as job_id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            CONCAT(u.first_name, ' ', u.last_name) as employer_name,
            u.email as employer_email,
            u.phone as employer_phone
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON j.creator_user_id = u.id
        WHERE ja.user_id = $1
        ORDER BY ja.applied_at DESC`
    const jobapp= await query(sql,[userId]);
    return jobapp.rows[0] || null;
};
export const updateJobAppStatusQuery = async (id, status, employerId) => {
    const sql = `SELECT ja.id 
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.id = $1 AND j.creator_user_id = $2`;
    const result = await query(sql, [id, employerId]);
    if (result.rows.length === 0) {
        return false; // Not found or unauthorized
    }
    
    const updateSql = `UPDATE job_applications SET status = $1 WHERE id = $2`;
    await query(updateSql, [status, id]);
    return true;
};
