import pool, { query } from "../prosgresql.js";

const normalizeSkillInput = (skillsInput = []) => {
  if (!Array.isArray(skillsInput)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const rawSkill of skillsInput) {
    if (rawSkill == null) continue;

    let id = null;
    let name = null;
    let description = null;

    if (typeof rawSkill === "string") {
      name = rawSkill.trim();
    } else if (typeof rawSkill === "object") {
      id = rawSkill.id ?? rawSkill.skill_id ?? null;
      name = rawSkill.name ?? rawSkill.label ?? rawSkill.value ?? null;
      description = rawSkill.description ?? null;
      if (typeof name === "string") {
        name = name.trim();
      }
    }

    if ((!id || Number.isNaN(Number(id))) && (!name || name.length === 0)) {
      continue;
    }

    const key = id ? `id:${id}` : `name:${name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push({
      id: id ? Number(id) : null,
      name,
      description: description != null ? String(description).trim() : null,
    });

    if (result.length >= 3) {
      break;
    }
  }

  return result;
};

const ensureSkillRecord = async (client, skill) => {
  if (skill.id) {
    const byId = await client.query(
      `SELECT id, name, description FROM skills WHERE id = $1 LIMIT 1`,
      [skill.id]
    );
    if (byId.rows.length > 0) {
      return byId.rows[0];
    }
  }

  if (skill.name) {
    const byName = await client.query(
      `SELECT id, name, description FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [skill.name]
    );
    if (byName.rows.length > 0) {
      return byName.rows[0];
    }

    try {
      const inserted = await client.query(
        `INSERT INTO skills (name, description)
         VALUES ($1, $2)
         RETURNING id, name, description`,
        [skill.name, skill.description ?? null]
      );
      return inserted.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        const retry = await client.query(
          `SELECT id, name, description FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1`,
          [skill.name]
        );
        if (retry.rows.length > 0) {
          return retry.rows[0];
        }
      }
      throw error;
    }
  }

  throw new Error("Skill must include an id or name");
};

const replaceUserSkills = async (client, userId, skillsInput = []) => {
  const normalizedSkills = normalizeSkillInput(skillsInput);

  await client.query(`DELETE FROM user_skills WHERE user_profile_id = $1`, [userId]);

  const insertedSkills = [];

  for (const skill of normalizedSkills) {
    const ensuredSkill = await ensureSkillRecord(client, skill);

    await client.query(
      `INSERT INTO user_skills (user_profile_id, skill_id)
       VALUES ($1, $2)`,
      [userId, ensuredSkill.id]
    );

    insertedSkills.push({
      id: ensuredSkill.id,
      name: ensuredSkill.name,
    });
  }

  return insertedSkills;
};

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

export const createUserProfile = async ({ user_id, lat, lon, skills, household }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const profileResult = await client.query(
      `INSERT INTO user_profiles (user_id, lat, lon, household)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, lat, lon, household ?? null]
    );

    let insertedSkills = [];

    if (skills && skills.length > 0) {
      insertedSkills = await replaceUserSkills(client, user_id, skills);
    }

    await client.query("COMMIT");

    return {
      ...profileResult.rows[0],
      skills: insertedSkills,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateUserProfileSkills = async (userId, skills) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const updatedSkills = await replaceUserSkills(client, userId, skills);
    await client.query("COMMIT");
    return updatedSkills;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
    SELECT 
      up.lat, 
      up.lon, 
      up.current_lat, 
      up.current_lon, 
      up.household,
      COALESCE(skills_data.skills, '[]'::jsonb) AS skills
    FROM user_profiles up
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
    ) AS skills_data ON true
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
    SELECT id, name, description
    FROM skills
    ORDER BY LOWER(name)
  `;
  const result = await query(sql);
  return result.rows;
};

