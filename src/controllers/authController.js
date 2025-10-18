import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createUser, findUserByEmail,findUserNationalId,findUserPhone,createUserProfile, findUserByIdentifier, updateRememberToken, clearRememberToken, findUserByResetToken, updateResetToken, updatePassword, updateUserCurrentLocation } from "../db/queries/users.js";
import { createWallet } from "../db/queries/wallets.js";
import { notifyAdminsNewUser } from "../queues/notificationQueue.js";
import { handleLineLoginCallback } from "../services/lineService.js";
import { query } from "../db/prosgresql.js";
import { log } from "console";
dotenv.config();

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email,phone,password, lat, lon, national_id ,skills,embedding,dob} = req.body;
//validate
      if (!email || !password || !first_name || !last_name || lat == null || lon == null || !national_id) {
      return res.status(400).json({ message: 'All fields including national_id and location are required' });
    }

    const existingNationalId = await findUserNationalId(national_id);
    if (existingNationalId) {
      return res.status(409).json({ message: 'User already registered and verified' });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const existingPhone = await findUserPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ message: 'Phone already registered' });
    }

    let apiUser;
        try {
        const apiRes = await fetch('https://pub-f1ab9efe03eb4ce7afd952fc03688236.r2.dev/mock_thai_citizens_with_criminal.json');
        const json = await apiRes.json();
        apiUser = json.data.find(u => u.national_id === national_id);
        } catch (err) {
        console.error('External API fetch failed', err);
        return res.status(502).json({ message: 'Failed to fetch external data' });
        }

    const household = apiUser.family_id;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const userResult= await createUser({first_name, last_name, email, passwordHash, national_id, phone,status: 'pending' ,dob});
    const user = userResult;
    console.log(user);
    
    await createUserProfile({
            user_id: user.id,
            lat,
            lon,
            household,
            skills,
            embedding

        });

    const token = jwt.sign({ 
      userId: user.id, 
      email: user.email, 
      role: user.role || 'user' 
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    console.log("token :" ,token);
    
    try {
      await notifyAdminsNewUser(user);
      console.log(`New user registration notification queued for user ${user.id}`);
    } catch (error) {
      console.error("Error queuing admin notifications:", error);
    }
    
    res.status(201).json({
      message:"Registration successful. Your account is pending verification. You will be notified once approved by an administrator.", 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role || 'user',
        status: user.status
      }, 
      token 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const login = async (req, res) => {
  try {
    const { identifier, password, remember, currentLat, currentLon } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Identifier and password required' });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'pending' || !user.verified) {
      return res.status(403).json({ 
        message: 'Account pending verification. Please wait for admin approval.' 
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Account verification was rejected. Please contact support.' 
      });
    }
    if (currentLat !== undefined && currentLon !== undefined) {
      try {
        await updateUserCurrentLocation(user.id, parseFloat(currentLat), parseFloat(currentLon));
        console.log(`Updated current location for user ${user.id}: ${currentLat}, ${currentLon}`);
      } catch (locationError) {
        console.error('Error updating current location:', locationError);
      }
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    if (remember) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hash = await bcrypt.hash(rawToken, 10);
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await updateRememberToken(user.id, hash, expires);

      res.cookie("remember_token", rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        expires,
      });
    }


    return res.status(200).json({
      user: { userId: user.id, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });

  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const refreshToken = (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Refresh token required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });

      const accessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
      );

      return res.status(200).json({ accessToken });
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const userId = req.userId;
    await clearRememberToken(userId);
    res.clearCookie("remember_token");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error('logout error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    console.log('forgotPassword - req.body:', req.body);
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await updateResetToken(user.id, resetToken, expires);
//reset password url
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

    await sendMail({
      to: email,
      subject: "Password Reset Request",
      template: "simpleReset",
      context: { 
        first_name: user.first_name || 'User',
        resetUrl,
        year: new Date().getFullYear(),
        plainText: `Hi ${user.first_name || 'User'}, reset your password: ${resetUrl}`
      }
    });

    console.log(`Reset token for ${email}: ${resetToken}`);
    
    res.status(200).json({ 
      message: 'If the email exists, a reset link has been sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });

  } catch (err) {
    console.error('forgotPassword error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await updatePassword(user.id, passwordHash);

    res.status(200).json({ message: 'Password reset successfully' });

  } catch (err) {
    console.error('resetPassword error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const autoLogin = async (req, res) => {
  try {
    if (req.autoLogin && req.userId) {
      const accessToken = jwt.sign(
        { id: req.userId, email: req.userEmail, role: req.userRole },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
      );

      const refreshToken = jwt.sign(
        { id: req.userId, email: req.userEmail, role: req.userRole },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'Strict', 
        maxAge: 7 * 24 * 60 * 60 * 1000, 
      });

      return res.status(200).json({
        user: { 
          userId: req.userId, 
          email: req.userEmail, 
          role: req.userRole 
        },
        accessToken,
        refreshToken,
        autoLogin: true
      });
    }

    return res.status(401).json({ message: 'No valid remember me token' });
  } catch (err) {
    console.error('autoLogin error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCurrentLocation = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentLat, currentLon } = req.body;

    if (currentLat === undefined || currentLon === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current latitude and longitude are required' 
      });
    }

    const updatedProfile = await updateUserCurrentLocation(userId, parseFloat(currentLat), parseFloat(currentLon));

    if (!updatedProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'User profile not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Current location updated successfully',
      data: {
        current_lat: updatedProfile.current_lat,
        current_lon: updatedProfile.current_lon,
        updated_at: updatedProfile.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating current location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Handle LINE Login callback
 * Links LINE account to existing user account
 */
export const lineLoginCallback = async (req, res) => {
  try {
    const { code, state } = req.query; // state = user email from frontend

    if (!code || !state) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing authorization code or state parameter' 
      });
    }

    console.log('LINE Login callback received:', { code: code.substring(0, 10) + '...', state });

    // Handle LINE login callback
    const lineProfile = await handleLineLoginCallback(code, state);
    
    if (!lineProfile || !lineProfile.userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to get LINE profile' 
      });
    }

    const { userId: lineUserId, email } = lineProfile;
    const user = await findUserByEmail(email);
    if (!user) {
      console.error('User not found for email:', email);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/link-line?error=user_not_found`);
    }
    const existingLink = await query("SELECT id, email FROM users WHERE line_user_id=$1 AND email!=$2", [lineUserId, email]);
    if (existingLink.rows.length > 0) {
      console.error('LINE account already linked to another user:', existingLink.rows[0].email);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/link-line?error=already_linked`);
    }
    await query("UPDATE users SET line_user_id=$1 WHERE email=$2", [lineUserId, email]);
    
    console.log(` LINE account linked successfully for user ${user.id} (${email})`);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/link-line?success=true`);

  } catch (error) {
    console.error('LINE login callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/link-line?error=server_error`);
  }
};
