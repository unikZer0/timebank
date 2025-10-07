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
      // Verify hashed rememberToken against DB
      const user = await findUserByRememberToken(rememberToken);
      if (user) {
        req.userId = user.id;
        req.autoLogin = true;
        return next();
      }
    }

    return res.status(401).json({ message: "No valid remember me token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
