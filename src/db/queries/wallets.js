import { query } from "../prosgresql.js";
export const createWallet = async (userId, initialBalance = 0) => {
  const sql = `
    INSERT INTO wallets (user_id, balance)
    VALUES ($1, $2)
    RETURNING *
  `;
  const result = await query(sql, [userId, initialBalance]);
  return result.rows[0];
};

export const getWalletByUserId = async (userId) => {
  const sql = `
    SELECT user_id, balance
    FROM wallets
    WHERE user_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
};

export const updateWalletBalance = async (userId, newBalance) => {
  const sql = `
    UPDATE wallets
    SET balance = $2
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await query(sql, [userId, newBalance]);
  return result.rows[0] || null;
};

export const walletExists = async (userId) => {
  const sql = `
    SELECT user_id
    FROM wallets
    WHERE user_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  return result.rows.length > 0;
};
