import { query } from "../prosgresql.js";

// Check if two users are in the same family (household)
export const checkSameFamily = async (fromUserId, toUserId) => {
    const sql = `
        SELECT 
            up1.household as from_household,
            up2.household as to_household
        FROM user_profiles up1
        JOIN user_profiles up2 ON up1.household = up2.household
        WHERE up1.user_id = $1 AND up2.user_id = $2
        LIMIT 1
    `;
    const result = await query(sql, [fromUserId, toUserId]);
    return result.rows.length > 0;
};

// Get user's current wallet balance
export const getWalletBalance = async (userId) => {
    const sql = `
        SELECT balance
        FROM wallets
        WHERE user_id = $1
        LIMIT 1
    `;
    const result = await query(sql, [userId]);
    return result.rows[0]?.balance || 0;
};

// Create a transfer transaction
export const createTransfer = async (fromUserId, toUserId, amount, type = 'transfer') => {
    const sql = `
        INSERT INTO transactions (from_user_id, to_user_id, amount, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await query(sql, [fromUserId, toUserId, amount, type]);
    return result.rows[0];
};

// Update wallet balance
export const updateWalletBalance = async (userId, newBalance) => {
    const sql = `
        UPDATE wallets
        SET balance = $2
        WHERE user_id = $1
        RETURNING *
    `;
    const result = await query(sql, [userId, newBalance]);
    return result.rows[0];
};

// Get user's transfer history
export const getTransferHistory = async (userId, limit = 50, offset = 0) => {
    const sql = `
        SELECT 
            t.id,
            t.amount as hours,
            t.type,
            t.created_at,
            CASE 
                WHEN t.from_user_id = $1 THEN 'sent'
                WHEN t.to_user_id = $1 THEN 'received'
            END as direction,
            CASE 
                WHEN t.from_user_id = $1 THEN 
                    CONCAT(u_to.first_name, ' ', u_to.last_name)
                WHEN t.to_user_id = $1 THEN 
                    CONCAT(u_from.first_name, ' ', u_from.last_name)
            END as other_user_name,
            CASE 
                WHEN t.from_user_id = $1 THEN t.to_user_id
                WHEN t.to_user_id = $1 THEN t.from_user_id
            END as other_user_id
        FROM transactions t
        LEFT JOIN users u_from ON t.from_user_id = u_from.id
        LEFT JOIN users u_to ON t.to_user_id = u_to.id
        WHERE t.from_user_id = $1 OR t.to_user_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [userId, limit, offset]);
    return result.rows;
};

// Get family members for a user
export const getFamilyMembers = async (userId) => {
    const sql = `
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            up.household,
            w.balance
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE up.household = (
            SELECT household 
            FROM user_profiles 
            WHERE user_id = $1
        )
        AND u.id != $1
        AND u.status = 'verified'
        ORDER BY u.first_name, u.last_name
    `;
    const result = await query(sql, [userId]);
    return result.rows;
};
