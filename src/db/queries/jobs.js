import { query } from "../prosgresql.js";

export const createJobQuery = async ({ title, description, required_skills, location_lat, location_lon, time_balance_hours, start_time, end_time, creator_user_id }) => {
    const sql = `
        INSERT INTO jobs (title, description, required_skills, location_lat, location_lon, time_balance_hours, start_time, end_time, creator_user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;
    
    // Ensure required_skills is properly formatted as PostgreSQL array
    const skillsArray = Array.isArray(required_skills) ? required_skills : 
                      (typeof required_skills === 'string' && required_skills.trim() !== '') ? 
                      required_skills.split(',').map(skill => skill.trim()) : [];
    
    const result = await query(sql, [title, description, skillsArray, location_lat, location_lon, time_balance_hours, start_time, end_time, creator_user_id]);
    return result.rows[0];
};

export const getJobsQuery = async (limit = 50, offset = 0) => {
    const sql = `
        SELECT 
            j.id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            j.time_balance_hours,
            j.start_time,
            j.end_time,
            j.broadcasted,
            j.created_at,
            u.id as creator_user_id,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            u.email as creator_email
        FROM jobs j
        JOIN users u ON j.creator_user_id = u.id
        WHERE j.broadcasted = true
        ORDER BY j.created_at DESC
        LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
};

export const getJobByIdQuery = async (jobId) => {
    const sql = `
        SELECT 
            j.id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            j.time_balance_hours,
            j.start_time,
            j.end_time,
            j.broadcasted,
            j.created_at,
            u.id as creator_user_id,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            u.email as creator_email
        FROM jobs j
        JOIN users u ON j.creator_user_id = u.id
        WHERE j.id = $1
    `;
    const result = await query(sql, [jobId]);
    return result.rows[0] || null;
};

export const getJobsByUserQuery = async (userId) => {
    const sql = `
        SELECT 
            j.id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            j.time_balance_hours,
            j.start_time,
            j.end_time,
            j.broadcasted,
            j.created_at,
            COUNT(ja.id) as application_count
        FROM jobs j
        LEFT JOIN job_applications ja ON j.id = ja.job_id
        WHERE j.creator_user_id = $1
        GROUP BY j.id
        ORDER BY j.created_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
};

export const updateJobQuery = async (jobId, userId, { title, description, required_skills, location_lat, location_lon, time_balance_hours, start_time, end_time }) => {
    const sql = `
        UPDATE jobs 
        SET title = $3, description = $4, required_skills = $5, 
            location_lat = $6, location_lon = $7, time_balance_hours = $8,
            start_time = $9, end_time = $10
        WHERE id = $1 AND creator_user_id = $2
        RETURNING *
    `;
    const skillsArray = Array.isArray(required_skills) ? required_skills : 
                      (typeof required_skills === 'string' && required_skills.trim() !== '') ? 
                      required_skills.split(',').map(skill => skill.trim()) : [];
    
    const result = await query(sql, [jobId, userId, title, description, skillsArray, location_lat, location_lon, time_balance_hours, start_time, end_time]);
    return result.rows[0] || null;
};

export const deleteJobQuery = async (jobId, userId) => {
    const sql = `
        DELETE FROM jobs 
        WHERE id = $1 AND creator_user_id = $2
        RETURNING *
    `;
    const result = await query(sql, [jobId, userId]);
    return result.rows[0] || null;
};

export const broadcastJobQuery = async (jobId, userId) => {
    const sql = `
        UPDATE jobs 
        SET broadcasted = true
        WHERE id = $1 AND creator_user_id = $2
        RETURNING *
    `;
    const result = await query(sql, [jobId, userId]);
    return result.rows[0] || null;
};

// Update job broadcasted status (for admin use)
export const updateJobBroadcastedStatusQuery = async (jobId, broadcasted = true) => {
    const sql = `
        UPDATE jobs 
        SET broadcasted = $2
        WHERE id = $1
        RETURNING *
    `;
    const result = await query(sql, [jobId, broadcasted]);
    return result.rows[0] || null;
};
