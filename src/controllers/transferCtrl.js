import {
    checkSameFamily,
    getWalletBalance,
    createTransfer,
    updateWalletBalance,
    getTransferHistory,
    getFamilyMembers
} from "../db/queries/transfer.js";

export const transferHours = async (req, res) => {
    try {
        const { toUserId, hours } = req.body;
        const fromUserId = req.userId;
        
        if (!toUserId || hours === undefined || hours === null) {
            return res.status(400).json({
                success: false,
                message: "Recipient user ID and hours are required"
            });
        }

        // Convert hours to number and validate
        const hoursToTransfer = parseFloat(hours);
        if (isNaN(hoursToTransfer) || hoursToTransfer <= 0) {
            return res.status(400).json({
                success: false,
                message: "Hours must be a positive number"
            });
        }

        if (fromUserId === toUserId) {
            return res.status(400).json({
                success: false,
                message: "Cannot transfer to yourself"
            });
        }

        const sameFamily = await checkSameFamily(fromUserId, toUserId);
        if (!sameFamily) {
            return res.status(403).json({
                success: false,
                message: "Transfers are only allowed between family members"
            });
        }

        const senderBalance = await getWalletBalance(fromUserId);
        if (senderBalance < hoursToTransfer) {
            return res.status(400).json({
                success: false,
                message: "Insufficient hours balance"
            });
        }
        
        const recipientBalance = await getWalletBalance(toUserId);

        const transaction = await createTransfer(fromUserId, toUserId, hoursToTransfer, 'transfer');

        // Update both wallets with proper numeric values
        const newSenderBalance = parseFloat(senderBalance) - hoursToTransfer;
        const newRecipientBalance = parseFloat(recipientBalance) + hoursToTransfer;

        await updateWalletBalance(fromUserId, newSenderBalance);
        await updateWalletBalance(toUserId, newRecipientBalance);

        res.status(200).json({
            success: true,
            message: "Hours transfer completed successfully",
            data: {
                transaction: {
                    id: transaction.id,
                    hours: transaction.amount,
                    type: transaction.type,
                    created_at: transaction.created_at
                },
                newBalance: newSenderBalance
            }
        });

    } catch (error) {
        console.error("Error in transfer:", error);
        res.status(500).json({
            success: false,
            message: "Transfer failed. Please try again."
        });
    }
};

export const getTransferHistoryCtrl = async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50, offset = 0 } = req.query;

        const history = await getTransferHistory(userId, parseInt(limit), parseInt(offset));

        res.status(200).json({
            success: true,
            data: history,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: history.length
            }
        });

    } catch (error) {
        console.error("Error fetching transfer history:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transfer history"
        });
    }
};

// Get family members
export const getFamilyMembersCtrl = async (req, res) => {
    try {
        const userId = req.userId;
        const familyMembers = await getFamilyMembers(userId);

        res.status(200).json({
            success: true,
            data: familyMembers,
            count: familyMembers.length
        });

    } catch (error) {
        console.error("Error fetching family members:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch family members"
        });
    }
};

// Get user's wallet balance (hours)
export const getWalletBalanceCtrl = async (req, res) => {
    try {
        const userId = req.userId;
        const balance = await getWalletBalance(userId);

        res.status(200).json({
            success: true,
            data: {
                user_id: userId,
                hours: balance
            }
        });

    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wallet balance"
        });
    }
};
