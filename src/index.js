import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoutes.js'
import verificationRouter from './routes_admin/verificationRoutes.js'
import { rememberMeMiddleware } from "./middlewares/rememberMeMiddleware.js";
import jobAppRouter from './routes/job_appRoutes.js';
dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(rememberMeMiddleware);

//=======admin
app.use('/api/admin', verificationRouter);


//====================================================
app.use('/api/auth', authRouter);

//job app routes
app.use('/api', jobAppRouter);

app.get('/', (req, res) => {
  console.log("hii");
  res.send('TimeBank API is running')
});

// server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
