import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron'; // Import cron
import axios from 'axios';   // Import axios

import { testDatabaseConnection } from './config/database';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api';
const SCRAPER_HEALTH_URL = process.env.SCRAPER_HEALTH_URL || 'https://render-puppeteer-kd37.onrender.com/';

// --- Middleware ---
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

// --- API Routes ---
app.use(API_PREFIX, apiRoutes);

// --- Error Handler ---
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

testDatabaseConnection()
  .then(() => {
    console.log("Database connection successful.");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log("Crawler's internal processing loop has been started.");
      
      // --- ✅ KEEP-ALIVE PING ---
      // This simple job runs every 10 minutes to keep the Vercel/Render instance awake.
      cron.schedule('*/10 * * * *', () => {
        console.log('[KEEP-ALIVE] Pinging scraper to prevent it from sleeping...');
        axios.get(SCRAPER_HEALTH_URL)
          .then(response => console.log(`[KEEP-ALIVE] Ping successful. Scraper status: ${response.status}`))
          .catch(error => console.error(`[KEEP-ALIVE] Ping failed: ${error.message}`));
      });
    });
  })
  .catch(error => {
    console.error("FATAL: Database connection failed. Server will not start.", error);
    process.exit(1);
  });

export default app;
