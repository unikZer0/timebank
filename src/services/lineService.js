import dotenv from 'dotenv';
import crypto from 'crypto';
import { calculateDistance, formatDistance, getLocationDescription } from '../utils/locationUtils.js';
import { query } from '../db/prosgresql.js';
import { switchToAcceptJobMenu } from './richMenuService.js';
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// LINE API endpoints
const LINE_API_BASE = 'https://api.line.me/v2';
const LINE_MESSAGING_API = `${LINE_API_BASE}/bot/message`;

/**
 * Send LINE notification to user with location information
 * @param {string} userId - LINE user ID
 * @param {Object} jobData - Job information
 * @param {Object} matchData - Admin match data
 */
export const sendJobMatchNotification = async (userId, jobData, matchData) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return false;
    }

    // Validate user ID format
    console.log('Validating LINE user ID:', userId);
    console.log('User ID length:', userId.length);
    console.log('User ID type:', typeof userId);
    
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid user ID type or empty');
      return false;
    }

    // Get location information for both job poster and provider
    let locationInfo = '';
    try {
      // Get job poster's location
      const jobPosterQuery = `
        SELECT up.lat, up.lon, up.current_lat, up.current_lon, u.first_name, u.last_name
        FROM user_profiles up
        JOIN users u ON up.user_id = u.id
        WHERE u.id = $1
      `;
      const jobPosterResult = await query(jobPosterQuery, [jobData.creator_user_id]);
      
      // Get provider's location
      const providerQuery = `
        SELECT up.lat, up.lon, up.current_lat, up.current_lon, u.first_name, u.last_name
        FROM user_profiles up
        JOIN users u ON up.user_id = u.id
        WHERE u.id = $1
      `;
      const providerResult = await query(providerQuery, [matchData.provider_user_id]);
      
      if (jobPosterResult.rows.length > 0 && providerResult.rows.length > 0) {
        const jobPoster = jobPosterResult.rows[0];
        const provider = providerResult.rows[0];
        
        // Use current location if available, otherwise use profile location
        const jobPosterLat = jobPoster.current_lat || jobPoster.lat;
        const jobPosterLon = jobPoster.current_lon || jobPoster.lon;
        const providerLat = provider.current_lat || provider.lat;
        const providerLon = provider.current_lon || provider.lon;
        
        if (jobPosterLat && jobPosterLon && providerLat && providerLon) {
          const distance = calculateDistance(jobPosterLat, jobPosterLon, providerLat, providerLon);
          const distanceText = formatDistance(distance);
          const locationDesc = getLocationDescription(distance);
          
          locationInfo = `\n สถานที่: ${locationDesc} (ห่าง ${distanceText})\n งานโดย: ${jobPoster.first_name} ${jobPoster.last_name}`;
        }
      }
    } catch (locationError) {
      console.error('Error getting location information:', locationError);
      // Continue without location info
    }

    // Try to get user profile first to validate the user ID
    try {
      console.log(' Checking if user ID is valid by fetching profile...');
      const profileResponse = await fetch(`${LINE_MESSAGING_API}/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log(' User profile found:', profile);
      } else {
        const profileError = await profileResponse.text();
        console.error(' Cannot get user profile:', profileError);
        console.error('This means the user ID is invalid or user has not added your bot');
        console.error(' The user ID in your database might not match the actual LINE user ID');
        console.error(' Try sending a message to your bot and check the webhook logs for the real user ID');
        
        // Don't return false here, let's try to send the message anyway
        // Sometimes profile API fails but messaging API works
        console.log(' Proceeding with message sending despite profile check failure...');
      }
    } catch (profileError) {
      console.error('Error checking user profile:', profileError);
      console.log(' Proceeding with message sending despite profile check failure...');
    }

    // Format time range if available
    let timeInfo = '';
    if (jobData.start_time && jobData.end_time) {
      const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const minute = parseInt(minutes);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
      };
      
      const startTime = formatTime(jobData.start_time);
      const endTime = formatTime(jobData.end_time);
      timeInfo = `\n เวลา: ${startTime} - ${endTime}`;
    }

    // Create message with location information and map button
    const messageText = ` มีงานใหม่ที่ตรงกับคุณ!

 งาน: ${jobData.title}
 รางวัล: ${jobData.time_balance_hours} ชั่วโมง${timeInfo}${locationInfo}

 รายละเอียดงาน:
 ${jobData.description}

คลิกปุ่มด้านล่างเพื่อดูรายละเอียด!`;

    // Create messages array with text and location button
    const messages = [
      {
        type: 'text',
        text: messageText
      }
    ];

    // Add location button if job has location coordinates
    if (jobData.location_lat && jobData.location_lon) {
      const mapUrl = `https://www.google.com/maps?q=${jobData.location_lat},${jobData.location_lon}`;
      
      messages.push({
        type: 'template',
        altText: 'ดูตำแหน่งงานบนแผนที่',
        template: {
          type: 'buttons',
          text: '📍 ดูตำแหน่งงานบนแผนที่',
          actions: [
            {
              type: 'uri',
              label: '🗺️ เปิดแผนที่',
              uri: mapUrl
            }
          ]
        }
      });
    }

    const message = {
      to: [userId],
      messages: messages
    };

    console.log('Sending LINE message with location info to user:', userId);
    console.log('Message payload:', JSON.stringify(message, null, 2));
    console.log('Using LINE API endpoint:', `${LINE_MESSAGING_API}/multicast`);

    const response = await fetch(`${LINE_MESSAGING_API}/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      console.log(`LINE notification sent successfully to user ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.error('Failed to send LINE notification:', error);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      
      // Try to parse the error response for more details
      try {
        const errorData = JSON.parse(error);
        console.error('Parsed error data:', errorData);
        
        // Check if it's a specific user ID issue
        if (errorData.message && errorData.message.includes('to[0]')) {
          console.error(' LINE API Error: Invalid user ID format or user not found');
          console.error(' Possible solutions:');
          console.error('   1. User must add your LINE bot as a friend first');
          console.error('   2. User ID must be valid for your specific LINE bot');
          console.error('   3. Check LINE Developer Console for bot settings');
          console.error('   4. Verify the user ID is correct in your database');
        }
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      return false;
    }

  } catch (error) {
    console.error('Error sending LINE notification:', error);
    return false;
  }
};

