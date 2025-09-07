import axios from 'axios';
import { db } from '../config/database';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || 'https://render-puppeteer-kd37.onrender.com/scrape';
// This app's own URL, for the scraper to call back to.
// You must set this in your Render environment variables.
const MAIN_APP_CALLBACK_URL = process.env.MAIN_APP_CALLBACK_URL; 

interface Opponent {
    id: string;
    name: string;
}

interface ScrapeChunk {
    playerName: string;
    playerId: string;
    opponents: Opponent[];
}

export class CrawlerService {
    private isCrawling = false;

    /**
     * --- REFACTORED METHOD ---
     * This method now processes a single chunk of data sent from the scraper.
     */
    public async processChunk(chunk: ScrapeChunk) {
        const { playerName, playerId, opponents } = chunk;

        // 1. Check the main player's name for a phone number (only needs to be done once per player)
        if (playerName && /\+?\d[\d\s-]{8,}/.test(playerName)) {
            console.log(`[FOUND] Phone number for main player: ${playerName}`);
            await db.insert(schema.found_phone_numbers).values({ name: playerName, playerId: playerId }).onDuplicateKeyUpdate({ set: { name: playerName } });
        }

        if (!opponents || opponents.length === 0) {
            return;
        }

        console.log(`[SERVICE] Processing chunk of ${opponents.length} opponents for player ${playerId}.`);
        const newOpponentIdsToQueue = [];

        for (const opponent of opponents) {
            // 2. Check each opponent's name for a phone number
            if (/\+?\d[\d\s-]{8,}/.test(opponent.name)) {
                console.log(`[FOUND] Phone number for opponent: ${opponent.name}`);
                await db.insert(schema.found_phone_numbers).values({ name: opponent.name, playerId: opponent.id }).onDuplicateKeyUpdate({ set: { name: opponent.name } });
            }

            // 3. Check if the opponent needs to be added to the queue
            const visited = await db.query.players_visited.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            const inQueue = await db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            
            if (!visited && !inQueue) {
                newOpponentIdsToQueue.push({ id: opponent.id });
            }
        }

        if (newOpponentIdsToQueue.length > 0) {
            await db.insert(schema.players_to_visit).values(newOpponentIdsToQueue).onDuplicateKeyUpdate({ set: { id: sql`id` } });
            console.log(`[SERVICE] Added ${newOpponentIdsToQueue.length} new IDs to the queue.`);
        }
    }

    /**
     * --- REFACTORED METHOD ---
     * This now just takes one player, tells the scraper to start, and moves on.
     * It no longer waits for the full result.
     */
    public async runBatch() {
        if (!MAIN_APP_CALLBACK_URL) {
            console.error("[ERROR] MAIN_APP_CALLBACK_URL environment variable is not set. Scraper cannot send data back.");
            // Give the system a moment before the loop retries, in case the variable is being updated.
            await new Promise(resolve => setTimeout(resolve, 60000)); 
            throw new Error("Application is not configured correctly. MAIN_APP_CALLBACK_URL is missing.");
        }

        const playerToScrape = await db.query.players_to_visit.findFirst();

        if (!playerToScrape) {
            console.log('[SERVICE] Queue is empty. Nothing to crawl.');
            return { message: "Queue is empty." };
        }
        
        const playerID = playerToScrape.id;
        try {
            // 1. Tell the scraper to start its job, providing our callback URL.
            console.log(`[SERVICE] Dispatching job for player: ${playerID}`);
            // This is a "fire-and-forget" request. We only care that it was accepted.
            await axios.get(`${SCRAPER_API_URL}?playerId=${playerID}&callbackUrl=${MAIN_APP_CALLBACK_URL}/api/crawler/submit-chunk`, { timeout: 10000 });

            // 2. Immediately move the player from "to_visit" to "visited".
            // The scraper is now responsible for finding new players to add to the queue.
            await db.delete(schema.players_to_visit).where(eq(schema.players_to_visit.id, playerID));
            await db.insert(schema.players_visited).values({ id: playerID }).onDuplicateKeyUpdate({ set: { id: sql`id` } });
            console.log(`[SERVICE] Successfully dispatched job for player ${playerID} and marked as visited.`);

        } catch (error) {
            // If the scraper doesn't even accept the job, we log it and move the player to visited to avoid getting stuck.
            if (error instanceof Error) {
                console.error(`[ERROR] Failed to dispatch job for player ${playerID}. Moving to visited to avoid retries.`, error.message);
            } else {
                console.error(`[ERROR] Failed to dispatch job for player ${playerID}. Moving to visited to avoid retries.`, error);
            }
            await db.delete(schema.players_to_visit).where(eq(schema.players_to_visit.id, playerID));
            await db.insert(schema.players_visited).values({ id: playerID }).onDuplicateKeyUpdate({ set: { id: sql`id` } });
        }
        
        return { message: `Job for player ${playerID} dispatched.` };
    }

    public async start(startId: string) {
        if (!startId) return { message: "Error: A starting player ID is required." };
        const existing = await db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, startId) });
        if(existing) return { message: "Player ID already in queue." };
        await db.insert(schema.players_to_visit).values({ id: startId });
        return { message: `Crawler initialized. Player ${startId} added to the queue.` };
    }

    public async getStatus() {
        const queueCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.players_to_visit);
        const visitedCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.players_visited);
        const found = await db.select().from(schema.found_phone_numbers);
        return {
            isCrawling: this.isCrawling,
            queueSize: queueCountResult[0].count,
            visitedCount: visitedCountResult[0].count,
            foundCount: found.length,
            foundPhoneNumbers: found.map(p => p.name)
        };
    }

    public async getAllFoundPhoneNumbers() {
        const allFoundRecords = await db.select().from(schema.found_phone_numbers);
        const uniqueNames = new Set(allFoundRecords.map(record => record.name));
        const uniquePhoneNumbers = Array.from(uniqueNames);
        return {
            uniqueCount: uniquePhoneNumbers.length,
            uniquePhoneNumbers: uniquePhoneNumbers
        };
    }
}

