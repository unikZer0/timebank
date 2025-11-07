import { query } from "../prosgresql.js";
import { createWallet } from "../queries/wallets.js";
export const getUnverifiedUsersQuery = async () => {
    const sql = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.national_id, u.dob, u.created_at,
               up.lat, up.lon, COALESCE(user_skills_data.skills, '[]'::jsonb) AS skills, up.household,u.status
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN LATERAL (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', s.id,
                        'name', s.name
                    ) ORDER BY lower(s.name)
                ), '[]'::jsonb
            ) AS skills
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_profile_id = up.user_id
        ) user_skills_data ON true

        ORDER BY u.created_at DESC
    `;
    const result = await query(sql);
    return result.rows || [];
};

export const getUserDetailsQuery = async (userId) => {
    const sql = `
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.national_id, u.dob, u.created_at,
               up.lat, up.lon, COALESCE(user_skills_data.skills, '[]'::jsonb) AS skills, up.household,u.status
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN LATERAL (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', s.id,
                        'name', s.name
                    ) ORDER BY lower(s.name)
                ), '[]'::jsonb
            ) AS skills
            FROM user_skills us
            JOIN skills s ON s.id = us.skill_id
            WHERE us.user_profile_id = up.user_id
        ) user_skills_data ON true
        WHERE u.id = $1
    `;
    const result = await query(sql, [userId]);
    return result.rows[0] || null;
};

export const verifyUserQuery = async (userId) => {
    try {
        const userSql = `
            UPDATE users 
            SET status = 'verified', verified = true
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `;
        const userResult = await query(userSql, [userId]);
        
        if (userResult.rows.length === 0) {
            return null;
        }
        
        const user = userResult.rows[0];
        
        const wallet = await createWallet(userId, 0);
        
        return {
            user,
            wallet
        };
    } catch (error) {
        console.error('Error in verifyUserQuery:', error);
        throw error;
    }
};

export const rejectUserQuery = async (userId, rejectionReason = null) => {
    const sql = `
        UPDATE users 
        SET status = 'rejected', verified = false, rejection_reason = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING *
    `;
    const result = await query(sql, [userId, rejectionReason]);
    return result.rows[0] || null;
};
