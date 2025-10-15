import { 
  createRichMenu, 
  uploadRichMenuImage, 
  linkRichMenuToUser, 
  unlinkRichMenuFromUser,
  getRichMenu,
  listRichMenus,
  deleteRichMenu,
  createDefaultRichMenus,
  switchToMatchedMenu,
  switchToMainMenu
} from '../services/richMenuService.js';

/**
 * Create a new rich menu
 */
export const createRichMenuController = async (req, res) => {
  try {
    const richMenuData = req.body;
    
    if (!richMenuData.name || !richMenuData.areas) {
      return res.status(400).json({ 
        error: 'Rich menu name and areas are required' 
      });
    }

    const result = await createRichMenu(richMenuData);
    
    res.status(201).json({
      success: true,
      richMenu: result,
      message: 'Rich menu created successfully'
    });

  } catch (error) {
    console.error('Error creating rich menu:', error);
    res.status(500).json({ 
      error: 'Failed to create rich menu',
      details: error.message 
    });
  }
};

/**
 * Upload rich menu image
 */
export const uploadRichMenuImageController = async (req, res) => {
  try {
    const { richMenuId } = req.params;
    const imageBuffer = req.file?.buffer;
    const contentType = req.file?.mimetype;

    if (!imageBuffer) {
      return res.status(400).json({ 
        error: 'Image file is required' 
      });
    }

    if (!['image/jpeg', 'image/png'].includes(contentType)) {
      return res.status(400).json({ 
        error: 'Only JPEG and PNG images are supported' 
      });
    }

    await uploadRichMenuImage(richMenuId, imageBuffer, contentType);
    
    res.json({
      success: true,
      message: 'Rich menu image uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading rich menu image:', error);
    res.status(500).json({ 
      error: 'Failed to upload rich menu image',
      details: error.message 
    });
  }
};

/**
 * Link rich menu to user
 */
export const linkRichMenuToUserController = async (req, res) => {
  try {
    const { userId, richMenuId } = req.params;

    await linkRichMenuToUser(userId, richMenuId);
    
    res.json({
      success: true,
      message: 'Rich menu linked to user successfully'
    });

  } catch (error) {
    console.error('Error linking rich menu to user:', error);
    res.status(500).json({ 
      error: 'Failed to link rich menu to user',
      details: error.message 
    });
  }
};

/**
 * Unlink rich menu from user
 */
export const unlinkRichMenuFromUserController = async (req, res) => {
  try {
    const { userId } = req.params;

    await unlinkRichMenuFromUser(userId);
    
    res.json({
      success: true,
      message: 'Rich menu unlinked from user successfully'
    });

  } catch (error) {
    console.error('Error unlinking rich menu from user:', error);
    res.status(500).json({ 
      error: 'Failed to unlink rich menu from user',
      details: error.message 
    });
  }
};

/**
 * Get rich menu details
 */
export const getRichMenuController = async (req, res) => {
  try {
    const { richMenuId } = req.params;

    const richMenu = await getRichMenu(richMenuId);
    
    res.json({
      success: true,
      richMenu
    });

  } catch (error) {
    console.error('Error getting rich menu:', error);
    res.status(500).json({ 
      error: 'Failed to get rich menu',
      details: error.message 
    });
  }
};

/**
 * List all rich menus
 */
export const listRichMenusController = async (req, res) => {
  try {
    const richMenus = await listRichMenus();
    
    res.json({
      success: true,
      richMenus
    });

  } catch (error) {
    console.error('Error listing rich menus:', error);
    res.status(500).json({ 
      error: 'Failed to list rich menus',
      details: error.message 
    });
  }
};

/**
 * Delete rich menu
 */
export const deleteRichMenuController = async (req, res) => {
  try {
    const { richMenuId } = req.params;

    await deleteRichMenu(richMenuId);
    
    res.json({
      success: true,
      message: 'Rich menu deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting rich menu:', error);
    res.status(500).json({ 
      error: 'Failed to delete rich menu',
      details: error.message 
    });
  }
};

/**
 * Create default rich menus for TimeBank
 */
export const createDefaultRichMenusController = async (req, res) => {
  try {
    const result = await createDefaultRichMenus();
    
    res.status(201).json({
      success: true,
      message: 'Default rich menus created successfully',
      richMenus: result
    });

  } catch (error) {
    console.error('Error creating default rich menus:', error);
    res.status(500).json({ 
      error: 'Failed to create default rich menus',
      details: error.message 
    });
  }
};

/**
 * Switch user to matched menu
 */
export const switchToMatchedMenuController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { matchId } = req.body;

    const success = await switchToMatchedMenu(userId, matchId);
    
    res.json({
      success,
      message: success ? 'User switched to matched menu' : 'Failed to switch menu'
    });

  } catch (error) {
    console.error('Error switching to matched menu:', error);
    res.status(500).json({ 
      error: 'Failed to switch to matched menu',
      details: error.message 
    });
  }
};

/**
 * Switch user to main menu
 */
export const switchToMainMenuController = async (req, res) => {
  try {
    const { userId } = req.params;

    const success = await switchToMainMenu(userId);
    
    res.json({
      success,
      message: success ? 'User switched to main menu' : 'Failed to switch menu'
    });

  } catch (error) {
    console.error('Error switching to main menu:', error);
    res.status(500).json({ 
      error: 'Failed to switch to main menu',
      details: error.message 
    });
  }
};
