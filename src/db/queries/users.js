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


export const findUserNationalId = async (national_id) => {
  const sql = `SELECT id FROM users WHERE national_id = $1 LIMIT 1`;
  const result = await query(sql, [national_id]);
  return result.rows[0] || null;
};

export const findUserByEmail = async (email) => {
  const sql = `SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1`;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
};
export const searchUsersByNameOrId = async (searchTerm) => {
  const sql = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.national_id,
      u.status,
      up.household
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.status = 'verified'
    AND (
      u.national_id = $1 
      OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $2
      OR u.first_name ILIKE $2
      OR u.last_name ILIKE $2
    )
    ORDER BY 
      CASE WHEN u.national_id = $1 THEN 1 ELSE 2 END,
      u.first_name, u.last_name
    LIMIT 10
  `;
  const searchPattern = `%${searchTerm}%`;
  const result = await query(sql, [searchTerm, searchPattern]);
  return result.rows;
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

export const createUserProfile = async ({ user_id, lat, lon,skills, household }) => {
  const sql = `
    INSERT INTO user_profiles(user_id, lat, lon,skills, household)
    VALUES ($1, $2, $3, $4,$5)
    RETURNING *
  `;
  const result = await query(sql, [user_id,
    lat,
    lon,
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

export const getUserProfileWithLocation = async (userId) => {
  const sql = `
    SELECT up.lat, up.lon, up.current_lat, up.current_lon, up.skills, up.household
    FROM user_profiles up
    WHERE up.user_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
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

/**
 * Get all unique skills from all user profiles
 */
export const getAllUserSkills = async () => {
  const sql = `
    SELECT DISTINCT jsonb_array_elements_text(skills) as skill
    FROM user_profiles 
    WHERE skills IS NOT NULL AND jsonb_typeof(skills) = 'array'
    ORDER BY skill
  `;
  const result = await query(sql);
  return result.rows.map(row => row.skill);
};

