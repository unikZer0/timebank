import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoutes.js'
import verificationRouter from './routes_admin/verificationRoutes.js'
import transferRouter from './routes/transferRoutes.js'
import notificationRouter from './routes/notificationRoutes.js'
import { rememberMeMiddleware } from "./middlewares/rememberMeMiddleware.js";
import jobAppRouter from './routes/job_appRoutes.js';
import jobRouter from './routes/jobRoutes.js';
import adminMatchRouter from './routes_admin/admin_matchRoutes.js';
import lineRouter from './routes/lineRoutes.js';
import richMenuRouter from './routes/richMenuRoutes.js';
import { handleLineWebhookEndpoint } from './controllers/lineWebhookController.js';
dotenv.config();

const app = express();

// middleware
app.use(cors({
  origin: [, 'http://localhost:3001'],
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


//=======admin
app.use('/api/admin', verificationRouter);

// admin match routes
app.use('/api', adminMatchRouter);

//====================================================
app.use('/api/auth', authRouter);
//=======transfer routes
app.use('/api', transferRouter);

//job app routes
app.use('/api', jobAppRouter);

//job routes
app.use('/api', jobRouter);

//notification routes
app.use('/api/notifications', notificationRouter);

//LINE webhook and job match routes
app.use('/api', lineRouter);

// Rich menu management routes
app.use('/api/richmenu', richMenuRouter);

// LINE webhook endpoint (no /api prefix for LINE platform)
app.post('/webhook/line', handleLineWebhookEndpoint);
app.get('/webhook/line', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'LINE webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  console.log("hii");
  res.send('TimeBank API is running')
});

// server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
