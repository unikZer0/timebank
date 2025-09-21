import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { createUser, findUserByEmail,findUserNationalId,findUserPhone,createUserProfile } from "../db/queries/users.js";
dotenv.config();

const JWT_EXPIRES_IN = '7d';
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

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log("token :" ,token);
    
    res.status(201).json({message:"register successfully", user, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


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
