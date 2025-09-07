"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerController = void 0;
const crawler_service_1 = require("../services/crawler.service");
const crawlerService = new crawler_service_1.CrawlerService();
class CrawlerController {
    constructor() {
        console.log('[CONTROLLER] CrawlerController initialized.');
        this.startContinuousCrawl();
    }
    async startContinuousCrawl() {
        console.log('[CRAWLER_LOOP] Starting continuous crawl loop...');
        while (true) {
            try {
                const result = await crawlerService.runBatch();
                if (result.message === 'Queue is empty.') {
                    console.log('[CRAWLER_LOOP] Queue is empty. Pausing for 1 hour before checking again.');
                    await new Promise(resolve => setTimeout(resolve, 3600 * 1000));
                }
                else {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            catch (error) {
                console.error('[CRAWLER_LOOP] A critical error occurred in the crawl loop. Pausing before retry.', error);
                await new Promise(resolve => setTimeout(resolve, 300 * 1000));
            }
        }
    }
    async startCrawler(req, res) {
        const { startId } = req.body;
        if (!startId) {
            return res.status(400).json({ error: 'startId is required in the request body.' });
        }
        try {
            const result = await crawlerService.start(startId);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to start crawler:', error);
            res.status(500).json({ error: 'Failed to initialize crawler.' });
        }
    }
    async getCrawlerStatus(req, res) {
        try {
            const status = await crawlerService.getStatus();
            res.status(200).json(status);
        }
        catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to get status:', error);
            res.status(500).json({ error: 'Failed to retrieve crawler status.' });
        }
    }
    async submitChunk(req, res) {
        try {
            const { playerName, playerId, opponents } = req.body;
            await crawlerService.processChunk({ playerName, playerId, opponents });
            res.status(200).json({ message: 'Chunk received and processed.' });
        }
        catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to process chunk:', error);
            res.status(500).json({ error: 'Failed to process chunk.' });
        }
    }
    manualRun(req, res) {
        crawlerService.runBatch();
        res.status(202).json({ message: 'Manual crawl batch initiated. The continuous loop is already running in the background.' });
    }
    async getAllPhoneNumbers(req, res) {
        try {
            const numbers = await crawlerService.getAllFoundPhoneNumbers();
            res.status(200).json(numbers);
        }
        catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to get all phone numbers:', error);
            res.status(500).json({ error: 'Failed to retrieve found phone numbers.' });
        }
    }
}
exports.CrawlerController = CrawlerController;
