import { query } from "../prosgresql.js";

export const createUser = async ({ first_name, last_name, email, passwordHash, national_id, phone, status,dob }) => {
  const insertSql = `
    INSERT INTO users (first_name, last_name, email, password_hash, national_id, phone, status,dob)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `;
  const result = await query(insertSql, [first_name, last_name, email, passwordHash, national_id, phone, status,dob]);
  return result.rows[0];
};


export const findUserByEmail = async (email) => {
  const sql = `SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1`;
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
  const sql = `SELECT id, email, created_at FROM users WHERE id = $1 LIMIT 1`;
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
