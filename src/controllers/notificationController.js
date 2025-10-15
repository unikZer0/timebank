import {
  createNotification,
  getNotificationsByUserId,
  markNotificationAsRead,
  getUnreadNotificationCount,
  getAllAdmins
} from "../db/queries/notifications.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50 } = req.query;
    
    const notifications = await getNotificationsByUserId(userId, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await markNotificationAsRead(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    
    const count = await getUnreadNotificationCount(userId);
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count"
    });
  }
};

export const notifyAdminsNewUser = async (userData) => {
  try {
    const admins = await getAllAdmins();
    
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        type: 'new_user_registration',
        title: 'New User Registration',
        message: `A new user ${userData.first_name} ${userData.last_name} has registered and is pending verification.`,
        data: {
          user_id: userData.id,
          user_email: userData.email,
          user_name: `${userData.first_name} ${userData.last_name}`,
          registration_date: userData.created_at
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error notifying admins:", error);
    return false;
  }
};

export const notifyUserVerificationStatus = async (userId, status, adminName = 'Administrator', rejectionReason = null) => {
  try {
    let title, message;
    
    if (status === 'verified') {
      title = 'Account Verified';
      message = `Your account has been verified by ${adminName}. You can now access all features of the platform.`;
    } else if (status === 'rejected') {
      title = 'Account Verification Rejected';
      message = `Your account verification was rejected by ${adminName}.`;
      if (rejectionReason) {
        message += ` Reason: ${rejectionReason}`;
      }
      message += ' Please contact support for more information.';
    }
    
    await createNotification({
      user_id: userId,
      type: 'verification_status',
      title,
      message,
      data: {
        status,
        admin_name: adminName,
        rejection_reason: rejectionReason,
        processed_at: new Date().toISOString()
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error notifying user:", error);
    return false;
  }
};
