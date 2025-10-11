import {
    getUnverifiedUsersQuery,
    getUserDetailsQuery,
    verifyUserQuery,
    rejectUserQuery
} from "../db/queries_admin/verification.js";

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
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const rejectedUser = await rejectUserQuery(userId);
        
        if (!rejectedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found or already processed"
            });
        }

        res.status(200).json({
            success: true,
            message: "User rejected successfully",
            data: {
                id: rejectedUser.id,
                email: rejectedUser.email,
                status: rejectedUser.status
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
