import { Router } from 'express';
import { CrawlerController } from '../controllers/crawler.controller';

const crawlerController = new CrawlerController();
const crawlerRouter = Router();

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

// --- NEW ROUTE ---
// The scraper will send chunks of data to this endpoint for processing.
// POST /api/crawler/submit-chunk
crawlerRouter.post('/submit-chunk', (req, res, next) => {
    crawlerController.submitChunk(req, res).catch(next);
});


// Route to get all found phone numbers.
// GET /api/crawler/found-numbers
crawlerRouter.get('/found-numbers', (req, res, next) => {
    crawlerController.getAllPhoneNumbers(req, res).catch(next);
});

// Route to manually trigger a single batch run for testing.
// POST /api/crawler/run-manual-batch
crawlerRouter.post('/run-manual-batch', (req, res) => {
    crawlerController.manualRun(req, res);
});

export default crawlerRouter;
