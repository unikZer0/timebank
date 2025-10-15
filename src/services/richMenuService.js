import dotenv from 'dotenv';
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API_BASE = 'https://api.line.me/v2';

/**
 * Rich Menu Service for LINE Bot
 * Handles creation, linking, and management of rich menus
 */

/**
 * Create a rich menu
 * @param {Object} richMenuData - Rich menu configuration
 * @returns {Object} - Created rich menu with ID
 */
export const createRichMenu = async (richMenuData) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    console.log('Creating rich menu:', richMenuData.name);

    const response = await fetch(`${LINE_API_BASE}/bot/richmenu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(richMenuData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create rich menu: ${error}`);
    }

    const result = await response.json();
    console.log(' Rich menu created successfully:', result.richMenuId);
    return result;

  } catch (error) {
    console.error('Error creating rich menu:', error);
    throw error;
  }
};

/**
 * Upload rich menu image
 * @param {string} richMenuId - Rich menu ID
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} contentType - Image content type (image/jpeg, image/png)
 */
export const uploadRichMenuImage = async (richMenuId, imageBuffer, contentType) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    console.log('Uploading rich menu image for:', richMenuId);
    console.log('Image buffer size:', imageBuffer.length);
    console.log('Content type:', contentType);
    console.log('LINE API URL:', `${LINE_API_BASE}/bot/richmenu/${richMenuId}/content`);

    // First, verify the rich menu exists
    console.log('Verifying rich menu exists...');
    const verifyResponse = await fetch(`${LINE_API_BASE}/bot/richmenu/${richMenuId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!verifyResponse.ok) {
      const verifyError = await verifyResponse.text();
      console.error('Rich menu verification failed:', verifyError);
      throw new Error(`Rich menu ${richMenuId} does not exist: ${verifyError}`);
    }

    const richMenuData = await verifyResponse.json();
    console.log(' Rich menu verified:', richMenuData.name);

    // Now upload the image
    const response = await fetch(`${LINE_API_BASE}/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: imageBuffer
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.text();
      console.error('LINE API Error Response:', error);
      console.error('Response status:', response.status);
      throw new Error(`Failed to upload rich menu image: ${error}`);
    }

    console.log(' Rich menu image uploaded successfully');

  } catch (error) {
    console.error('Error uploading rich menu image:', error);
    throw error;
  }
};

/**
 * Link rich menu to user
 * @param {string} userId - LINE user ID
 * @param {string} richMenuId - Rich menu ID
 */
export const linkRichMenuToUser = async (userId, richMenuId) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    console.log(`Linking rich menu ${richMenuId} to user ${userId}`);

    const response = await fetch(`${LINE_API_BASE}/bot/user/${userId}/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to link rich menu: ${error}`);
    }

    console.log(' Rich menu linked successfully');

  } catch (error) {
    console.error('Error linking rich menu:', error);
    throw error;
  }
};

/**
 * Unlink rich menu from user
 * @param {string} userId - LINE user ID
 */
export const unlinkRichMenuFromUser = async (userId) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    console.log(`Unlinking rich menu from user ${userId}`);

    const response = await fetch(`${LINE_API_BASE}/bot/user/${userId}/richmenu`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to unlink rich menu: ${error}`);
    }

    console.log(' Rich menu unlinked successfully');

  } catch (error) {
    console.error('Error unlinking rich menu:', error);
    throw error;
  }
};

/**
 * Get rich menu by ID
 * @param {string} richMenuId - Rich menu ID
 * @returns {Object} - Rich menu data
 */
export const getRichMenu = async (richMenuId) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    const response = await fetch(`${LINE_API_BASE}/bot/richmenu/${richMenuId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get rich menu: ${error}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Error getting rich menu:', error);
    throw error;
  }
};

/**
 * List all rich menus
 * @returns {Array} - Array of rich menus
 */
