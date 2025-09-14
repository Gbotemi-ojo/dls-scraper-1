"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crawler_routes_1 = __importDefault(require("./crawler.routes"));
const router = (0, express_1.Router)();
router.get("/health", (req, res) => {
    res.json({ message: "Crawler API is healthy and running!" });
});
router.use('/crawler', crawler_routes_1.default);
exports.default = router;
