"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerController = void 0;
const crawler_service_1 = require("../services/crawler.service");
const database_1 = require("../config/database");
const schema = __importStar(require("../../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const crawlerService = new crawler_service_1.CrawlerService();
const JOB_TIMEOUT = 15 * 60 * 1000;
class CrawlerController {
    constructor() {
        console.log('[CONTROLLER] CrawlerController initialized.');
        this.startContinuousCrawl();
    }
    async startContinuousCrawl() {
        console.log('[CRAWLER_LOOP] Starting continuous crawl loop...');
        let lastStuckPlayerId = '';
        while (true) {
            try {
                const result = await crawlerService.runBatch();
                if (result.message === 'Queue is empty.') {
                    console.log('[CRAWLER_LOOP] Queue is empty. Pausing for 1 hour.');
                    await new Promise(resolve => setTimeout(resolve, 3600 * 1000));
                }
                else if (result.message === 'Worker is busy.') {
                    if (crawlerService.jobStartTime) {
                        const elapsedTime = Date.now() - crawlerService.jobStartTime;
                        if (elapsedTime > JOB_TIMEOUT) {
                            crawlerService.forceUnlock();
                            const lastVisited = await database_1.db.query.players_visited.findFirst({ orderBy: (p, { desc }) => [desc(p.visitedAt)] });
                            if (lastVisited && lastVisited.id !== lastStuckPlayerId) {
                                console.log(`[TIMEOUT] Re-queuing player ${lastVisited.id} that likely failed mid-process.`);
                                await database_1.db.delete(schema.players_visited).where((0, drizzle_orm_1.eq)(schema.players_visited.id, lastVisited.id));
                                await crawlerService.start(lastVisited.id);
                                lastStuckPlayerId = lastVisited.id;
                            }
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            catch (error) {
                console.error('[CRAWLER_LOOP] A critical error occurred. Pausing before retry.', error);
                await new Promise(resolve => setTimeout(resolve, 300 * 1000));
            }
        }
    }
    async submitChunk(req, res) {
        const chunk = req.body;
        if (!chunk || !chunk.playerId) {
            return res.status(400).json({ error: 'Invalid chunk data received.' });
        }
        try {
            await crawlerService.processChunk(chunk);
            res.status(200).json({ message: 'Chunk received successfully.' });
        }
        catch (error) {
            console.error('[CONTROLLER-ERROR] Failed to process chunk:', error);
            res.status(500).json({ error: 'Failed to process chunk.' });
        }
    }
    async completeJob(req, res) {
        const { playerId } = req.body;
        if (!playerId) {
            return res.status(400).json({ error: 'playerId is required.' });
        }
        try {
            const result = await crawlerService.completeJob(playerId);
            res.status(200).json(result);
        }
        catch (error) {
            console.error(`[CONTROLLER-ERROR] Failed to complete job for ${playerId}:`, error);
            res.status(500).json({ error: 'Failed to complete job.' });
        }
    }
    async startCrawler(req, res) {
        const { startId } = req.body;
        if (!startId) {
            return res.status(400).json({ error: 'startId is required.' });
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
