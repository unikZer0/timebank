import { getUsersWithLineId } from '../db/queries/users.js';
export const getUsersWithLineIdEndpoint = async (req, res) => {
  try {
    const users = await getUsersWithLineId();
    
    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        line_user_id: user.line_user_id
      }))
    });
    
  } catch (error) {
    console.error('Error getting users with LINE ID:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
