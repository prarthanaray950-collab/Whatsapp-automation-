require("dotenv").config();
const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("./db/mongoSessionStore");
const qrcode = require("qrcode");
const express = require("express");
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
    <style>
      body{font-family:sans-serif;text-align:center;padding:30px;background:#f0fdf4}
      h1{color:#16a34a}
      .status{font-size:1.2em;margin:12px 0}
      img{max-width:280px;border:2px solid #16a34a;border-radius:12px;margin-top:16px}
      .btn{display:inline-block;margin-top:16px;padding:10px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold}
    </style>
    <script>setTimeout(()=>{if("${botStatus}"!=="ready")location.reload();},6000);</script>
    </head><body>
    <h1>🌿 SatvikMeals Bot</h1>
    <p class="status">Status: <strong>${botStatus}</strong></p>
    ${botStatus === "qr_ready" && currentQR
      ? `<p>📱 Scan with WhatsApp:</p><img src="${currentQR}" alt="QR Code"/>`
      : botStatus === "ready"
      ? `<p style="color:#16a34a;font-size:1.3em">✅ Bot is LIVE!</p>`
      : `<p>⏳ Starting up... refreshing automatically.</p>`}
    <br><a class="btn" href="/health">Health Check</a>
    </body></html>
  `);
});

app.get("/health", (_, res) => res.json({ status: "ok", botStatus, time: new Date() }));
app.get("/qr", (_, res) => {
  if (!currentQR) return res.status(404).json({ error: "No QR yet." });
  res.json({ qr: currentQR, status: botStatus });
});
app.get("/status", (_, res) => res.json({ botStatus }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

let client;

const startBot = async () => {
  await connectDB();

  const store = new MongoStore();

  client = new Client({
    authStrategy: new RemoteAuth({
      store,
      backupSyncIntervalMs: 300_000, // save session to MongoDB every 5 min
    }),
    puppeteer: {
      headless: true,
      // Let Puppeteer use its own downloaded Chrome (set by `npx puppeteer browsers install chrome` in build)
      // Only override if PUPPETEER_EXECUTABLE_PATH is explicitly set and non-empty
      ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-accelerated-2d-canvas",
        "--disable-web-security",
      ],
    },
  });

  client.on("qr", async (qr) => {
    try {
      currentQR = await qrcode.toDataURL(qr, { width: 300, margin: 2 });
      botStatus = "qr_ready";
      console.log("[QR] ✅ QR ready! Open Render URL in browser and scan.");
    } catch (err) {
      console.error("[QR] Failed:", err.message);
    }
  });

  client.on("authenticated", () => {
    console.log("[WhatsApp] 🔐 Authenticated! Session saving to MongoDB...");
    botStatus = "authenticated";
    currentQR = null;
  });

  client.on("ready", () => {
    console.log("[WhatsApp] ✅ Bot is connected and ready!");
    botStatus = "ready";
    currentQR = null;
    adminNotifier.setClient(client);
    adminNotifier.notify("🤖 SatvikMeals Bot is ONLINE! 🌿\nSession MongoDB mein save hai — restart ke baad bhi chalega!");
  });

  client.on("auth_failure", (msg) => {
    console.error("[WhatsApp] ❌ Auth failed:", msg);
    botStatus = "disconnected";
  });

  client.on("disconnected", (reason) => {
    console.warn("[WhatsApp] ⚠️ Disconnected:", reason);
    botStatus = "disconnected";
    currentQR = null;
    console.log("[WhatsApp] Restarting in 15s...");
    setTimeout(() => startBot(), 15_000);
  });

  client.on("message", (msg) => handleMessage(msg, client));
  client.initialize();
};

startBot().catch((err) => {
  console.error("[Startup] Fatal error:", err);
  process.exit(1);
});
