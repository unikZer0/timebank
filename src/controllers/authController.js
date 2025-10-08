import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createUser, findUserByEmail,findUserNationalId,findUserPhone,createUserProfile, findUserByIdentifier, updateRememberToken, clearRememberToken, findUserByResetToken, updateResetToken, updatePassword } from "../db/queries/users.js";
import { sendMail } from "../utils/mailer.js";
import { log } from "console";
dotenv.config();

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email,phone,password, lat, lon, national_id ,skills,available_hours,embedding,dob} = req.body;
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
            available_hours,
            embedding

        });

    const token = jwt.sign({ 
      userId: user.id, 
      email: user.email, 
      role: user.role || 'user' 
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    console.log("token :" ,token);
    
    res.status(201).json({
      message:"register successfully", 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role || 'user' 
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
    const { identifier, password, remember } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Identifier and password required' });

    const user = await findUserByIdentifier(identifier);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

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
