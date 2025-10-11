import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoutes.js'
import verificationRouter from './routes_admin/verificationRoutes.js'
import transferRouter from './routes/transferRoutes.js'
import { rememberMeMiddleware } from "./middlewares/rememberMeMiddleware.js";
import jobAppRouter from './routes/job_appRoutes.js';
import adminMatchRouter from './routes_admin/admin_matchRoutes.js';
dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(bodyParser.json());

app.use(rememberMeMiddleware);

//=======admin
app.use('/api/admin', verificationRouter);



//====================================================
app.use('/api/auth', authRouter);
//=======transfer routes
app.use('/api', transferRouter);

//job app routes
app.use('/api', jobAppRouter);
// admin match routes
app.use('/api', adminMatchRouter);


app.get('/', (req, res) => {
  console.log("hii");
  res.send('TimeBank API is running')
});

// server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
