import { handleLineWebhook, verifyLineSignature, logLineUserIds, sendLineMessage } from '../services/lineService.js';
import { query } from '../db/prosgresql.js';
import { switchToMainMenu } from '../services/richMenuService.js';

export const handleLineWebhookEndpoint = async (req, res) => {
  try {
    console.log('=== LINE Webhook Received ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    
    if (!verifyLineSignature(body, signature)) {
      console.error('Invalid LINE signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const events = req.body.events;
    
    if (!events || !Array.isArray(events)) {
      console.log('No events in webhook body');
      return res.status(200).json({ success: true, message: 'No events to process' });
    }
    logLineUserIds(events);
    
    for (const event of events) {
      console.log('Processing LINE event:', event.type, event);
    
      if (event.type === 'follow' && event.source?.userId) {
        const lineUserId = event.source.userId;
        console.log(' New follower LINE userId:', lineUserId);
        try {
          const existing = await query("SELECT id, email FROM users WHERE line_user_id=$1", [lineUserId]);
          if (existing.rows.length > 0) {
            console.log('Already linked user:', existing.rows[0].email);
            await sendLineMessage(lineUserId, " Welcome back! Your LINE account is already linked to your TimeBank profile.");
            continue;
          }

          // If not linked, send welcome message asking to link
          const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/link-line`;
          await sendLineMessage(lineUserId, ` Welcome to TimeBank!\n\nTo receive job notifications, please link your account:\n\n${linkUrl}\n\nOr send a message like: "link: your@email.com"`);
        } catch (error) {
          console.error('Error handling follow event:', error);
        }
      }

      // Handle message events for linking accounts
      if (event.type === 'message' && event.message?.text?.startsWith('link:')) {
        const email = event.message.text.split(':')[1]?.trim();
        const lineUserId = event.source.userId;

        if (!email) {
          await sendLineMessage(lineUserId, " Please provide a valid email. Format: link: your@email.com");
          continue;
        }

        try {
          const user = await query("SELECT id, email FROM users WHERE email=$1", [email]);
          if (user.rows.length === 0) {
            await sendLineMessage(lineUserId, " No user found with that email. Please register first at our website.");
          } else {
            // Check if email is already linked to another LINE account
            const existingLink = await query("SELECT line_user_id FROM users WHERE email=$1 AND line_user_id IS NOT NULL", [email]);
            if (existingLink.rows.length > 0 && existingLink.rows[0].line_user_id !== lineUserId) {
              await sendLineMessage(lineUserId, " This email is already linked to another LINE account.");
            } else {
              // Link the account
              await query("UPDATE users SET line_user_id=$1 WHERE email=$2", [lineUserId, email]);
              await sendLineMessage(lineUserId, " Your LINE account is now linked to your TimeBank profile! You'll receive job notifications here.");
            }
          }
        } catch (error) {
          console.error('Error handling link message:', error);
          await sendLineMessage(lineUserId, " An error occurred. Please try again later.");
        }
      }
      
      const result = await handleLineWebhook(event);
      
      if (result) {
        if (result.type === 'redirect') {
          // Handle redirect (rich menu click)
          return res.status(200).json({
            success: true,
            redirect: result.url
          });
        } else if (result.type === 'reply') {
          await sendReplyMessage(event.replyToken, result.message);
        }
      }
    }
    
    console.log('Webhook processed successfully');
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('Error handling LINE webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send reply message to LINE user
 * @param {string} replyToken - LINE reply token
 * @param {string} message - Message to send
 */
const sendReplyMessage = async (replyToken, message) => {
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return;
    }
    
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });
    
    if (response.ok) {
      console.log('Reply message sent successfully');
    } else {
      const error = await response.text();
      console.error('Failed to send reply message:', error);
    }
    
  } catch (error) {
    console.error('Error sending reply message:', error);
  }
};
