import { query } from "../prosgresql.js";

export const createUser = async ({ email, passwordHash }) => {
  const insertSql = `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, created_at
  `;
  const result = await query(insertSql, [email, passwordHash]);
  return result.rows[0];
};

export const findUserByEmail = async (email) => {
  const sql = `SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1`;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const sql = `SELECT id, email, created_at FROM users WHERE id = $1 LIMIT 1`;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};
