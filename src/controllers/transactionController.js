import { getUserTransactionsQuery, getUserTransactionCountQuery } from '../db/queries/transactions.js';

/**
 * Get transactions for the current user
 */
export const getUserTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50, offset = 0 } = req.query;

        const transactions = await getUserTransactionsQuery(userId, parseInt(limit), parseInt(offset));
        const totalCount = await getUserTransactionCountQuery(userId);

        res.json({
            success: true,
            transactions: transactions,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalCount
            }
        });
    } catch (error) {
        console.error('Error fetching user transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
