import { query } from "../prosgresql.js";

export const createNotification = async ({ user_id, type, title, message, data = null }) => {
  const sql = `
    INSERT INTO notifications (user_id, type, title, message, data, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;
  const result = await query(sql, [user_id, type, title, message, JSON.stringify(data)]);
  return result.rows[0];
};

export const getNotificationsByUserId = async (userId, limit = 50) => {
  const sql = `
    SELECT id, type, title, message, data, is_read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const result = await query(sql, [userId, limit]);
  return result.rows;
};

export const markNotificationAsRead = async (notificationId) => {
  const sql = `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1
    RETURNING *
  `;
  const result = await query(sql, [notificationId]);
  return result.rows[0];
};

export const getUnreadNotificationCount = async (userId) => {
  const sql = `
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;
  const result = await query(sql, [userId]);
  return parseInt(result.rows[0].count);
};

export const getAllAdmins = async () => {
  const sql = `
    SELECT id, email, first_name, last_name
    FROM users
    WHERE role = 'admin'
  `;
  const result = await query(sql);
  return result.rows;
};
