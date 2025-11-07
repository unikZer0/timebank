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

    // check if user has any active (accepted) job that is not completed
    const activeJobResult = await query(
        'SELECT id FROM job_applications WHERE user_id = $1 AND status = $2',
        [userId, 'accepted']
    );
    
    if (activeJobResult.rows.length > 0) {
        const err = new Error('You can only have one active job at a time. Please complete your current job before applying for new ones.');
        err.status = 400;
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
            ja.job_id,
            ja.user_id,
            ja.status,
            ja.applied_at,
            j.title,
            j.description,
            j.required_skills,
            j.location_lat,
            j.location_lon,
            j.time_balance_hours,
            j.start_time,
            j.end_time,
            j.broadcasted,
            j.created_at,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            u.email as creator_email,
            u.phone as creator_phone,
            COALESCE(user_skills_data.skills, '[]'::jsonb) AS skills,
            up.lat,
            up.lon,
            up.current_lat,
            up.current_lon
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN users u ON j.creator_user_id = u.id
        LEFT JOIN user_profiles up ON ja.user_id = up.user_id
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
        WHERE ja.user_id = $1
        ORDER BY ja.applied_at DESC`
    const jobapp= await query(sql,[userId]);
    return jobapp.rows; // Return all rows, not just the first one
};

// Get applications for a specific job (for job creator)
export const getJobApplicationsByJobIdQuery = async (jobId, creatorUserId) => {
    const sql = `
        SELECT 
            ja.id,
            ja.user_id,
            ja.status,
            ja.applied_at,
            u.first_name,
            u.last_name,
            u.email,
            COALESCE(user_skills_data.skills, '[]'::jsonb) AS skills,
            up.lat,
            up.lon,
            up.current_lat,
            up.current_lon
        FROM job_applications ja
        JOIN users u ON ja.user_id = u.id
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
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.job_id = $1 AND j.creator_user_id = $2
        ORDER BY ja.applied_at DESC
    `;
    const result = await query(sql, [jobId, creatorUserId]);
    return result.rows;
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
        
        // Get requester user ID for transaction record
        const requesterQuery = `
            SELECT j.creator_user_id
            FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE ja.id = $1
        `;
        const requesterResult = await query(requesterQuery, [applicationId]);
        const requesterUserId = requesterResult.rows[0]?.creator_user_id;
        
        // Create transfer record with requester as from_user_id
        await query(
            'INSERT INTO transactions (from_user_id, to_user_id, amount, type, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [requesterUserId, workerId, hours, 'job_completion']
        );
        
        // Send thank you message via LINE
        try {
            // Get job and worker data for thank you message
            const jobDataQuery = `
                SELECT j.title, j.time_balance_hours, j.description, 
                       requester.first_name as requester_first_name, 
                       requester.last_name as requester_last_name,
                       worker.line_user_id as worker_line_user_id
                FROM job_applications ja
                JOIN jobs j ON ja.job_id = j.id
                JOIN users requester ON j.creator_user_id = requester.id
                JOIN users worker ON ja.user_id = worker.id
                WHERE ja.id = $1
            `;
            const jobDataResult = await query(jobDataQuery, [applicationId]);
            
            if (jobDataResult.rows.length > 0) {
                const jobData = jobDataResult.rows[0];
                const requesterData = {
                    first_name: jobData.requester_first_name,
                    last_name: jobData.requester_last_name
                };
                
                // Send thank you message to the worker (person who completed the job)
                if (jobData.worker_line_user_id) {
                    const { sendJobCompletionThankYou } = await import('../../services/lineService.js');
                    await sendJobCompletionThankYou(jobData.worker_line_user_id, {
                        title: jobData.title,
                        time_balance_hours: jobData.time_balance_hours,
                        description: jobData.description
                    }, requesterData);
                    
                    console.log(`Thank you message sent to worker ${workerId} for job completion`);
                } else {
                    console.log(`Worker ${workerId} has no LINE user ID - thank you message not sent`);
                }
            }
        } catch (thankYouError) {
            console.error('Error sending thank you message:', thankYouError);
            // Don't fail the transfer if thank you message fails
        }
        
        // Queue notification for job completion reward
        try {
            const { notifyJobCompletionReward } = await import('../../queues/notificationQueue.js');
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

export const getAllJobAppsQuery = async () => {
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
        ORDER BY ja.applied_at DESC`
    const jobapp= await query(sql);
    return jobapp.rows;
};
