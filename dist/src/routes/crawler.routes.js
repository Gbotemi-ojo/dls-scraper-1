"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crawler_controller_1 = require("../controllers/crawler.controller");
const crawlerController = new crawler_controller_1.CrawlerController();
const crawlerRouter = (0, express_1.Router)();
crawlerRouter.post('/start', (req, res, next) => {
    crawlerController.startCrawler(req, res).catch(next);
});
crawlerRouter.get('/status', (req, res, next) => {
    crawlerController.getCrawlerStatus(req, res).catch(next);
});
crawlerRouter.post('/submit-chunk', (req, res, next) => {
    crawlerController.submitChunk(req, res).catch(next);
});
crawlerRouter.get('/found-numbers', (req, res, next) => {
    crawlerController.getAllPhoneNumbers(req, res).catch(next);
});
crawlerRouter.post('/run-manual-batch', (req, res) => {
    crawlerController.manualRun(req, res);
});
exports.default = crawlerRouter;
