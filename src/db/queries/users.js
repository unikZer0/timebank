import { query } from "../prosgresql.js";

export const createUser = async ({ first_name, last_name, email, passwordHash, national_id, phone, status,dob }) => {
  const insertSql = `
    INSERT INTO users (first_name, last_name, email, password_hash, national_id, phone, status, dob, verified)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `;
  const result = await query(insertSql, [first_name, last_name, email, passwordHash, national_id, phone, status, dob, false]);
  return result.rows[0];
};


export const findUserByEmail = async (email) => {
  const sql = `SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1`;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
};
export const findUserNationalId = async (national_id) => {
  const sql = `SELECT id, verified FROM users WHERE national_id=$1 LIMIT 1`;
  const result = await query(sql, [national_id]);
  return result.rows[0] || null;
};
export const findUserPhone  = async (phone) => {
  const sql = `SELECT id FROM users WHERE phone=$1 LIMIT 1`;
  const result = await query(sql, [phone]);
  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const sql = `SELECT id, email, role, created_at, line_user_id FROM users WHERE id = $1 LIMIT 1`;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
};

//insert to user's profile 

export const createUserProfile = async ({ user_id, lat, lon,skills,available_hours, household }) => {
  const sql = `
    INSERT INTO user_profiles(user_id, lat, lon,available_hours,skills, household)
    VALUES ($1, $2, $3, $4,$5,$6)
    RETURNING *
  `;
  const result = await query(sql, [user_id,
    lat,
    lon,
    JSON.stringify(available_hours),
    JSON.stringify(skills),    
    household                  
  ]);
  return result.rows[0];
};
export const findUserByIdentifier = async (identifier) => {
  const sql = `
    SELECT id, email, password_hash, role, status, verified
    FROM users
    WHERE email = $1 OR phone = $1
    LIMIT 1
  `;
  const result = await query(sql, [identifier]);
  return result.rows[0] || null;
};
export const updateRememberToken = async (userId, hash, expires) => {
  const sql = `
    UPDATE users
    SET remember_token = $1,
        remember_token_expires = $2
    WHERE id = $3
  `;
  await query(sql, [hash, expires, userId]);
};
export const clearRememberToken = async (userId) => {
  const sql = `
    UPDATE users
    SET remember_token = NULL,
        remember_token_expires = NULL
    WHERE id = $1
  `;
  await query(sql, [userId]);
};
export const findUserByRememberToken = async () => {
  const sql = `
    SELECT id, email, role, remember_token, remember_token_expires
    FROM users
    WHERE remember_token IS NOT NULL AND remember_token_expires > NOW()
  `;
  const result = await query(sql);
  return result.rows || [];
};

export const findUserByResetToken = async (token) => {
  const sql = `
    SELECT id, reset_token, reset_token_expires
    FROM users
    WHERE reset_token = $1 AND reset_token_expires > NOW()
  `;
  const result = await query(sql, [token]);
  return result.rows[0] || null;
};

export const updateResetToken = async (userId, token, expires) => {
  const sql = `
    UPDATE users
    SET reset_token = $1,
        reset_token_expires = $2
    WHERE id = $3
  `;
  await query(sql, [token, expires, userId]);
};

export const updatePassword = async (userId, passwordHash) => {
  const sql = `
    UPDATE users
    SET password_hash = $1,
        reset_token = NULL,
        reset_token_expires = NULL
    WHERE id = $2
  `;
  await query(sql, [passwordHash, userId]);
};

export const getUsersWithLineId = async () => {
  const sql = `SELECT id, email, first_name, last_name, line_user_id FROM users WHERE line_user_id IS NOT NULL`;
  const result = await query(sql);
  return result.rows;
};

export const updateUserCurrentLocation = async (userId, currentLat, currentLon) => {
  const sql = `
    UPDATE user_profiles 
    SET current_lat = $2, current_lon = $3, updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `;
  const result = await query(sql, [userId, currentLat, currentLon]);
  return result.rows[0] || null;
};

