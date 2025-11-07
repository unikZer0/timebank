import { query } from '../db/prosgresql.js';
import { updateUserProfileSkills } from '../db/queries/users.js';

/**
 * Get user profile with stats
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    // Single query to get all user profile data
    const profileQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.dob,
        u.status,
        u.verified,
        u.created_at,
        u.line_user_id,
        COALESCE(user_skills_data.skills, '[]'::jsonb) AS skills,
        up.lat,
        up.lon,
        up.current_lat,
        up.current_lon,
        up.household,
        COALESCE(w.balance, 0) as time_credit,
        COALESCE(stats.hours_received, 0) as hours_received,
        COALESCE(stats.hours_given, 0) as hours_given,
        COALESCE(stats.people_helped, 0) as people_helped
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
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
      ) user_skills_data ON true
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT 
          to_user_id as user_id,
          SUM(CASE WHEN to_user_id = $1 THEN amount ELSE 0 END) as hours_received,
          SUM(CASE WHEN from_user_id = $1 THEN amount ELSE 0 END) as hours_given,
          COUNT(DISTINCT CASE WHEN to_user_id = $1 THEN from_user_id END) as people_helped
        FROM transactions 
        WHERE (from_user_id = $1 OR to_user_id = $1) AND type = 'job_completion'
        GROUP BY to_user_id
      ) stats ON u.id = stats.user_id
      WHERE u.id = $1
    `;
    
    const result = await query(profileQuery, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        status: user.status,
        verified: user.verified,
        created_at: user.created_at,
        line_user_id: user.line_user_id,
        avatarUrl: null,
        skills: user.skills || [],
        timeCredit: parseFloat(user.time_credit),
        stats: {
          hoursGiven: parseFloat(user.hours_given),
          hoursReceived: parseFloat(user.hours_received),
          peopleHelped: parseInt(user.people_helped),
          servicesCreated: 0
        },
        achievements: [],
        family: [],
        household: user.household || null,
        location: {
          lat: user.lat || null,
          lon: user.lon || null,
          currentLat: user.current_lat || null,
          currentLon: user.current_lon || null
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

/**
 * Update user profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { skills, phone } = req.body;

    let updatedSkills;

    if (skills !== undefined) {
      updatedSkills = await updateUserProfileSkills(userId, skills);
    }

    if (phone !== undefined) {
      const updateUserQuery = `
        UPDATE users 
        SET phone = $2
        WHERE id = $1
        RETURNING *
      `;
      await query(updateUserQuery, [userId, phone]);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...(updatedSkills !== undefined ? { skills: updatedSkills } : {}),
        ...(phone !== undefined ? { phone } : {})
      }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile'
    });
  }
};
