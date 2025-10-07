import bcrypt from "bcrypt";
import { findUserByRememberToken } from "../db/queries/users.js";

export const rememberMeMiddleware = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.remember_token;
    if (!cookieToken) return next();

    const user = await findUserByRememberToken(cookieToken);
    if (!user) return next();

    const notExpired = new Date(user.remember_token_expires) > new Date();
    const match = await bcrypt.compare(cookieToken, user.remember_token);

    if (match && notExpired) {
      req.userId = user.id;
      req.autoLogin = true;
    }

    return next();
  } catch (err) {
    console.error("rememberMeMiddleware error:", err);
    next();
  }
};
