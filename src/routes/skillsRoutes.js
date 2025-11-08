const express = require('express');
const router = express.Router();
const skillsController = require('../controllers/skillsController');
const authMiddleware = require('../middlewares/authMiddleware');

// Create a new skill (Protected route - requires authentication)
router.post('/', authMiddleware, skillsController.createSkill);

// Get all skills (Public route)
router.get('/', skillsController.getAllSkills);

// Get skill by ID (Public route)
router.get('/:id', skillsController.getSkillById);

// Update skill (Protected route - requires authentication)
router.put('/:id', authMiddleware, skillsController.updateSkill);

// Delete skill (Protected route - requires authentication)
router.delete('/:id', authMiddleware, skillsController.deleteSkill);

module.exports = router;