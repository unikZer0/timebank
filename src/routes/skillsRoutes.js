import express from 'express';
const router = express.Router();
import * as skillsController from '../controllers/skillsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

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

export default router;