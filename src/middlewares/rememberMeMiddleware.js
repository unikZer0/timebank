import bcrypt from "bcrypt";
import { findUserByRememberToken } from "../db/queries/users.js";

export const rememberMeMiddleware = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.remember_token;
    if (!cookieToken) return next();

    const users = await findUserByRememberToken();
    
    for (const user of users) {
      if (cookieToken && user.remember_token) {
        const match = await bcrypt.compare(cookieToken, user.remember_token);
        
        if (match) {
          req.userId = user.id;
          req.userEmail = user.email;
          req.userRole = user.role;
          req.autoLogin = true;
          return next();
        }
      }
    }

    return next();
  } catch (err) {
    console.error("rememberMeMiddleware error:", err);
    next();
  }
};
