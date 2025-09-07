import { serial, varchar, text, timestamp, mysqlTable } from 'drizzle-orm/mysql-core';

/**
 * The queue of player IDs that the crawler needs to process.
 * This is our "to-do" list.
 */
export const players_to_visit = mysqlTable("players_to_visit", {
    // The unique player ID from the website (e.g., 'sqjhh8hf').
    // This is the primary key to ensure no duplicates in the queue.
    id: varchar("id", { length: 16 }).primaryKey(),
    
    // Timestamp for when the player ID was added to the queue.
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * A log of all player IDs that have already been successfully scraped.
 * This is our "done" list, crucial for preventing the crawler from repeating work.
 */
export const players_visited = mysqlTable("players_visited", {
    // The unique player ID from the website.
    id: varchar("id", { length: 16 }).primaryKey(),
    
    // Timestamp for when the player was visited.
    visitedAt: timestamp("visited_at").defaultNow().notNull(),
});

/**
 * The final results table where we store player names that look like phone numbers.
 */
export const found_phone_numbers = mysqlTable("found_phone_numbers", {
    // A standard auto-incrementing ID for each record.
    id: serial("id").primaryKey(),
    
    // The full player name that matched our phone number pattern.
    name: text("name").notNull(),
    
    // The ID of the player profile where this name was found. Useful for reference.
    playerId: varchar("player_id", { length: 16 }),
    
    // Timestamp for when the phone number was discovered.
    foundAt: timestamp("found_at").defaultNow().notNull(),
});
