import axios from 'axios';
import { db } from '../config/database';
import * as schema from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

const SCRAPER_API_URL = 'https://render-puppeteer-kd37.onrender.com/scrape';
const MAIN_APP_CALLBACK_URL = 'https://tracker.swcdentalclinic.com.ng/api/crawler/submit-chunk';


interface Opponent {
    id: string;
    name: string;
}

interface ScrapeChunk {
    playerName?: string;
    playerId: string;
    opponents: Opponent[];
}

export class CrawlerService {
    private isWorkerBusy = false;
    public jobStartTime: number | null = null; // --- ADDED: Tracks when a job starts ---

    public async processChunk(chunk: ScrapeChunk) {
        // This method remains unchanged
        const { playerName, playerId, opponents } = chunk;
        if (playerName && /\+?\d[\d\s-]{8,}/.test(playerName)) {
            await db.insert(schema.found_phone_numbers).values({ name: playerName, playerId: playerId }).onDuplicateKeyUpdate({ set: { name: playerName } });
        }
        if (!opponents || opponents.length === 0) return;

        const newOpponentIdsToQueue = [];
        for (const opponent of opponents) {
            if (/\+?\d[\d\s-]{8,}/.test(opponent.name)) {
                await db.insert(schema.found_phone_numbers).values({ name: opponent.name, playerId: opponent.id }).onDuplicateKeyUpdate({ set: { name: opponent.name } });
            }
            const visited = await db.query.players_visited.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            const inQueue = await db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, opponent.id) });
            if (!visited && !inQueue) {
                newOpponentIdsToQueue.push({ id: opponent.id });
            }
        }
        if (newOpponentIdsToQueue.length > 0) {
            await db.insert(schema.players_to_visit).values(newOpponentIdsToQueue).onDuplicateKeyUpdate({ set: { id: sql`id` } });
        }
    }
    
    public async completeJob(playerId: string) {
        console.log(`[SERVICE] Job for player ${playerId} is complete. Unlocking worker.`);
        this.isWorkerBusy = false;
        this.jobStartTime = null; // --- ADDED: Reset timer on job completion ---
        return { message: `Job for ${playerId} marked as complete.` };
    }

    public async runBatch() {
        if (this.isWorkerBusy) {
            return { message: "Worker is busy." };
        }
        
        const playerToScrape = await db.query.players_to_visit.findFirst();

        if (!playerToScrape) {
            return { message: "Queue is empty." };
        }
        
        const playerID = playerToScrape.id;
        try {
            this.isWorkerBusy = true;
            this.jobStartTime = Date.now(); // --- ADDED: Set timestamp when job starts ---
            console.log(`[SERVICE] Worker locked. Dispatching job for player: ${playerID}`);
            
            await axios.get(`${SCRAPER_API_URL}?playerId=${playerID}&callbackUrl=${MAIN_APP_CALLBACK_URL}`, { timeout: 30000 });

            await db.delete(schema.players_to_visit).where(eq(schema.players_to_visit.id, playerID));
            await db.insert(schema.players_visited).values({ id: playerID }).onDuplicateKeyUpdate({ set: { id: sql`id` } });
            console.log(`[SERVICE] Successfully dispatched job for player ${playerID} and marked as visited.`);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ERROR] Failed to dispatch job for player ${playerID}. Scraper may be asleep. Error:`, errorMessage);
            this.isWorkerBusy = false; 
            this.jobStartTime = null; // --- ADDED: Reset timer on dispatch failure ---
        }
        
        return { message: `Job dispatch attempt for player ${playerID} finished.` };
    }

    // --- ADDED: New method to handle a timeout ---
    public forceUnlock() {
        console.warn(`[TIMEOUT] A job has timed out. Forcing worker unlock.`);
        this.isWorkerBusy = false;
        this.jobStartTime = null;
    }

    public async start(startId: string) {
        // This method remains unchanged
        if (!startId) return { message: "Error: A starting player ID is required." };
        const existing = await db.query.players_to_visit.findFirst({ where: (p, { eq }) => eq(p.id, startId) });
        if(existing) return { message: "Player ID already in queue." };
        await db.insert(schema.players_to_visit).values({ id: startId });
        return { message: `Crawler initialized. Player ${startId} added to the queue.` };
    }

    // --- ⬇️ MODIFIED METHOD ⬇️ ---
    public async getStatus() {
        const queueCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.players_to_visit);
        const visitedCountResult = await db.select({ count: sql<number>`count(*)` }).from(schema.players_visited);
        
        // Fetch all found phone number records once
        const allFoundRecords = await db.select().from(schema.found_phone_numbers);
        
        // Use a Set to efficiently get the count of unique names (phone numbers)
        const uniqueNames = new Set(allFoundRecords.map(record => record.name));
        
        return {
            isWorkerBusy: this.isWorkerBusy,
            queueSize: queueCountResult[0].count,
            visitedCount: visitedCountResult[0].count,
            found: {
                total: allFoundRecords.length,
                uniquePhoneNumbers: uniqueNames.size,
            },
        };
    }
    // --- ⬆️ MODIFIED METHOD ⬆️ ---

    public async getAllFoundPhoneNumbers() {
        // This method remains unchanged
        const allFoundRecords = await db.select().from(schema.found_phone_numbers);
        const uniqueNames = new Set(allFoundRecords.map(record => record.name));
        return {
            uniqueCount: uniqueNames.size,
            phoneNumbers: Array.from(uniqueNames)
        };
    }
}
