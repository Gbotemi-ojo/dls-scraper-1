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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerService = void 0;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const schema = __importStar(require("../../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'https://render-puppeteer-kd37.onrender.com/scrape';
const MAIN_APP_CALLBACK_URL = process.env.MAIN_APP_CALLBACK_URL;
class CrawlerService {
    constructor() {
        this.isCrawling = false;
    }
    async processChunk(chunk) {
        const { playerName, playerId, opponents } = chunk;
        if (playerName && /\+?\d[\d\s-]{8,}/.test(playerName)) {
            console.log(`[FOUND] Phone number for main player: ${playerName}`);
            await database_1.db.insert(schema.found_phone_numbers).values({ name: playerName, playerId: playerId }).onDuplicateKeyUpdate({ set: { name: playerName } });
        }
        if (!opponents || opponents.length === 0) {
            return;
        }
        console.log(`[SERVICE] Processing chunk of ${opponents.length} opponents for player ${playerId}.`);
        const newOpponentIdsToQueue = [];
        for (const opponent of opponents) {
            if (/\+?\d[\d\s-]{8,}/.test(opponent.name)) {
                console.log(`[FOUND] Phone number for opponent: ${opponent.name}`);
                await database_1.db.insert(schema.found_phone_numbers).values({ name: opponent.name, playerId: opponent.id }).onDuplicateKeyUpdate({ set: { name: opponent.name } });
            }
            const visited = await database_1.db.query.players_visited.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            const inQueue = await database_1.db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            if (!visited && !inQueue) {
                newOpponentIdsToQueue.push({ id: opponent.id });
            }
        }
        if (newOpponentIdsToQueue.length > 0) {
            await database_1.db.insert(schema.players_to_visit).values(newOpponentIdsToQueue).onDuplicateKeyUpdate({ set: { id: (0, drizzle_orm_1.sql) `id` } });
            console.log(`[SERVICE] Added ${newOpponentIdsToQueue.length} new IDs to the queue.`);
        }
    }
    async runBatch() {
        if (!MAIN_APP_CALLBACK_URL) {
            console.error("[ERROR] MAIN_APP_CALLBACK_URL environment variable is not set. Scraper cannot send data back.");
            await new Promise(resolve => setTimeout(resolve, 60000));
            throw new Error("Application is not configured correctly. MAIN_APP_CALLBACK_URL is missing.");
        }
        const playerToScrape = await database_1.db.query.players_to_visit.findFirst();
        if (!playerToScrape) {
            console.log('[SERVICE] Queue is empty. Nothing to crawl.');
            return { message: "Queue is empty." };
        }
        const playerID = playerToScrape.id;
        try {
            console.log(`[SERVICE] Dispatching job for player: ${playerID}`);
            await axios_1.default.get(`${SCRAPER_API_URL}?playerId=${playerID}&callbackUrl=${MAIN_APP_CALLBACK_URL}/api/crawler/submit-chunk`, { timeout: 10000 });
            await database_1.db.delete(schema.players_to_visit).where((0, drizzle_orm_1.eq)(schema.players_to_visit.id, playerID));
            await database_1.db.insert(schema.players_visited).values({ id: playerID }).onDuplicateKeyUpdate({ set: { id: (0, drizzle_orm_1.sql) `id` } });
            console.log(`[SERVICE] Successfully dispatched job for player ${playerID} and marked as visited.`);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(`[ERROR] Failed to dispatch job for player ${playerID}. Moving to visited to avoid retries.`, error.message);
            }
            else {
                console.error(`[ERROR] Failed to dispatch job for player ${playerID}. Moving to visited to avoid retries.`, error);
            }
            await database_1.db.delete(schema.players_to_visit).where((0, drizzle_orm_1.eq)(schema.players_to_visit.id, playerID));
            await database_1.db.insert(schema.players_visited).values({ id: playerID }).onDuplicateKeyUpdate({ set: { id: (0, drizzle_orm_1.sql) `id` } });
        }
        return { message: `Job for player ${playerID} dispatched.` };
    }
    async start(startId) {
        if (!startId)
            return { message: "Error: A starting player ID is required." };
        const existing = await database_1.db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, startId) });
        if (existing)
            return { message: "Player ID already in queue." };
        await database_1.db.insert(schema.players_to_visit).values({ id: startId });
        return { message: `Crawler initialized. Player ${startId} added to the queue.` };
    }
    async getStatus() {
        const queueCountResult = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema.players_to_visit);
        const visitedCountResult = await database_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema.players_visited);
        const found = await database_1.db.select().from(schema.found_phone_numbers);
        return {
            isCrawling: this.isCrawling,
            queueSize: queueCountResult[0].count,
            visitedCount: visitedCountResult[0].count,
            foundCount: found.length,
            foundPhoneNumbers: found.map(p => p.name)
        };
    }
    async getAllFoundPhoneNumbers() {
        const allFoundRecords = await database_1.db.select().from(schema.found_phone_numbers);
        const uniqueNames = new Set(allFoundRecords.map(record => record.name));
        const uniquePhoneNumbers = Array.from(uniqueNames);
        return {
            uniqueCount: uniquePhoneNumbers.length,
            uniquePhoneNumbers: uniquePhoneNumbers
        };
    }
}
exports.CrawlerService = CrawlerService;