/**
 * Send LINE notification to job poster when someone applies
 * @param {string} userId - LINE user ID of job poster
 * @param {Object} jobData - Job information
 * @param {Object} applicantData - Applicant information
 */
export const sendJobApplicationNotification = async (userId, jobData, applicantData) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return false;
    }

    if (!userId || typeof userId !== 'string') {
      console.error('Invalid user ID for LINE message');
      return false;
    }

    // Get location information
    let locationInfo = '';
    try {
      // Get job poster's location
      const jobPosterQuery = `
        SELECT up.lat, up.lon, up.current_lat, up.current_lon
        FROM user_profiles up
        WHERE up.user_id = $1
      `;
      const jobPosterResult = await query(jobPosterQuery, [jobData.creator_user_id]);
      
      // Get applicant's location
      const applicantQuery = `
        SELECT up.lat, up.lon, up.current_lat, up.current_lon
        FROM user_profiles up
        WHERE up.user_id = $1
      `;
      const applicantResult = await query(applicantQuery, [applicantData.id]);
      
      if (jobPosterResult.rows.length > 0 && applicantResult.rows.length > 0) {
        const jobPoster = jobPosterResult.rows[0];
        const applicant = applicantResult.rows[0];
        
        // Use current location if available, otherwise use profile location
        const jobPosterLat = jobPoster.current_lat || jobPoster.lat;
        const jobPosterLon = jobPoster.current_lon || jobPoster.lon;
        const applicantLat = applicant.current_lat || applicant.lat;
        const applicantLon = applicant.current_lon || applicant.lon;
        
        if (jobPosterLat && jobPosterLon && applicantLat && applicantLon) {
          const distance = calculateDistance(jobPosterLat, jobPosterLon, applicantLat, applicantLon);
          const distanceText = formatDistance(distance);
          const locationDesc = getLocationDescription(distance);
          
          locationInfo = `\n สถานที่: ${locationDesc} (ห่าง ${distanceText})`;
        }
      }
    } catch (locationError) {
      console.error('Error getting location information:', locationError);
    }

    const messageText = ` มีผู้สมัครงานใหม่!

 งาน: ${jobData.title}
 ผู้สมัคร: ${applicantData.first_name} ${applicantData.last_name}${locationInfo}

ตรวจสอบแดชบอร์ดเพื่อดูการสมัคร!`;

    // Create messages array with text and location button
    const messages = [
      {
        type: 'text',
        text: messageText
      }
    ];

    // Add location button if job has location coordinates
    if (jobData.location_lat && jobData.location_lon) {
      const mapUrl = `https://www.google.com/maps?q=${jobData.location_lat},${jobData.location_lon}`;
      
      messages.push({
        type: 'template',
        altText: 'ดูตำแหน่งงานบนแผนที่',
        template: {
          type: 'buttons',
          text: '📍 ดูตำแหน่งงานบนแผนที่',
          actions: [
            {
              type: 'uri',
              label: '🗺️ เปิดแผนที่',
              uri: mapUrl
            }
          ]
        }
      });
    }

    const payload = {
      to: userId,
      messages: messages
    };

    console.log('Sending job application notification to user:', userId);

    const response = await fetch(`${LINE_MESSAGING_API}/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`Job application notification sent successfully to user ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.error('Failed to send job application notification:', error);
      return false;
    }

  } catch (error) {
    console.error('Error sending job application notification:', error);
    return false;
  }
};

