import express from 'express';
import multer from 'multer';
import {
  createRichMenuController,
  uploadRichMenuImageController,
  linkRichMenuToUserController,
  unlinkRichMenuFromUserController,
  getRichMenuController,
  listRichMenusController,
  deleteRichMenuController,
  createDefaultRichMenusController,
  switchToMatchedMenuController,
  switchToMainMenuController
} from '../controllers/richMenuController.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Rich Menu Management Routes

/**
 * @route POST /richmenu/create
 * @desc Create a new rich menu
 * @access Admin
 */
router.post('/create', createRichMenuController);

/**
 * @route POST /richmenu/:richMenuId/image
 * @desc Upload image for rich menu
 * @access Admin
 */
router.post('/:richMenuId/image', upload.single('image'), uploadRichMenuImageController);

/**
 * @route POST /richmenu/:richMenuId/link/:userId
 * @desc Link rich menu to user
 * @access Admin
 */
router.post('/:richMenuId/link/:userId', linkRichMenuToUserController);

/**
 * @route DELETE /richmenu/unlink/:userId
 * @desc Unlink rich menu from user
 * @access Admin
 */
router.delete('/unlink/:userId', unlinkRichMenuFromUserController);

/**
 * @route GET /richmenu/:richMenuId
 * @desc Get rich menu details
 * @access Admin
 */
router.get('/:richMenuId', getRichMenuController);

/**
 * @route GET /richmenu
 * @desc List all rich menus
 * @access Admin
 */
router.get('/', listRichMenusController);

/**
 * @route DELETE /richmenu/:richMenuId
 * @desc Delete rich menu
 * @access Admin
 */
router.delete('/:richMenuId', deleteRichMenuController);

/**
 * @route POST /richmenu/create-default
 * @desc Clear all existing rich menus and create a fresh one
 * @access Admin
 */
router.post('/create-default', createDefaultRichMenusController);

// User Menu Switching Routes

/**
 * @route POST /richmenu/switch-matched/:userId
 * @desc Switch user to matched menu
 * @access Admin
 */
router.post('/switch-matched/:userId', switchToMatchedMenuController);

/**
 * @route POST /richmenu/switch-main/:userId
 * @desc Switch user to main menu
 * @access Admin
 */
router.post('/switch-main/:userId', switchToMainMenuController);

export default router;
