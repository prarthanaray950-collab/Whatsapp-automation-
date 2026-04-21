# ── Dockerfile ────────────────────────────────────────────────────────────────
# Use this if Render's native Node environment doesn't have Chrome.
# In Render dashboard: set "Docker" as the environment instead of "Node".
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-slim

# Install Chrome (stable) + all required Puppeteer dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    --no-install-recommends \
  && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
     > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y \
    google-chrome-stable \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst \
    --no-install-recommends \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chrome, not download its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
