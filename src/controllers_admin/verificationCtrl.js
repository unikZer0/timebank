import {
    getUnverifiedUsersQuery,
    getUserDetailsQuery,
    verifyUserQuery,
    rejectUserQuery
} from "../db/queries_admin/verification.js";
import { notifyUserVerification } from "../queues/notificationQueue.js";

export const getUnverifiedUsers = async (req, res) => {
    try {
        const users = await getUnverifiedUsersQuery();
        res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error("Error fetching unverified users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch unverified users"
        });
    }
};
export const getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const userDetails = await getUserDetailsQuery(userId);
        
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: userDetails
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user details"
        });
    }
};

export const verifyUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminName = req.userEmail || 'Administrator';
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const result = await verifyUserQuery(userId);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: "User not found or already processed"
            });
        }

        const { user, wallet } = result;
        try {
            await notifyUserVerification(userId, 'verified', adminName);
            console.log(`User verification notification queued for user ${userId}`);
        } catch (error) {
            console.error("Error queuing user verification notification:", error);
        }

        res.status(200).json({
            success: true,
            message: "User verified successfully and wallet created",
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    status: user.status
                },
                wallet: {
                    user_id: wallet.user_id,
                    balance: wallet.balance
                }
            }
        });
    } catch (error) {
        console.error("Error verifying user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify user"
        });
    }
};
export const rejectUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { rejectionReason } = req.body;
        const adminName = req.userEmail || 'Administrator';
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const rejectedUser = await rejectUserQuery(userId, rejectionReason);
        
        if (!rejectedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found or already processed"
            });
        }
        try {
            await notifyUserVerification(userId, 'rejected', adminName, rejectionReason);
            console.log(`User rejection notification queued for user ${userId}`);
        } catch (error) {
            console.error("Error queuing user rejection notification:", error);
        }

        res.status(200).json({
            success: true,
            message: "User rejected successfully",
            data: {
                id: rejectedUser.id,
                email: rejectedUser.email,
                status: rejectedUser.status,
                rejection_reason: rejectedUser.rejection_reason
            }
        });
    } catch (error) {
        console.error("Error rejecting user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject user"
        });
    }
};
