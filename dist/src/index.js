"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const API_PREFIX = process.env.API_PREFIX || '/api';
const SCRAPER_HEALTH_URL = process.env.SCRAPER_HEALTH_URL || 'https://render-puppeteer-kd37.onrender.com/';
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use(API_PREFIX, routes_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
const PORT = process.env.PORT || 5000;
(0, database_1.testDatabaseConnection)()
    .then(() => {
    console.log("Database connection successful.");
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log("Crawler's internal processing loop has been started.");
        node_cron_1.default.schedule('*/10 * * * *', () => {
            console.log('[KEEP-ALIVE] Pinging scraper to prevent it from sleeping...');
            axios_1.default.get(SCRAPER_HEALTH_URL)
                .then(response => console.log(`[KEEP-ALIVE] Ping successful. Scraper status: ${response.status}`))
                .catch(error => console.error(`[KEEP-ALIVE] Ping failed: ${error.message}`));
        });
    });
})
    .catch(error => {
    console.error("FATAL: Database connection failed. Server will not start.", error);
    process.exit(1);
});
exports.default = app;
