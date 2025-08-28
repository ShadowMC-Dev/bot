// ShadowSystem Backend (Node.js + Express + discord.js)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "shadowmcontop123";

let bots = {};
const dataFile = "bots.json";

// Load saved bots
if (fs.existsSync(dataFile)) {
  bots = JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

// Save bots to file
function saveBots() {
  fs.writeFileSync(dataFile, JSON.stringify(bots, null, 2));
}

// Middleware to check admin secret
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// API routes
app.get("/api/bots", checkAuth, (req, res) => {
  res.json(bots);
});

app.post("/api/bots/:id/register", checkAuth, (req, res) => {
  const { id } = req.params;
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing bot token" });

  bots[id] = { token, running: false };
  saveBots();
  res.json({ success: true, id });
});

app.post("/api/bots/:id/start", checkAuth, async (req, res) => {
  const { id } = req.params;
  const bot = bots[id];
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  if (bot.client) return res.json({ success: true, message: "Bot already running" });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.once("ready", () => {
    console.log(`${id} logged in as ${client.user.tag}`);
  });

  try {
    await client.login(bot.token);
    bot.client = client;
    bot.running = true;
    saveBots();
    res.json({ success: true, message: "Bot started" });
  } catch (err) {
    res.status(500).json({ error: "Failed to start bot", details: err.message });
  }
});

app.post("/api/bots/:id/stop", checkAuth, async (req, res) => {
  const { id } = req.params;
  const bot = bots[id];
  if (!bot || !bot.client) return res.status(404).json({ error: "Bot not running" });

  try {
    await bot.client.destroy();
    bot.client = null;
    bot.running = false;
    saveBots();
    res.json({ success: true, message: "Bot stopped" });
  } catch (err) {
    res.status(500).json({ error: "Failed to stop bot", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 ShadowSystem backend running on http://localhost:${PORT}`);
});
