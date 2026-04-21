# 🌿 SatvikMeals WhatsApp Bot — Deployment Guide

## What changed from your original code

| Before | After |
|---|---|
| `qrcode-terminal` (ASCII QR in logs) | `qrcode` (PNG image served at `/`) |
| QR only visible in Render logs (not scannable) | QR visible as a real image in your browser |
| `--single-process` flag missing | Added (required for Render) |
| No `qrcode-terminal` removal | Removed that package |

---

## Step 1 — Install the new dependency

```bash
npm install qrcode
npm uninstall qrcode-terminal
```

---

## Step 2 — Set environment variables on Render

In your Render dashboard → your service → **Environment**, add:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `true` |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/google-chrome-stable` |
| `NODE_ENV` | `production` |

---

## Step 3 — Choose your Render environment

### Option A: Native Node (simplest)
Set environment to **Node** in Render. Render's native Node environment already has Chrome.
- Build command: `npm install`
- Start command: `node index.js`

### Option B: Docker (most reliable)
Set environment to **Docker**. Uses the included `Dockerfile` which installs Chrome explicitly.
This is the recommended option if Option A gives Chrome/Puppeteer errors.

---

## Step 4 — How to scan the QR code from your phone

Since you only have one phone (your business WhatsApp phone), here is the exact flow:

### If you have a second device (friend's phone / tablet):
1. Deploy to Render, wait ~2 min for build
2. Open `https://your-app.onrender.com` on the second device
3. You will see a QR image on the page
4. Open WhatsApp on **your business phone** → Linked Devices → Link a Device → scan the QR

### If you only have ONE phone (your business phone):
**This is the hard part** — WhatsApp requires scanning from the phone whose account you want to connect.

**Workaround — Use a laptop/computer screen (even borrowed):**
- Open `https://your-app.onrender.com` on any screen
- Scan using WhatsApp on your phone

**Workaround — Same phone trick:**
1. Open `https://your-app.onrender.com` in Chrome on your phone
2. Go to WhatsApp → Linked Devices → Link a Device
3. WhatsApp will open the camera — you need to **screenshot the QR**, then **zoom into** the screenshot
   - ⚠️ This rarely works because WhatsApp's scanner needs the live camera
4. **Best same-phone option**: Use a screen-mirroring app (scrcpy on PC, or AnyDesk) — but that needs a PC

**Real best option for your situation:**
- Use **Baileys** instead (see "Alternatives" section below) — it supports pairing by phone number, **no QR needed at all**.

---

## Step 5 — Session persistence (how it works)

Your setup with `RemoteAuth + wwebjs-mongo` is correct. Here's what happens:

1. First deploy → QR appears → you scan once
2. After scan, WhatsApp session is saved to MongoDB Atlas every 5 minutes
3. If Render restarts your service → it loads session from MongoDB → **no re-scan needed**
4. Session survives Render deploys, restarts, crashes

As long as your MongoDB Atlas cluster is running, you will never need to scan again (unless you manually log out from WhatsApp on your phone).

---

## Puppeteer config review

Your original config was **almost correct**. Here's what was missing:

```js
// ✅ These were already correct:
"--no-sandbox"
"--disable-setuid-sandbox"
"--disable-dev-shm-usage"
"--disable-gpu"

// ✅ These were ADDED (important for Render):
"--no-first-run"
"--no-zygote"
"--single-process"        // ← critical for low-memory cloud environments
"--disable-extensions"
"--disable-accelerated-2d-canvas"
```

The `--single-process` flag is what prevents crashes on Render's memory-limited containers.

---

## Alternative: Baileys (no QR needed — phone number pairing)

If the QR scanning continues to be a problem, consider migrating to **@whiskeysockets/baileys**.

Baileys supports **pairing by phone number** — you enter your number, WhatsApp sends you an 8-digit code via the app, you paste it. No camera needed.

```bash
npm install @whiskeysockets/baileys
```

Baileys is free, open source, and widely used in production bots.
Downside: different API, so your `messageHandler.js` will need updating.

---

## Production checklist

- [ ] MongoDB Atlas cluster is on M0 (free) or higher, not paused
- [ ] `PUPPETEER_EXECUTABLE_PATH` is set correctly on Render
- [ ] Using Render **Starter plan** ($7/mo) — free plan sleeps after 15 min inactivity which kills WhatsApp session
- [ ] `backupSyncIntervalMs: 300000` is set in RemoteAuth (saves every 5 min)
- [ ] Render service has at least 512MB RAM (Starter gives 512MB — sufficient)

---

## Monitoring your bot

- `https://your-app.onrender.com/` — QR page + status
- `https://your-app.onrender.com/health` — JSON health check
- `https://your-app.onrender.com/status` — bot status only
- `https://your-app.onrender.com/qr` — raw base64 QR JSON (for apps/scripts)
