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