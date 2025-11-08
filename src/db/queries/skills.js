const db = require('../prosgresql');

// Create a new skill
const createSkill = async (name, description) => {
    const query = `
        INSERT INTO skills (name, description, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
    `;
    const values = [name, description];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Get all skills
const getAllSkills = async () => {
    const query = `
        SELECT * FROM skills
        ORDER BY name ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

// Get skill by ID
const getSkillById = async (id) => {
    const query = `
        SELECT * FROM skills
        WHERE id = $1
    `;
    const values = [id];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Update skill
const updateSkill = async (id, name, description) => {
    const query = `
        UPDATE skills
        SET name = $2,
            description = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
    `;
    const values = [id, name, description];
    const result = await db.query(query, values);
    return result.rows[0];
};

// Delete skill
const deleteSkill = async (id) => {
    const query = `
        DELETE FROM skills
        WHERE id = $1
        RETURNING *
    `;
    const values = [id];
    const result = await db.query(query, values);
    return result.rows[0];
};

module.exports = {
    createSkill,
    getAllSkills,
    getSkillById,
    updateSkill,
    deleteSkill
};