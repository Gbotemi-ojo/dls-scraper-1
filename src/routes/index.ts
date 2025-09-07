import { Router } from 'express';
import crawlerRouter from './crawler.routes';

const router = Router();

// Health Check / Test Endpoint
router.get("/health", (req, res) => {
  res.json({ message: "Crawler API is healthy and running!" });
});

// Mount the crawler router under the /api/crawler path
router.use('/crawler', crawlerRouter);

// You can add other route groups here in the future
// For example: router.use('/stats', statsRoutes);

export default router;