export const listRichMenus = async () => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    const response = await fetch(`${LINE_API_BASE}/bot/richmenu/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list rich menus: ${error}`);
    }

    const result = await response.json();
    return result.richmenus || [];

  } catch (error) {
    console.error('Error listing rich menus:', error);
    throw error;
  }
};

/**
 * Delete rich menu
 * @param {string} richMenuId - Rich menu ID
 */
export const deleteRichMenu = async (richMenuId) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured');
    }

    console.log(`Deleting rich menu: ${richMenuId}`);

    const response = await fetch(`${LINE_API_BASE}/bot/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete rich menu: ${error}`);
    }

    console.log(' Rich menu deleted successfully');

  } catch (error) {
    console.error('Error deleting rich menu:', error);
    throw error;
  }
};

/**
 * Create a dynamic matched menu with specific match ID
 * @param {string} matchId - Match ID for job details
 * @returns {Object} - Created rich menu with ID
 */
export const createMatchedMenuWithMatchId = async (matchId) => {
  try {
    const matchedMenuData = {
      size: {
        width: 2500,
        height: 843
      },
      selected: false,
      name: `TimeBank Matched Menu - Match ${matchId}`,
      chatBarText: "Job Match Menu",
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 2500,
            height: 843
          },
          action: {
            type: "postback",
            data: `action=confirm_job&match_id=${matchId}`
          }
        }
      ]
    };

    const result = await createRichMenu(matchedMenuData);
    console.log(` Dynamic matched menu created for match ${matchId}:`, result.richMenuId);
    return result;

  } catch (error) {
    console.error('Error creating dynamic matched menu:', error);
    throw error;
  }
};

/**
 * Switch user to matched state rich menu
 * @param {string} userId - LINE user ID
 * @param {string} matchId - Match ID for job details
 */
export const switchToMatchedMenu = async (userId, matchId) => {
  try {
    const matchedMenuId = process.env.LINE_MATCHED_RICH_MENU_ID;
    
    if (!matchedMenuId) {
      console.warn('LINE_MATCHED_RICH_MENU_ID not configured, skipping rich menu switch');
      return false;
    }

    // First unlink any existing rich menu
    await unlinkRichMenuFromUser(userId);
    
    // Link the matched rich menu
    await linkRichMenuToUser(userId, matchedMenuId);
    
    console.log(` User ${userId} switched to matched rich menu for match ${matchId}`);
    return true;

  } catch (error) {
    console.error('Error switching to matched menu:', error);
    return false;
  }
};

/**
 * Switch user to main menu (unmatched state) - Just unlink rich menu
 * @param {string} userId - LINE user ID
 */
export const switchToMainMenu = async (userId) => {
  try {
    // Simply unlink any existing rich menu (no main menu needed)
    await unlinkRichMenuFromUser(userId);
    
    console.log(` User ${userId} switched to main state (no rich menu)`);
    return true;

  } catch (error) {
    console.error('Error switching to main menu:', error);
    return false;
  }
};

/**
 * Create default rich menus for TimeBank
 * This function creates the standard rich menus used by the app
 */
export const createDefaultRichMenus = async () => {
  try {
    console.log('Creating matched rich menu for TimeBank...');

    // Matched Menu (for users with active job matches) - Only Confirm Job
    const matchedMenuData = {
      size: {
        width: 2500,
        height: 843
      },
      selected: false,
      name: "TimeBank Matched Menu",
      chatBarText: "Job Match Menu",
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 2500,
            height: 843
          },
          action: {
            type: "postback",
            data: "action=confirm_job"
          }
        }
      ]
    };

    const matchedMenu = await createRichMenu(matchedMenuData);

    console.log(' Matched rich menu created successfully');
    console.log('Matched Menu ID:', matchedMenu.richMenuId);
    console.log('');
    console.log('Add this to your .env file:');
    console.log(`LINE_MATCHED_RICH_MENU_ID=${matchedMenu.richMenuId}`);

    return {
      matchedMenuId: matchedMenu.richMenuId
    };

  } catch (error) {
    console.error('Error creating matched rich menu:', error);
    throw error;
  }
};
