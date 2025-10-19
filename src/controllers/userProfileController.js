import { findUserById, getUserProfileWithLocation } from '../db/queries/users.js';
import { query } from '../db/prosgresql.js';

/**
 * Get user profile with stats
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    // Get basic user info
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user profile data (skills, location, etc.)
    const profile = await getUserProfileWithLocation(userId);
    
    // Get user stats from transactions
    const statsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN to_user_id = $1 THEN amount ELSE 0 END), 0) as hours_received,
        COALESCE(SUM(CASE WHEN from_user_id = $1 THEN amount ELSE 0 END), 0) as hours_given,
        COUNT(DISTINCT CASE WHEN to_user_id = $1 THEN from_user_id END) as people_helped
      FROM transactions 
      WHERE (from_user_id = $1 OR to_user_id = $1) AND type = 'job_completion'
    `;
    
    const statsResult = await query(statsQuery, [userId]);
    const stats = statsResult.rows[0] || { hours_received: 0, hours_given: 0, people_helped: 0 };

    // Get wallet balance
    const walletQuery = `
      SELECT COALESCE(balance, 0) as balance 
      FROM wallets 
      WHERE user_id = $1
    `;
    
    const walletResult = await query(walletQuery, [userId]);
    const walletBalance = walletResult.rows[0]?.balance || 0;

    res.json({
      success: true,
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        nationalId: user.national_id,
        phone: user.phone,
        dob: user.dob,
        avatarUrl: null, // No avatar field in current schema
        bio: '', // No bio field in current schema
        skills: profile?.skills || [],
        timeCredit: walletBalance,
        stats: {
          hoursGiven: parseFloat(stats.hours_given),
          hoursReceived: parseFloat(stats.hours_received),
          peopleHelped: parseInt(stats.people_helped),
          servicesCreated: 0 // Not tracked in current schema
        },
        achievements: [], // Not implemented yet
        family: [], // Not implemented yet
        household: profile?.household || null,
        location: {
          lat: profile?.lat || null,
          lon: profile?.lon || null,
          currentLat: profile?.current_lat || null,
          currentLon: profile?.current_lon || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};
