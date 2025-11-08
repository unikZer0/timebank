import { getAdminNotifications } from '../db/queries/notifications.js';

export const getAdminNotificationList = async (req, res) => {
  try {
    const notifications = await getAdminNotifications();
    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin notifications'
    });
  }
};