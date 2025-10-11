import { query } from "../prosgresql.js";

export const getJobApplicantsQuery = async (jobId) => {
    const sql = `
        SELECT
            ja.id as application_id,
            ja.status,
            ja.applied_at,
            u.id as user_id,
            u.email,
            u.first_name,
            u.last_name,
            up.lat as profile_lat,
            up.lon as profile_lon,
            up.skills as profile_skills,
            up.available_hours as profile_available_hours
        FROM job_applications ja
        JOIN users u ON ja.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE ja.job_id = $1
        ORDER BY ja.applied_at DESC
    `;

    const result = await query(sql, [jobId]);
    return result.rows;
};

export const createAdminMatchQuery = async (job_id, user_id, reason) => {
    const sql = `
        INSERT INTO admin_matches (job_id, user_id, reason)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await query(sql, [job_id, user_id, reason]);
    return result.rows[0];
};

export const getAdminMatchesQuery = async () => {
    const sql = `
        SELECT
            am.id,
            am.job_id,
            am.user_id,
            am.reason,
            am.created_at,
            j.title as job_title,
            u.email as user_email
        FROM admin_matches am
        JOIN jobs j ON am.job_id = j.id
        JOIN users u ON am.user_id = u.id
        ORDER BY am.created_at DESC
    `;
    const result = await query(sql);
    return result.rows;
};

export const updateAdminMatchQuery = async (id, job_id, user_id, reason) => {
    const sql = `
        UPDATE admin_matches
        SET job_id = $2, user_id = $3, reason = $4
        WHERE id = $1
        RETURNING *
    `;
    const result = await query(sql, [id, job_id, user_id, reason]);
    return result.rows[0];
};

export const deleteAdminMatchQuery = async (id) => {
    const sql = `
        DELETE FROM admin_matches
        WHERE id = $1
        RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
};

export const updateJobApplicationStatusQuery = async (id, status) => {
    const sql = `
        UPDATE job_applications
        SET status = $2
        WHERE id = $1
        RETURNING *
    `;
    const result = await query(sql, [id, status]);
    return result.rows[0];
};

export const getAdminJobsQuery = async () => {
    const sql = `
        SELECT
            j.id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            j.broadcasted,
            j.created_at,
            u.id as creator_user_id,
            u.email as creator_email,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name
        FROM jobs j
        JOIN users u ON j.creator_user_id = u.id
        ORDER BY j.created_at DESC
    `;

    const result = await query(sql);
    return result.rows;
};