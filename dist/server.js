"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const socket_1 = require("./socket");
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
(0, socket_1.initSocket)(server);
(0, db_1.connectDB)()
    .then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error("DB connection failed:", err);
});
