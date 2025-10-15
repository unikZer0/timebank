import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// LINE API endpoints
const LINE_API_BASE = 'https://api.line.me/v2';
const LINE_MESSAGING_API = `${LINE_API_BASE}/bot/message`;

/**
 * Send LINE notification to user
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

    // First try a simple text message to test if the API works
    const simpleMessage = {
      to: [userId],
      messages: [
        {
          type: 'text',
          text: `New Job Match!\n\nJob: ${jobData.title}\nReward: ${jobData.time_balance_hours} hours\n\nClick the button below to view details!`
        }
      ]
    };

    console.log('Sending simple LINE message to user:', userId);
    console.log('Simple message payload:', JSON.stringify(simpleMessage, null, 2));
    console.log('Using LINE API endpoint:', `${LINE_MESSAGING_API}/multicast`);

    const response = await fetch(`${LINE_MESSAGING_API}/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(simpleMessage)
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
 * Handle LINE webhook events
 * @param {Object} event - LINE webhook event
 */
export const handleLineWebhook = async (event) => {
  try {
    if (event.type === 'postback') {
      // Handle rich menu postback
      const data = event.postback.data;
      const userId = event.source.userId;
      console.log('LINE postback received:', data, 'from user:', userId);
      
      // Parse postback data (e.g., "action=accept_job&match_id=123")
      const params = new URLSearchParams(data);
      const action = params.get('action');
      const matchId = params.get('match_id');
      
      switch (action) {
        case 'confirm_job':
          // For static menu, we'll redirect to a general confirm page
          // The match_id will be handled by the frontend based on user's active match
          return {
            type: 'redirect',
            url: `${FRONTEND_URL}/job-confirm`
          };
          
        default:
          console.log('Unknown postback action:', action);
          return {
            type: 'reply',
            message: 'Unknown action. Please try again.'
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
        message: 'Thank you for your message! Please use the rich menu to interact with job matches.'
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

    if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
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
