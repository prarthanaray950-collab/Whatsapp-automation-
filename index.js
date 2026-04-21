require("dotenv").config();
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const qrcode = require("qrcode");
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./db/connect");
const { handleMessage } = require("./bot/messageHandler");
const adminNotifier = require("./bot/adminNotifier");

const app = express();
app.use(express.json());

let currentQR = null;
let botStatus = "starting";

app.get("/", (_, res) => {
  res.send(`
    <!DOCTYPE html><html><head>
    <title>SatvikMeals Bot</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:sans-serif;text-align:center;padding:30px;background:#f9f9f9}h1{color:#2e7d32}.status{margin:10px 0;font-size:1.1em}img{max-width:300px;border:1px solid #ccc;border-radius:8px;margin-top:16px}.btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#2e7d32;color:#fff;border-radius:6px;text-decoration:none}</style>
    <script>setTimeout(()=>{const s="${botStatus}";if(s!=="ready"&&s!=="authenticated")location.reload();},8000);</script>
    </head><body>
    <h1>🌿 SatvikMeals Bot</h1>
    <p class="status">Status: <strong>${botStatus}</strong></p>
    ${botStatus==="qr_ready"&&currentQR?`<p>Scan this QR with WhatsApp:</p><img src="${currentQR}" alt="QR"/>`:botStatus==="ready"?`<p>✅ Bot is live!</p>`:`<p>⏳ Initialising...</p>`}
    <br><a class="btn" href="/health">Health Check</a>
    </body></html>
  `);
});

app.get("/health", (_, res) => res.json({ status: "ok", botStatus, time: new Date() }));
app.get("/qr", (req, res) => {
  if (!currentQR) return res.status(404).json({ error: "No QR available yet." });
  res.json({ qr: currentQR, status: botStatus });
});
app.get("/status", (_, res) => res.json({ botStatus }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

let client;

const startBot = async () => {
  await connectDB();
  const store = new MongoStore({ mongoose });

  client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300_000,
    }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
        "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process",
        "--disable-extensions", "--disable-accelerated-2d-canvas", "--disable-web-security",
      ],
    },
  });

  client.on("qr", async (qr) => {
    try {
      currentQR = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
      botStatus = "qr_ready";
      console.log("[QR] ✅ QR ready! Open your Render URL in a browser and scan.");
    } catch (err) {
      console.error("[QR] Failed to generate QR image:", err.message);
    }
  });

  client.on("authenticated", () => {
    console.log("[WhatsApp] 🔐 Authenticated!");
    botStatus = "authenticated";
    currentQR = null;
  });

  client.on("ready", () => {
    console.log("[WhatsApp] ✅ Bot is connected and ready!");
    botStatus = "ready";
    currentQR = null;
    // Wire admin notifier to the live client
    adminNotifier.setClient(client);
    // Send startup notification to admin
    adminNotifier.notify("🤖 SatvikMeals Bot is now ONLINE and ready! 🌿");
  });

  client.on("auth_failure", (msg) => {
    console.error("[WhatsApp] ❌ Authentication failed:", msg);
    botStatus = "disconnected";
  });

  client.on("disconnected", (reason) => {
    console.warn("[WhatsApp] ⚠️ Disconnected:", reason);
    botStatus = "disconnected";
    currentQR = null;
    console.log("[WhatsApp] Restarting in 15 seconds...");
    setTimeout(() => startBot(), 15_000);
  });

  client.on("message", (msg) => handleMessage(msg, client));
  client.initialize();
};

startBot().catch((err) => {
  console.error("[Startup] Fatal error:", err);
  process.exit(1);
});
