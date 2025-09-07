"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
require("dotenv/config");
exports.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_please_change_me_in_env';
