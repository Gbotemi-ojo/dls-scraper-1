import { Router } from 'express';
import { CrawlerController } from '../controllers/crawler.controller';

const crawlerController = new CrawlerController();
const crawlerRouter = Router();

/**
 * Defines the API routes for the crawler.
 * All routes are prefixed with '/api/crawler' in the main server file.
 */

// Route for the scraper to submit a chunk of found data
// POST /api/crawler/submit-chunk
crawlerRouter.post('/submit-chunk', (req, res, next) => {
	crawlerController.submitChunk(req, res).catch(next);
});

// --- NEW ROUTE ---
// Route for the scraper to signal that a player's scrape is fully complete.
// This is crucial for unlocking the worker to start the next job.
// POST /api/crawler/complete-job
crawlerRouter.post('/complete-job', (req, res, next) => {
    crawlerController.completeJob(req, res).catch(next);
});

// Route to initialize the crawler with a starting player ID.
// POST /api/crawler/start
crawlerRouter.post('/start', (req, res, next) => {
	crawlerController.startCrawler(req, res).catch(next);
});

// Route to get the current status of the crawler.
// GET /api/crawler/status
crawlerRouter.get('/status', (req, res, next) => {
    crawlerController.getCrawlerStatus(req, res).catch(next);
});

// Route to get all found phone numbers.
// GET /api/crawler/found-numbers
crawlerRouter.get('/found-numbers', (req, res, next) => {
    crawlerController.getAllPhoneNumbers(req, res).catch(next);
});


export default crawlerRouter;

