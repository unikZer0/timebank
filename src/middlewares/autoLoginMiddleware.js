import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findUserByRememberToken } from '../db/queries/users.js';

export const autoLoginMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const rememberToken = req.cookies.remember_token;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      req.autoLogin = true;
      return next();
    }

    if (rememberToken) {
      const users = await findUserByRememberToken();
      for (const user of users) {
        const isValid = await bcrypt.compare(rememberToken, user.remember_token);
        if (isValid) {
          req.userId = user.id;
          req.autoLogin = true;
          return next();
        }
      }
    }

    return res.status(401).json({ message: "No valid remember me token" });
  } catch (err) {
    console.error('autoLoginMiddleware error:', err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
