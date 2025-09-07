"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.found_phone_numbers = exports.players_visited = exports.players_to_visit = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
exports.players_to_visit = (0, mysql_core_1.mysqlTable)("players_to_visit", {
    id: (0, mysql_core_1.varchar)("id", { length: 16 }).primaryKey(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.players_visited = (0, mysql_core_1.mysqlTable)("players_visited", {
    id: (0, mysql_core_1.varchar)("id", { length: 16 }).primaryKey(),
    visitedAt: (0, mysql_core_1.timestamp)("visited_at").defaultNow().notNull(),
});
exports.found_phone_numbers = (0, mysql_core_1.mysqlTable)("found_phone_numbers", {
    id: (0, mysql_core_1.serial)("id").primaryKey(),
    name: (0, mysql_core_1.text)("name").notNull(),
    playerId: (0, mysql_core_1.varchar)("player_id", { length: 16 }),
    foundAt: (0, mysql_core_1.timestamp)("found_at").defaultNow().notNull(),
});
