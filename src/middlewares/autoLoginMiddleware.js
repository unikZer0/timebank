export const autoLoginMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const rememberToken = req.cookies.remember_token;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.userId = decoded.id;
          req.userEmail = decoded.email;
          req.userRole = decoded.role;
          req.autoLogin = true;
          return next();
        }
      } catch (jwtError) {
        console.log('JWT verification failed, trying remember token...');
      }
    }
    if (rememberToken) {
      const users = await findUserByRememberToken();
      
      for (const user of users) {
        if (rememberToken && user.remember_token) {
          const isValid = await bcrypt.compare(rememberToken, user.remember_token);
          if (isValid) {
            req.userId = user.id;
            req.userEmail = user.email;
            req.userRole = user.role;
            req.autoLogin = true;
            return next();
          }
        }
      }
    }

    return res.status(401).json({ message: "No valid remember me token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
