import { query } from "../prosgresql.js";
export const createJobAppQuery = async ({ jobId, userId
}) => {
    // check if user already applied
    const existing = await query(
        'SELECT id FROM job_applications WHERE job_id = $1 AND user_id = $2',
        [jobId, userId]
    );

    if (existing.rows.length > 0) {
        const err = new Error('You have already applied for this job');
        err.status = 400;
        throw err;
    }
    // check if user is verified
    const userResult = await query('SELECT verified FROM users WHERE id = $1', [userId]);
    const verified = userResult.rows[0]?.verified;
    if (!JSON.parse(verified.toString())) {
        const err = new Error('User must be verified to apply for jobs');
        err.status = 403;
        throw err;
    }

    // check if job exists
    const jobResult = await query('SELECT id, broadcasted FROM jobs WHERE id = $1', [jobId]);
    if (!jobResult.rows[0]) {
        const err = new Error('Job not found');
        err.status = 404;
        throw err;
    }

    // apply worker to job
    const insertResult = await query(
        'INSERT INTO job_applications (job_id, user_id) VALUES ($1, $2) RETURNING id',
        [jobId, userId]
    );

    return insertResult.rows[0];
}
export const getJobAppsByUserQuery = async (userId) => {
    const sql =` SELECT 
            ja.id,
            ja.status,
            ja.applied_at,
            j.id as job_id,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            CONCAT(u.first_name, ' ', u.last_name) as employer_name,
            u.email as employer_email,
            u.phone as employer_phone
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON j.creator_user_id = u.id
        WHERE ja.user_id = $1
        ORDER BY ja.applied_at DESC`
    const jobapp= await query(sql,[userId]);
    return jobapp.rows[0] || null;
};
export const updateJobAppStatusQuery = async (id, status, employerId) => {
    const sql = `SELECT ja.id, ja.user_id, j.time_balance_hours, j.creator_user_id
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.id = $1 AND j.creator_user_id = $2`;
    const result = await query(sql, [id, employerId]);
    if (result.rows.length === 0) {
        return false
    }
    
    const application = result.rows[0];
    console.log(application);
    
    
    const updateSql = `UPDATE job_applications SET status = $1 WHERE id = $2`;
    await query(updateSql, [status, id]);
    
    // If status is 'complete', transfer hours to worker's wallet
    if (status === 'complete') {
        await transferJobHoursToWallet(application.user_id, application.time_balance_hours, application.id);
    }
    
    return true;
};

// Helper function to transfer job hours to worker's wallet
const transferJobHoursToWallet = async (workerId, hours, applicationId) => {
    try {
        // Get worker's current balance
        const workerBalanceResult = await query('SELECT balance FROM wallets WHERE user_id = $1', [workerId]);
        const currentBalance = workerBalanceResult.rows[0]?.balance || 0;
        
        // Calculate new balance
        const newBalance = parseFloat(currentBalance) + parseFloat(hours);
        
        // Update worker's wallet
        await query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [newBalance, workerId]);
        
        // Create transfer record
        await query(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [null, workerId, hours, 'job_completion']
        );
        
        // Queue notification for job completion reward
        try {
            const { notifyJobCompletionReward } = await import('../queues/notificationQueue.js');
            await notifyJobCompletionReward(workerId, hours, `Job Application ${applicationId}`);
            console.log(`Job completion reward notification queued for worker ${workerId}`);
        } catch (notificationError) {
            console.error('Error queuing job completion notification:', notificationError);
            // Don't fail the transfer if notification queuing fails
        }
        
        console.log(`Transferred ${hours} hours to worker ${workerId} for job completion (Application ID: ${applicationId})`);
    } catch (error) {
        console.error('Error transferring job hours to wallet:', error);
        throw error;
    }
};
