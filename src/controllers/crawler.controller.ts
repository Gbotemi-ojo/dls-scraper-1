import { Request, Response } from 'express';
import { CrawlerService } from '../services/crawler.service';

const crawlerService = new CrawlerService();

/**
 * Controller to handle HTTP requests and manage the continuous crawler.
 */
export class CrawlerController {
    
    constructor() {
        console.log('[CONTROLLER] CrawlerController initialized.');
        this.startContinuousCrawl();
    }

    private async startContinuousCrawl() {
        console.log('[CRAWLER_LOOP] Starting continuous crawl loop...');
        
        while (true) {
            try {
                const result = await crawlerService.runBatch();
                
                if (result.message === 'Queue is empty.') {
                    console.log('[CRAWLER_LOOP] Queue is empty. Pausing for 1 hour before checking again.');
                    await new Promise(resolve => setTimeout(resolve, 3600 * 1000));
                } else {
                    // Add a short delay between starting each scrape job to avoid overwhelming the scraper service.
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error) {
                console.error('[CRAWLER_LOOP] A critical error occurred in the crawl loop. Pausing before retry.', error);
                await new Promise(resolve => setTimeout(resolve, 300 * 1000));
            }
        }
    }

    public async startCrawler(req: Request, res: Response) {
        const { startId } = req.body;
        if (!startId) {
            return res.status(400).json({ error: 'startId is required in the request body.' });
        }
        try {
            const result = await crawlerService.start(startId);
            res.status(200).json(result);
        } catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to start crawler:', error);
            res.status(500).json({ error: 'Failed to initialize crawler.' });
        }
    }

    public async getCrawlerStatus(req: Request, res: Response) {
        try {
            const status = await crawlerService.getStatus();
            res.status(200).json(status);
        } catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to get status:', error);
            res.status(500).json({ error: 'Failed to retrieve crawler status.' });
        }
    }
    
    /**
     * --- NEW METHOD ---
     * Receives a chunk of data from the scraper service and passes it to the service for processing.
     */
    public async submitChunk(req: Request, res: Response) {
        try {
            const { playerName, playerId, opponents } = req.body;
            await crawlerService.processChunk({ playerName, playerId, opponents });
            res.status(200).json({ message: 'Chunk received and processed.' });
        } catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to process chunk:', error);
            res.status(500).json({ error: 'Failed to process chunk.' });
        }
    }

    public manualRun(req: Request, res: Response) {
        crawlerService.runBatch();
        res.status(202).json({ message: 'Manual crawl batch initiated. The continuous loop is already running in the background.' });
    }

    public async getAllPhoneNumbers(req: Request, res: Response) {
        try {
            const numbers = await crawlerService.getAllFoundPhoneNumbers();
            res.status(200).json(numbers);
        } catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to get all phone numbers:', error);
            res.status(500).json({ error: 'Failed to retrieve found phone numbers.' });
        }
    }
}

