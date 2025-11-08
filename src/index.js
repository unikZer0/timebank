import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/authRoutes.js'
import verificationRouter from './routes_admin/verificationRoutes.js'
import transferRouter from './routes/transferRoutes.js'
import transactionRouter from './routes/transactionRoutes.js'
import notificationRouter from './routes/notificationRoutes.js'
import userProfileRouter from './routes/userProfileRoutes.js'
import { rememberMeMiddleware } from "./middlewares/rememberMeMiddleware.js";
import jobAppRouter from './routes/job_appRoutes.js';
import jobRouter from './routes/jobRoutes.js';
import adminMatchRouter from './routes_admin/admin_matchRoutes.js';
import lineRouter from './routes/lineRoutes.js';
import richMenuRouter from './routes/richMenuRoutes.js';
import skillsRouter from './routes/skillsRoutes.js';
import adminNotificationRouter from './routes/adminNotificationRoutes.js';
import { handleLineWebhookEndpoint } from './controllers/lineWebhookController.js';
import { lineLoginCallback } from './controllers/authController.js';
dotenv.config();

const app = express();

// middleware
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:3002'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public rich menu creation endpoint (no auth required for testing)
app.post('/api/richmenu/create-default', async (req, res) => {
  try {
    const { clearAllRichMenus, createDefaultRichMenus } = await import('./src/services/richMenuService.js');
    
    console.log('🧹 Clearing all existing rich menus...');
    await clearAllRichMenus();
    
    console.log('🎯Creating fresh rich menu...');
    const result = await createDefaultRichMenus();
    
    res.status(201).json({
      success: true,
      message: 'Rich menus cleared and recreated successfully',
      richMenuId: result.richMenuId,
      note: 'Add this to your .env file: LINE_MATCHED_RICH_MENU_ID=' + result.richMenuId
    });

  } catch (error) {
    console.error('Error creating default rich menus:', error);
    res.status(500).json({ 
      error: 'Failed to create default rich menus',
      details: error.message 
    });
  }
});

//=======admin
app.use('/api/admin', verificationRouter);

// admin match routes
app.use('/api', adminMatchRouter);

//====================================================
app.use('/api/auth', authRouter);
//=======transfer routes
app.use('/api', transferRouter);

//transaction routes
app.use('/api', transactionRouter);

//job app routes
app.use('/api', jobAppRouter);

//job routes
app.use('/api', jobRouter);

//notification routes
app.use('/api/notifications', notificationRouter);
app.use('/api/notifications', adminNotificationRouter);

//user profile routes
app.use('/api', userProfileRouter);

//LINE webhook and job match routes
app.use('/api', lineRouter);

// LINE Login callback (no /api prefix for LINE platform)
app.get('/auth/line/callback', lineLoginCallback);

// Rich menu management routes
app.use('/api/richmenu', richMenuRouter);

// Skills routes
app.use('/api/skills', skillsRouter);

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
