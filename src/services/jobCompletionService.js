import { switchToMainMenu } from '../services/richMenuService.js';
import { findUserById } from '../db/queries/users.js';

/**
 * Handle job completion/cancellation and switch user back to main menu
 * @param {number} userId - User ID
 * @param {string} action - 'completed' or 'cancelled'
 */
export const handleJobCompletion = async (userId, action) => {
  try {
    console.log(`Handling job ${action} for user ${userId}`);
    
    // Get user data to find LINE user ID
    const user = await findUserById(userId);
    
    if (!user || !user.line_user_id) {
      console.log(`User ${userId} not found or has no LINE user ID`);
      return false;
    }
    
    // Switch user back to main menu
    const menuSwitched = await switchToMainMenu(user.line_user_id);
    
    if (menuSwitched) {
      console.log(`User ${userId} switched back to main menu after job ${action}`);
      return true;
    } else {
      console.log(`Failed to switch user ${userId} back to main menu`);
      return false;
    }
    
  } catch (error) {
    console.error(`Error handling job ${action}:`, error);
    return false;
  }
};

/**
 * Handle job match cancellation and switch user back to main menu
 * @param {number} matchId - Admin match ID
 * @param {string} action - 'cancelled' or 'rejected'
 */
export const handleMatchCancellation = async (matchId, action) => {
  try {
    console.log(`Handling match ${action} for match ${matchId}`);
    
    // You would need to query the database to get the user_id from the match
    // This is a placeholder - implement based on your database schema
    const { query } = await import('../db/prosgresql.js');
    const matchResult = await query(
      'SELECT user_id FROM admin_matches WHERE id = $1', 
      [matchId]
    );
    
    if (matchResult.rows.length === 0) {
      console.log(`Match ${matchId} not found`);
      return false;
    }
    
    const userId = matchResult.rows[0].user_id;
    return await handleJobCompletion(userId, action);
    
  } catch (error) {
    console.error(`Error handling match ${action}:`, error);
    return false;
  }
};
