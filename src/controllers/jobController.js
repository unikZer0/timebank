import { 
    createJobQuery, 
    getJobsQuery, 
    getJobByIdQuery, 
    getJobsByUserQuery, 
    updateJobQuery, 
    deleteJobQuery, 
    broadcastJobQuery, 
} from '../db/queries/jobs.js';
import { getUserProfileWithLocation } from '../db/queries/users.js';

export const createJob = async (req, res) => {
    try {
        const userId = req.userId;
        const { title, description, required_skills, time_balance_hours } = req.body;
        if (!title || !description || !time_balance_hours) {
            return res.status(400).json({ 
                success: false, 
                error: 'Title, description, and time balance hours are required' 
            });
        }

        if (parseFloat(time_balance_hours) <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Time balance hours must be positive' 
            });
        }
        const userProfile = await getUserProfileWithLocation(userId);
        let finalLat, finalLon;
        
        if (location_lat && location_lon) {
            finalLat = parseFloat(location_lat);
            finalLon = parseFloat(location_lon);
        } else if (userProfile) {

            finalLat = userProfile.current_lat || userProfile.lat;
            finalLon = userProfile.current_lon || userProfile.lon;
        } else {
            finalLat = null;
            finalLon = null;
        }

        const jobData = {
            title,
            description,
            required_skills: required_skills || [],
            location_lat: finalLat,
            location_lon: finalLon,
            time_balance_hours: parseFloat(time_balance_hours),
            creator_user_id: userId
        };

        const newJob = await createJobQuery(jobData);

        res.status(201).json({
            success: true,
            job: newJob,
            message: 'Job created successfully'
        });

    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
};

export const getJobs = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const jobs = await getJobsQuery(parseInt(limit), parseInt(offset));

        res.json({
            success: true,
            jobs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: jobs.length
            }
        });

    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

export const getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await getJobByIdQuery(id);

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }

        res.json({
            success: true,
            job
        });

    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

export const getJobsByUser = async (req, res) => {
    try {
        const userId = req.userId;
        const jobs = await getJobsByUserQuery(userId);

        res.json({
            success: true,
            jobs
        });

    } catch (error) {
        console.error('Error fetching user jobs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

export const updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { title, description, required_skills, location_lat, location_lon, time_balance_hours } = req.body;

        // Get user's profile to access location data
        const userProfile = await getUserProfileWithLocation(userId);
        
        // Determine location to use: current location if available, otherwise profile location
        let finalLat, finalLon;
        
        if (location_lat && location_lon) {
            // Use provided location coordinates
            finalLat = parseFloat(location_lat);
            finalLon = parseFloat(location_lon);
        } else if (userProfile) {
            // Use current location if available, otherwise fall back to profile location
            finalLat = userProfile.current_lat || userProfile.lat;
            finalLon = userProfile.current_lon || userProfile.lon;
        } else {
            // No location data available
            finalLat = null;
            finalLon = null;
        }

        const updateData = {
            title,
            description,
            required_skills,
            location_lat: finalLat,
            location_lon: finalLon,
            time_balance_hours: time_balance_hours ? parseFloat(time_balance_hours) : null
        };

        const updatedJob = await updateJobQuery(id, userId, updateData);

        if (!updatedJob) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            job: updatedJob,
            message: 'Job updated successfully'
        });

    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

export const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const deletedJob = await deleteJobQuery(id, userId);

        if (!deletedJob) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};

export const broadcastJob = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const broadcastedJob = await broadcastJobQuery(id, userId);

        if (!broadcastedJob) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found or unauthorized' 
            });
        }

        res.json({
            success: true,
            job: broadcastedJob,
            message: 'Job broadcasted successfully'
        });

    } catch (error) {
        console.error('Error broadcasting job:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
};
