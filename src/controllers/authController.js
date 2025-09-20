// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';
// import { createUser, findUserBEmail } from "../db/queries/users.js";
// y
// dotenv.config();

// const JWT_EXPIRES_IN = '7d';
// const SALT_ROUNDS = 10;

// export const register = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const existing = await findUserByEmail(email);
//     if (existing) {
//       return res.status(409).json({ message: 'Email already registered' });
//     }

//     const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
//     const user = await createUser({ email, passwordHash });

//     const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
//     return res.status(201).json({ user: { id: user.id, email: user.email }, token });
//   } catch (err) {
//     console.error('register error', err);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const user = await findUserByEmail(email);
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const isValid = await bcrypt.compare(password, user.password_hash);
//     if (!isValid) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
//     return res.status(200).json({ user: { id: user.id, email: user.email }, token });
//   } catch (err) {
//     console.error('login error', err);
//     return res.status(500).json({ message: 'Internal server error' });
//   }
// };
