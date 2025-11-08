import * as skillsQueries from '../db/queries/skills.js';

// Create a new skill
const createSkill = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Skill name is required' });
        }

        const newSkill = await skillsQueries.createSkill(name, description);
        res.status(201).json(newSkill);
    } catch (error) {
        console.error('Error creating skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get all skills
const getAllSkills = async (req, res) => {
    try {
        const skills = await skillsQueries.getAllSkills();
        res.json(skills);
    } catch (error) {
        console.error('Error getting skills:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get skill by ID
const getSkillById = async (req, res) => {
    try {
        const { id } = req.params;
        const skill = await skillsQueries.getSkillById(id);
        
        if (!skill) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        
        res.json(skill);
    } catch (error) {
        console.error('Error getting skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update skill
const updateSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Skill name is required' });
        }

        const updatedSkill = await skillsQueries.updateSkill(id, name, description);
        
        if (!updatedSkill) {
            return res.status(404).json({ error: 'Skill not found' });
        }

        res.json(updatedSkill);
    } catch (error) {
        console.error('Error updating skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete skill
const deleteSkill = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSkill = await skillsQueries.deleteSkill(id);
        
        if (!deletedSkill) {
            return res.status(404).json({ error: 'Skill not found' });
        }

        res.json({ message: 'Skill deleted successfully', skill: deletedSkill });
    } catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export {
    createSkill,
    getAllSkills,
    getSkillById,
    updateSkill,
    deleteSkill
};