/**
 * Send simple text message to LINE user
 * @param {string} userId - LINE user ID
 * @param {string} message - Message text
 */
export const sendLineMessage = async (userId, message) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return false;
    }

    if (!userId || typeof userId !== 'string') {
      console.error('Invalid user ID for LINE message');
      return false;
    }

    const payload = {
      to: userId, // Use single user ID instead of array for push API
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    };

    console.log('Sending LINE message to user:', userId);
    console.log('Message:', message);

    const response = await fetch(`${LINE_MESSAGING_API}/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(` LINE message sent successfully to user ${userId}`);
      return true;
    } else {
      const error = await response.text();
      console.error(' Failed to send LINE message:', error);
      console.error('Response status:', response.status);
      
      // Try to parse error for better debugging
      try {
        const errorData = JSON.parse(error);
        console.error('Parsed error:', errorData);
      } catch (parseError) {
        console.error('Raw error response:', error);
      }
      
      return false;
    }

  } catch (error) {
    console.error('Error sending LINE message:', error);
    return false;
  }
};

/**
 * Generate a secure token for job match acceptance
 * @param {number} matchId - Admin match ID
 */
const generateMatchToken = (matchId) => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const timestamp = Date.now();
  const data = `${matchId}-${timestamp}`;
  
  return crypto.createHmac('sha256', secret)
    .update(data)
    .digest('hex')
    .substring(0, 16);
};

/**
 * Verify match token
 * @param {string} token - Token to verify
 * @param {number} matchId - Expected match ID
 */
export const verifyMatchToken = (token, matchId) => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  
  // Generate expected token (this is a simple implementation)
  // In production, you might want to store tokens in database with expiration
  const expectedToken = crypto.createHmac('sha256', secret)
    .update(`${matchId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 16);
  
  return token === expectedToken;
};

/**
 * Extract and log LINE user IDs from webhook events
 * This helps identify the real LINE user IDs
 * @param {Array} events - Array of LINE events
 */
