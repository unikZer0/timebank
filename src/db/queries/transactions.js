import { query } from "../prosgresql.js";

/**
 * Get transactions for a specific user
 * @param {number} userId - User ID
 * @param {number} limit - Number of transactions to fetch (default: 50)
 * @param {number} offset - Offset for pagination (default: 0)
 */
export const getUserTransactionsQuery = async (userId, limit = 50, offset = 0) => {
    const sql = `
        SELECT 
            t.id,
            t.from_user_id,
            t.to_user_id,
            t.amount,
            t.type,
            t.created_at,
            from_user.first_name as from_first_name,
            from_user.last_name as from_last_name,
            to_user.first_name as to_first_name,
            to_user.last_name as to_last_name
        FROM transactions t
        LEFT JOIN users from_user ON t.from_user_id = from_user.id
        LEFT JOIN users to_user ON t.to_user_id = to_user.id
        WHERE t.from_user_id = $1 OR t.to_user_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [userId, limit, offset]);
    return result.rows;
};

/**
 * Get transaction count for a specific user
 * @param {number} userId - User ID
 */
export const getUserTransactionCountQuery = async (userId) => {
    const sql = `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE from_user_id = $1 OR to_user_id = $1
    `;
    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].count);
};