export const logLineUserIds = (events) => {
  console.log(' LINE Webhook Events - User ID Analysis:');
  events.forEach((event, index) => {
    if (event.source && event.source.userId) {
      console.log(`Event ${index + 1}: User ID = "${event.source.userId}"`);
      console.log(`Event ${index + 1}: Type = ${event.type}`);
      if (event.message) {
        console.log(`Event ${index + 1}: Message = "${event.message.text || 'Non-text message'}"`);
      }
    } else {
      console.log(`Event ${index + 1}: No user ID found`);
    }
  });
};

/**
 * Get user's pending job applications (created by admin matches)
 * @param {string} lineUserId - LINE user ID
 * @returns {Array} - Array of pending job applications
 */
const getUserPendingApplications = async (lineUserId) => {
  try {
    const queryText = `
      SELECT ja.id, ja.job_id, j.title, j.creator_user_id, u.first_name, u.last_name, am.reason
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN users u ON j.creator_user_id = u.id
      JOIN users line_user ON ja.user_id = line_user.id
      LEFT JOIN admin_matches am ON ja.job_id = am.job_id AND ja.user_id = am.user_id
      WHERE line_user.line_user_id = $1 
      AND ja.status = 'applied'
      ORDER BY ja.applied_at DESC
      LIMIT 5
    `;
    
    const result = await query(queryText, [lineUserId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting user pending applications:', error);
    return [];
  }
};


/**
 * Accept a job application (change status to accepted)
 * @param {string} lineUserId - LINE user ID
 * @param {number} applicationId - Application ID to accept
 * @returns {Object} - Result of the operation
 */
const acceptJobApplication = async (lineUserId, applicationId) => {
  try {
    // First, verify the application belongs to this user
    const verifyQuery = `
      SELECT ja.id, ja.job_id, j.title, j.creator_user_id
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN users u ON ja.user_id = u.id
      WHERE ja.id = $1 AND u.line_user_id = $2
    `;
    
    const verifyResult = await query(verifyQuery, [applicationId, lineUserId]);
    
    if (verifyResult.rows.length === 0) {
      return { success: false, message: 'Application not found or not authorized' };
    }
    
    const application = verifyResult.rows[0];
    
    // Check if user already has an active (accepted) job
    const activeJobQuery = `
      SELECT ja.id, j.title
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN users u ON ja.user_id = u.id
      WHERE u.line_user_id = $1 AND ja.status = 'accepted'
    `;
    
    const activeJobResult = await query(activeJobQuery, [lineUserId]);
    
    if (activeJobResult.rows.length > 0) {
      return { 
        success: false, 
        message: `คุณมีงานที่กำลังทำอยู่แล้ว: "${activeJobResult.rows[0].title}". กรุณาทำงานให้เสร็จก่อนรับงานใหม่` 
      };
    }
    
    // Update the application status to accepted
    const updateQuery = `
      UPDATE job_applications 
      SET status = 'accepted' 
      WHERE id = $1
    `;
    
    await query(updateQuery, [applicationId]);
    
    // Switch user to accept job rich menu
    await switchToAcceptJobMenu(lineUserId);
    
    return { 
      success: true, 
      message: `Successfully accepted job: ${application.title}`,
      jobTitle: application.title
    };
    
  } catch (error) {
    console.error('Error accepting job application:', error);
    return { success: false, message: 'Failed to accept job application' };
  }
};


/**
 * Handle LINE webhook events
 * @param {Object} event - LINE webhook event
 */
export const handleLineWebhook = async (event) => {
  try {
    console.log('🔍 handleLineWebhook called with event type:', event.type);
    
    if (event.type === 'postback') {
      // Handle rich menu postback
      const data = event.postback.data;
      const userId = event.source.userId;
      console.log('🎯 RICH MENU POSTBACK PROCESSING:');
      console.log('  - Data:', data);
      console.log('  - User ID:', userId);
      console.log('  - Event:', JSON.stringify(event, null, 2));
      
      // Parse postback data (e.g., "action=accept_job&match_id=123")
      const params = new URLSearchParams(data);
      const action = params.get('action');
      const matchId = params.get('match_id');
      
      console.log('🔍 Parsed action:', action);
      console.log('🔍 Parsed matchId:', matchId);
      
      switch (action) {
        case 'confirm_job':
          console.log('✅ Processing confirm_job action');
          // Get user's pending applications
          const pendingApps = await getUserPendingApplications(userId);
          
          if (pendingApps.length === 0) {
            await sendLineMessage(userId, `❌ ไม่พบงานที่รอการยืนยัน

คุณยังไม่ได้สมัครงานหรืองานที่สมัครแล้วได้รับการยืนยันแล้ว

กรุณาไปที่: ${FRONTEND_URL}/jobs เพื่อหางานที่ต้องการ`);
            
            return {
              type: 'redirect',
              url: `${FRONTEND_URL}/jobs`
            };
          }
          
          // If only one pending application, accept it directly
          if (pendingApps.length === 1) {
            const result = await acceptJobApplication(userId, pendingApps[0].id);
            
            if (result.success) {
              await sendLineMessage(userId, `✅ ยืนยันการรับงาน "${result.jobTitle}" เรียบร้อยแล้ว!

คุณสามารถดูรายละเอียดงานได้ที่:
${FRONTEND_URL}/provider-jobs

ขอบคุณที่ใช้บริการ TimeBank!`);
              
              return {
                type: 'redirect',
                url: `${FRONTEND_URL}/provider-jobs`
              };
            } else {
              await sendLineMessage(userId, ` ${result.message}`);
              return {
                type: 'reply',
                message: 'เกิดข้อผิดพลาดในการยืนยันงาน'
              };
            }
          } else {
            // Multiple pending applications - show list
            let message = ` งานที่รอการยืนยัน (${pendingApps.length} งาน):\n\n`;
            pendingApps.forEach((app, index) => {
              message += `${index + 1}. ${app.title}\n   โดย: ${app.first_name} ${app.last_name}\n\n`;
            });
            message += `กรุณาไปที่: ${FRONTEND_URL}/provider-jobs เพื่อยืนยันงาน`;
            
            await sendLineMessage(userId, message);
            
            return {
              type: 'redirect',
              url: `${FRONTEND_URL}/provider-jobs`
            };
          }


        case 'accept_job':
          console.log('✅ Processing accept_job action');
          // Accept the first pending application and redirect to provider jobs
          const pendingApps2 = await getUserPendingApplications(userId);
          console.log('🔍 Found pending apps:', pendingApps2.length);
          
          if (pendingApps2.length === 0) {
            await sendLineMessage(userId, `ไม่พบงานที่รอการยืนยัน

กรุณาไปที่เว็บไซต์เพื่อดูงานของคุณ`);
            
            return {
              type: 'redirect',
              url: `${FRONTEND_URL}/provider-jobs`
            };
          }
          
          // Accept the first pending application
          const result = await acceptJobApplication(userId, pendingApps2[0].id);
          
          if (result.success) {
            await sendLineMessage(userId, `✅ รับงาน "${result.jobTitle}" เรียบร้อยแล้ว!

กำลังนำคุณไปยังเว็บไซต์...`);
            
            return {
              type: 'redirect',
              url: `${FRONTEND_URL}/provider-jobs`
            };
          } else {
            await sendLineMessage(userId, `❌ ${result.message}

กำลังนำคุณไปยังเว็บไซต์...`);
            
            return {
              type: 'redirect',
              url: `${FRONTEND_URL}/provider-jobs`
            };
          }

        default:
          console.log('❌ Unknown postback action:', action);
          console.log('❌ Full postback data:', data);
          console.log('❌ User ID:', userId);
          return {
            type: 'reply',
            message: 'การดำเนินการไม่รู้จัก กรุณาลองใหม่อีกครั้ง'
          };
      }
    }
    
    if (event.type === 'message' && event.message.type === 'text') {
      // Handle text messages
      const userMessage = event.message.text;
      const userId = event.source.userId;
      
      console.log(`LINE message from ${userId}: ${userMessage}`);
      
      // You can add more sophisticated message handling here
      return {
        type: 'reply',
        message: 'ขอบคุณสำหรับข้อความของคุณ! กรุณาใช้เมนูเพื่อโต้ตอบกับงานที่ตรงกัน'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error handling LINE webhook:', error);
    return null;
  }
};

/**
 * Handle LINE Login callback
 * @param {string} code - Authorization code from LINE
 * @param {string} state - State parameter (user email)
 * @returns {Object} - User profile data
 */
export const handleLineLoginCallback = async (code, state) => {
  try {
    const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
    const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

    console.log('LINE Login credentials check:', {
      channelId: LINE_LOGIN_CHANNEL_ID ? 'configured' : 'missing',
      channelSecret: LINE_LOGIN_CHANNEL_SECRET ? 'configured' : 'missing',
      backendUrl: BACKEND_URL
    });

    if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
      console.error('LINE Login credentials not configured:', {
        channelId: LINE_LOGIN_CHANNEL_ID,
        channelSecret: LINE_LOGIN_CHANNEL_SECRET ? 'set' : 'not set'
      });
      throw new Error('LINE Login credentials not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${BACKEND_URL}/auth/line/callback`,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user profile
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { 
        'Authorization': `Bearer ${access_token}` 
      }
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.text();
      throw new Error(`Profile fetch failed: ${error}`);
    }

    const profile = await profileResponse.json();
    
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      email: state // Email passed from frontend
    };

  } catch (error) {
    console.error('Error handling LINE login callback:', error);
    throw error;
  }
};

/**
 * Send thank you message to user who completed work
 * @param {string} userId - LINE user ID of the worker
 * @param {Object} jobData - Job information
 * @param {Object} requesterData - Job requester information
 */
export const sendJobCompletionThankYou = async (userId, jobData, requesterData) => {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return false;
    }

    if (!userId || typeof userId !== 'string') {
      console.error('Invalid user ID for LINE thank you message');
      return false;
    }

    // Create thank you message
    const messageText = `🎉 ขอบคุณสำหรับการทำงาน!

งาน: ${jobData.title}
รางวัล: ${jobData.time_balance_hours} ชั่วโมง
ผู้จ้าง: ${requesterData.first_name} ${requesterData.last_name}

คุณได้รับเครดิต ${jobData.time_balance_hours} ชั่วโมงเข้าบัญชีแล้ว! 

ขอบคุณที่ช่วยเหลือชุมชนของเรา `;

    const message = {
      to: [userId],
      messages: [
        {
          type: 'text',
          text: messageText
        }
      ]
    };

    console.log('Sending thank you message to user:', userId);
    console.log('Message payload:', JSON.stringify(message, null, 2));

    const response = await fetch(`${LINE_MESSAGING_API}/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Thank you message sent successfully:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Failed to send thank you message:', response.status, errorText);
      return false;
    }

  } catch (error) {
    console.error('Error sending thank you message:', error);
    return false;
  }
};

/**
 * Verify LINE webhook signature
 * @param {string} body - Request body
 * @param {string} signature - X-Line-Signature header
 */
export const verifyLineSignature = (body, signature) => {
  try {
    if (!LINE_CHANNEL_SECRET) {
      console.error('LINE_CHANNEL_SECRET not configured');
      return false;
    }

    console.log('Verifying LINE signature...');
    console.log('Body:', body);
    console.log('Signature:', signature);
    console.log('Channel Secret:', LINE_CHANNEL_SECRET ? 'Configured' : 'Not configured');

    const hash = crypto
      .createHmac('sha256', LINE_CHANNEL_SECRET)
      .update(body)
      .digest('base64');

    console.log('Calculated hash:', hash);
    console.log('Signature match:', hash === signature);

    return hash === signature;
  } catch (error) {
    console.error('Error verifying LINE signature:', error);
    return false;
  }
};
